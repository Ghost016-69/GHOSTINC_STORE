"""
Views for the GHOSTINC store API.

Every view is public: this is a storefront, not an admin panel. Filtering,
searching and sorting all happen in the database so pagination stays correct.

The two endpoints that matter most are ``POST /api/cart/price/`` and
``POST /api/orders/``. Both price the cart with the same ``quote()`` helper, so
what the cart shows is exactly what the order is charged.
"""

from decimal import Decimal, InvalidOperation

from django.conf import settings
from django.db.models import F, Q
from rest_framework import generics, status
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Brand, Category, ContactMessage, Order, Product, PromoCode
from .pricing import as_json, quote
from .serializers import (
    BrandSerializer,
    CartInputSerializer,
    CategorySerializer,
    ContactMessageSerializer,
    OrderCreateSerializer,
    OrderSerializer,
    ProductDetailSerializer,
    ProductListSerializer,
    PromoCodeSerializer,
)

SORT_OPTIONS = {
    "featured": ["-is_featured", "-rating", "name"],
    "price_asc": ["price", "name"],
    "price_desc": ["-price", "name"],
    "rating": ["-rating", "-rating_count"],
    "newest": ["-created_at"],
    "name": ["name"],
}

TRUE_VALUES = {"1", "true", "yes", "on"}


class StorePagination(PageNumberPagination):
    page_size = 12
    page_size_query_param = "page_size"
    max_page_size = 48


def _csv_param(params, name):
    """Read a repeatable or comma separated query parameter."""
    values = []
    for raw in params.getlist(name):
        values.extend(part.strip() for part in raw.split(",") if part.strip())
    return values


def _decimal_param(params, name):
    raw = (params.get(name) or "").strip()
    if not raw:
        return None
    try:
        return Decimal(raw)
    except (InvalidOperation, ValueError):
        return None


class HealthView(APIView):
    """Lets the front end check whether the API is awake."""

    def get(self, request):
        return Response(
            {
                "status": "ok",
                "currency": settings.STORE_CURRENCY,
                "products": Product.objects.filter(is_active=True).count(),
                "demo_mode": settings.STORE_DEMO_MODE,
            }
        )


class CategoryListView(generics.ListAPIView):
    serializer_class = CategorySerializer
    pagination_class = None

    def get_queryset(self):
        return Category.objects.filter(is_active=True)


class BrandListView(generics.ListAPIView):
    serializer_class = BrandSerializer
    pagination_class = None

    def get_queryset(self):
        return Brand.objects.all()


class ProductListView(generics.ListAPIView):
    """The catalogue, with search, filters, sorting and pagination."""

    serializer_class = ProductListSerializer
    pagination_class = StorePagination

    def get_queryset(self):
        params = self.request.query_params
        queryset = Product.objects.select_related("brand", "category")

        if params.get("include_inactive") not in TRUE_VALUES:
            queryset = queryset.filter(is_active=True)

        search = (params.get("search") or "").strip()
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search)
                | Q(sku__icontains=search)
                | Q(short_description__icontains=search)
                | Q(description__icontains=search)
                | Q(brand__name__icontains=search)
                | Q(category__name__icontains=search)
            )

        categories = _csv_param(params, "category")
        if categories:
            queryset = queryset.filter(category__slug__in=categories)

        brands = _csv_param(params, "brand")
        if brands:
            queryset = queryset.filter(brand__slug__in=brands)

        min_price = _decimal_param(params, "min_price")
        if min_price is not None:
            queryset = queryset.filter(price__gte=min_price)

        max_price = _decimal_param(params, "max_price")
        if max_price is not None:
            queryset = queryset.filter(price__lte=max_price)

        if params.get("in_stock") in TRUE_VALUES:
            queryset = queryset.filter(stock__gt=0)

        if params.get("on_sale") in TRUE_VALUES:
            queryset = queryset.filter(
                compare_at_price__isnull=False, compare_at_price__gt=F("price")
            )

        ordering = SORT_OPTIONS.get(
            (params.get("sort") or "featured").strip(), SORT_OPTIONS["featured"]
        )
        return queryset.order_by(*ordering)


class ProductDetailView(generics.RetrieveAPIView):
    """One product by slug, including specs and four related items."""

    serializer_class = ProductDetailSerializer
    lookup_field = "slug"

    def get_queryset(self):
        return Product.objects.select_related("brand", "category").filter(
            is_active=True
        )


class CartPriceView(APIView):
    """Price a cart on the server.

    The front end keeps the cart contents in ``localStorage`` but never keeps
    its own prices: it posts the SKUs and quantities here and renders whatever
    comes back, so the totals can never drift from the database.
    """

    def post(self, request):
        serializer = CartInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payload = serializer.validated_data

        products = {
            product.sku: product
            for product in Product.objects.filter(
                sku__in=[item["sku"] for item in payload["items"]]
            )
        }

        lines = []
        unknown = []
        for item in payload["items"]:
            product = products.get(item["sku"])
            if product is None or not product.is_active:
                unknown.append(item["sku"])
                continue
            lines.append((product, item["quantity"]))

        code = (payload.get("promo_code") or "").strip().upper()
        promo, promo_error = None, ""
        if code:
            candidate = PromoCode.objects.filter(code=code).first()
            if candidate is not None and candidate.is_valid():
                promo = candidate
            else:
                promo_error = "That promo code is not valid."

        totals = as_json(quote(lines, promo))
        totals["unknown_skus"] = unknown
        totals["promo_error"] = promo_error
        return Response(totals)


class PromoValidateView(APIView):
    """Check a promo code on its own, before the visitor commits."""

    def post(self, request):
        code = (request.data.get("code") or "").strip().upper()
        if not code:
            return Response(
                {"valid": False, "detail": "Enter a promo code."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        promo = PromoCode.objects.filter(code=code).first()
        if promo is None or not promo.is_valid():
            return Response(
                {
                    "valid": False,
                    "code": code,
                    "detail": "That promo code is not valid.",
                }
            )

        return Response({"valid": True, **PromoCodeSerializer(promo).data})


class OrderCreateView(generics.CreateAPIView):
    """Checkout. Returns the stored order, ready to print as a receipt."""

    serializer_class = OrderCreateSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        order = serializer.save()
        return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)


class OrderDetailView(generics.RetrieveAPIView):
    """Look an order up by its reference, e.g. ``/api/orders/GH-4A7C21/``."""

    serializer_class = OrderSerializer
    lookup_field = "order_number"
    queryset = Order.objects.prefetch_related("items__product")


class ContactCreateView(generics.CreateAPIView):
    """Log a message from the contact page."""

    serializer_class = ContactMessageSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            {"detail": "Thanks - your message has been logged."},
            status=status.HTTP_201_CREATED,
        )