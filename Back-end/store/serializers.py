"""
Serializers for the GHOSTINC store API.

Money is serialised as a *string* (``"2499.00"``) rather than a float so no
cent is ever lost in transit; the front end converts with ``Number()`` and
formats with ``Intl.NumberFormat``. Ratings are numbers because the star
widget does arithmetic on them.
"""

from rest_framework import serializers

from .models import (
    Brand,
    Category,
    ContactMessage,
    Order,
    OrderItem,
    Product,
    PromoCode,
)
from .pricing import money, quote


class BrandSerializer(serializers.ModelSerializer):
    product_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Brand
        fields = ["id", "name", "slug", "blurb", "product_count"]


class CategorySerializer(serializers.ModelSerializer):
    product_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Category
        fields = [
            "id",
            "name",
            "slug",
            "description",
            "icon",
            "sort_order",
            "product_count",
        ]


class ProductListSerializer(serializers.ModelSerializer):
    """The shape used by every product card in the grid."""

    brand = serializers.CharField(source="brand.name", read_only=True)
    brand_slug = serializers.CharField(source="brand.slug", read_only=True)
    category = serializers.CharField(source="category.name", read_only=True)
    category_slug = serializers.CharField(source="category.slug", read_only=True)

    price = serializers.SerializerMethodField()
    compare_at_price = serializers.SerializerMethodField()
    rating = serializers.FloatField(read_only=True)

    is_on_sale = serializers.BooleanField(read_only=True)
    discount_percent = serializers.IntegerField(read_only=True)
    in_stock = serializers.BooleanField(read_only=True)
    low_stock = serializers.BooleanField(read_only=True)
    stock_label = serializers.CharField(read_only=True)
    badge = serializers.JSONField(read_only=True)

    class Meta:
        model = Product
        fields = [
            "id",
            "sku",
            "name",
            "slug",
            "brand",
            "brand_slug",
            "category",
            "category_slug",
            "price",
            "compare_at_price",
            "is_on_sale",
            "discount_percent",
            "short_description",
            "image",
            "stock",
            "in_stock",
            "low_stock",
            "stock_label",
            "badge",
            "rating",
            "rating_count",
            "condition",
            "is_featured",
        ]

    def get_price(self, obj):
        return str(money(obj.price))

    def get_compare_at_price(self, obj):
        if obj.compare_at_price is None:
            return None
        return str(money(obj.compare_at_price))


class ProductDetailSerializer(ProductListSerializer):
    """The product page: everything on the card plus copy, specs and siblings."""

    related = serializers.SerializerMethodField()

    class Meta(ProductListSerializer.Meta):
        fields = ProductListSerializer.Meta.fields + [
            "description",
            "specs",
            "created_at",
            "updated_at",
            "related",
        ]

    def get_related(self, obj):
        siblings = (
            Product.objects.filter(is_active=True, category=obj.category)
            .exclude(pk=obj.pk)
            .select_related("brand", "category")
            .order_by("-is_featured", "-rating")[:4]
        )
        return ProductListSerializer(siblings, many=True).data


class PromoCodeSerializer(serializers.ModelSerializer):
    class Meta:
        model = PromoCode
        fields = ["code", "percent_off", "description"]


class CartItemInputSerializer(serializers.Serializer):
    """One requested line: a SKU and how many of it."""

    sku = serializers.CharField(max_length=32)
    quantity = serializers.IntegerField(min_value=1, max_value=99)


class CartInputSerializer(serializers.Serializer):
    """The payload accepted by the cart pricing and order endpoints."""

    items = CartItemInputSerializer(many=True, allow_empty=True)
    promo_code = serializers.CharField(
        max_length=32, required=False, allow_blank=True, default=""
    )


class OrderItemSerializer(serializers.ModelSerializer):
    """A line on an order receipt."""

    unit_price = serializers.SerializerMethodField()
    line_total = serializers.SerializerMethodField()
    image = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = [
            "product_name",
            "product_sku",
            "product_slug",
            "image",
            "unit_price",
            "quantity",
            "line_total",
        ]

    def get_unit_price(self, obj):
        return str(money(obj.unit_price))

    def get_line_total(self, obj):
        return str(money(obj.line_total))

    def get_image(self, obj):
        return obj.product.image if obj.product else ""


class OrderSerializer(serializers.ModelSerializer):
    """The stored order, returned after checkout and by the lookup endpoint."""

    items = OrderItemSerializer(many=True, read_only=True)
    item_count = serializers.IntegerField(read_only=True)
    customer_name = serializers.CharField(read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    subtotal = serializers.SerializerMethodField()
    discount = serializers.SerializerMethodField()
    shipping = serializers.SerializerMethodField()
    vat = serializers.SerializerMethodField()
    total = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            "order_number",
            "status",
            "status_label",
            "created_at",
            "item_count",
            "customer_name",
            "first_name",
            "last_name",
            "email",
            "phone",
            "address_line1",
            "address_line2",
            "city",
            "province",
            "postal_code",
            "country",
            "notes",
            "subtotal",
            "discount",
            "shipping",
            "vat",
            "total",
            "promo_code",
            "items",
        ]

    def _money(self, value):
        return str(money(value))

    def get_subtotal(self, obj):
        return self._money(obj.subtotal)

    def get_discount(self, obj):
        return self._money(obj.discount)

    def get_shipping(self, obj):
        return self._money(obj.shipping)

    def get_vat(self, obj):
        return self._money(obj.vat)

    def get_total(self, obj):
        return self._money(obj.total)


class OrderCreateSerializer(CartInputSerializer):
    """Checkout: the customer's details plus the cart they are buying.

    The client's prices are never trusted. Every line is re-read from the
    database, re-priced, re-checked against stock and written inside a single
    transaction, so a stale or tampered cart can never buy at an old price.
    """

    first_name = serializers.CharField(max_length=80)
    last_name = serializers.CharField(max_length=80)
    email = serializers.EmailField()
    phone = serializers.CharField(
        max_length=32, required=False, allow_blank=True, default=""
    )

    address_line1 = serializers.CharField(max_length=160)
    address_line2 = serializers.CharField(
        max_length=160, required=False, allow_blank=True, default=""
    )
    city = serializers.CharField(max_length=80)
    province = serializers.CharField(
        max_length=80, required=False, allow_blank=True, default=""
    )
    postal_code = serializers.CharField(max_length=16)
    country = serializers.CharField(max_length=80, required=False, default="South Africa")
    notes = serializers.CharField(required=False, allow_blank=True, default="")

    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError("Your cart is empty.")
        return value

    def create(self, validated_data):
        from django.db import transaction

        from .models import Order, OrderItem, Product

        items = validated_data.pop("items")
        promo_code = (validated_data.pop("promo_code", "") or "").strip().upper()

        # Combine duplicate SKUs into one line each.
        requested = {}
        for entry in items:
            requested[entry["sku"]] = requested.get(entry["sku"], 0) + entry["quantity"]

        with transaction.atomic():
            products = {
                product.sku: product
                for product in Product.objects.select_for_update()
                .select_related("brand", "category")
                .filter(sku__in=list(requested.keys()))
            }

            unknown = [sku for sku in requested if sku not in products]
            if unknown:
                raise serializers.ValidationError(
                    {"items": [f"Unknown product: {sku}." for sku in unknown]}
                )

            promo = None
            if promo_code:
                candidate = PromoCode.objects.filter(code=promo_code).first()
                if candidate is None or not candidate.is_valid():
                    raise serializers.ValidationError(
                        {"promo_code": "That promo code is not valid."}
                    )
                promo = candidate

            lines = [(products[sku], qty) for sku, qty in requested.items()]
            totals = quote(lines, promo)

            problems = [
                f"{row['name']}: only {row['stock']} left, you asked for "
                f"{row['quantity']}."
                for row in totals["rows"]
                if not row["available"]
            ]
            if problems:
                raise serializers.ValidationError({"items": problems})

            order = Order.objects.create(
                subtotal=totals["subtotal"],
                discount=totals["discount"],
                shipping=totals["shipping"],
                vat=totals["vat"],
                total=totals["total"],
                promo_code=promo_code,
                **validated_data,
            )

            for product, quantity in lines:
                OrderItem.objects.create(
                    order=order,
                    product=product,
                    product_name=product.name,
                    product_sku=product.sku,
                    product_slug=product.slug,
                    unit_price=product.price,
                    quantity=quantity,
                )
                product.stock = max(product.stock - quantity, 0)
                product.save(update_fields=["stock", "updated_at"])

        return order


class ContactMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactMessage
        fields = ["id", "name", "email", "subject", "message", "created_at"]
        read_only_fields = ["id", "created_at"]