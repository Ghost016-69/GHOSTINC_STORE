"""
Database models for the GHOSTINC store.

The catalogue is deliberately small and readable: a product belongs to one
category and one brand, carries a JSON ``specs`` blob for the detail page's
specification table, and holds its stock level so orders can decrement it.

Two things worth noting:

* ``Product.image`` is *not* a Django ``ImageField``. The front end is served
  from its own static folder, so the model stores a path relative to the
  ``Front-end`` directory (``Images/products/phones/ghost-x1-pro.svg``) and the
  browser resolves it against whichever host serves the pages. That keeps the
  two servers properly decoupled.
* ``OrderItem`` copies the product's name, SKU and price at the time of
  purchase, so a later price change never rewrites order history.
"""

from decimal import Decimal

from django.db import models
from django.utils.text import slugify


class TimeStampedModel(models.Model):
    """Adds ``created_at`` / ``updated_at`` to a model."""

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class Category(TimeStampedModel):
    """A top-level aisle, e.g. Phones or Audio."""

    name = models.CharField(max_length=80, unique=True)
    slug = models.SlugField(max_length=90, unique=True, blank=True)
    description = models.CharField(max_length=240, blank=True)
    icon = models.CharField(
        max_length=16,
        blank=True,
        help_text="A single emoji used as a lightweight category icon.",
    )
    sort_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["sort_order", "name"]
        verbose_name_plural = "categories"

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    @property
    def product_count(self):
        return self.products.filter(is_active=True).count()
class Brand(TimeStampedModel):
    """A manufacturer badge, e.g. Ghost Labs or Novacore."""

    name = models.CharField(max_length=80, unique=True)
    slug = models.SlugField(max_length=90, unique=True, blank=True)
    blurb = models.CharField(max_length=200, blank=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    @property
    def product_count(self):
        return self.products.filter(is_active=True).count()
class Product(TimeStampedModel):
    """A single item for sale."""

    CONDITION_CHOICES = [
        ("new", "New"),
        ("refurbished", "Refurbished"),
        ("open-box", "Open box"),
    ]

    sku = models.CharField(max_length=32, unique=True)
    name = models.CharField(max_length=160)
    slug = models.SlugField(max_length=180, unique=True, blank=True)
    brand = models.ForeignKey(
        Brand, on_delete=models.PROTECT, related_name="products"
    )
    category = models.ForeignKey(
        Category, on_delete=models.PROTECT, related_name="products"
    )

    price = models.DecimalField(max_digits=10, decimal_places=2)
    compare_at_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Original price, shown struck through when on sale.",
    )

    short_description = models.CharField(max_length=240, blank=True)
    description = models.TextField(blank=True)
    specs = models.JSONField(
        default=dict,
        blank=True,
        help_text='Ordered spec rows, e.g. {"Display": "6.7 inch OLED"}.',
    )

    image = models.CharField(
        max_length=200,
        blank=True,
        help_text="Path relative to the Front-end folder, e.g. "
        "Images/products/phones/ghost-x1-pro.svg",
    )

    stock = models.PositiveIntegerField(default=0)
    low_stock_threshold = models.PositiveIntegerField(default=5)

    rating = models.DecimalField(
        max_digits=3, decimal_places=2, default=Decimal("4.50")
    )
    rating_count = models.PositiveIntegerField(default=0)

    condition = models.CharField(
        max_length=16, choices=CONDITION_CHOICES, default="new"
    )
    is_featured = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["-is_featured", "name"]
        indexes = [
            models.Index(fields=["slug"]),
            models.Index(fields=["is_active", "category"]),
        ]

    def __str__(self):
        return f"{self.name} ({self.sku})"

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(self.name)
            candidate, suffix = base, 1
            while Product.objects.filter(slug=candidate).exclude(pk=self.pk).exists():
                suffix += 1
                candidate = f"{base}-{suffix}"
            self.slug = candidate
        super().save(*args, **kwargs)

    @property
    def is_on_sale(self):
        return bool(self.compare_at_price and self.compare_at_price > self.price)

    @property
    def discount_percent(self):
        """Whole-number percentage off, or 0 when not on sale."""
        if not self.is_on_sale:
            return 0
        saving = self.compare_at_price - self.price
        percent = (saving / self.compare_at_price) * Decimal("100")
        return int(percent.to_integral_value())

    @property
    def in_stock(self):
        return self.is_active and self.stock > 0

    @property
    def low_stock(self):
        return self.is_active and 0 < self.stock <= self.low_stock_threshold

    @property
    def stock_label(self):
        if not self.is_active:
            return "Unavailable"
        if self.stock == 0:
            return "Out of stock"
        if self.low_stock:
            return f"Only {self.stock} left"
        return "In stock"

    @property
    def badge(self):
        """The little flash shown on a product card, or None."""
        if not self.is_active:
            return None
        if self.stock == 0:
            return {"label": "Sold out", "tone": "muted"}
        if self.is_on_sale:
            return {"label": f"-{self.discount_percent}%", "tone": "sale"}
        if self.low_stock:
            return {"label": "Low stock", "tone": "warn"}
        if self.is_featured:
            return {"label": "Featured", "tone": "accent"}
        return {"label": "New", "tone": "new"}


class PromoCode(TimeStampedModel):
    """A percentage-off code entered in the cart."""

    code = models.CharField(max_length=32, unique=True)
    percent_off = models.PositiveIntegerField(
        default=10, help_text="Whole percentage, 1-90."
    )
    description = models.CharField(max_length=160, blank=True)
    active = models.BooleanField(default=True)
    valid_until = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["code"]

    def __str__(self):
        return f"{self.code} (-{self.percent_off}%)"

    def save(self, *args, **kwargs):
        self.code = self.code.strip().upper()
        super().save(*args, **kwargs)

    def is_valid(self, now=None):
        """True when the code is switched on and not past its expiry."""
        from django.utils import timezone

        if not self.active:
            return False
        if self.valid_until is None:
            return True
        return self.valid_until >= (now or timezone.now())


class Order(TimeStampedModel):
    """A placed order. Totals are stored, never recomputed on read."""

    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("paid", "Paid (demo)"),
        ("shipped", "Shipped"),
        ("cancelled", "Cancelled"),
    ]

    order_number = models.CharField(max_length=16, unique=True, blank=True)

    first_name = models.CharField(max_length=80)
    last_name = models.CharField(max_length=80)
    email = models.EmailField()
    phone = models.CharField(max_length=32, blank=True)

    address_line1 = models.CharField(max_length=160)
    address_line2 = models.CharField(max_length=160, blank=True)
    city = models.CharField(max_length=80)
    province = models.CharField(max_length=80, blank=True)
    postal_code = models.CharField(max_length=16)
    country = models.CharField(max_length=80, default="South Africa")

    notes = models.TextField(blank=True)

    subtotal = models.DecimalField(
        max_digits=10, decimal_places=2, default=Decimal("0.00")
    )
    discount = models.DecimalField(
        max_digits=10, decimal_places=2, default=Decimal("0.00")
    )
    shipping = models.DecimalField(
        max_digits=10, decimal_places=2, default=Decimal("0.00")
    )
    vat = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))
    total = models.DecimalField(
        max_digits=10, decimal_places=2, default=Decimal("0.00")
    )

    promo_code = models.CharField(max_length=32, blank=True)
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default="pending")

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.order_number or f"Order #{self.pk}"

    def save(self, *args, **kwargs):
        if not self.order_number:
            self.order_number = self._next_order_number()
        super().save(*args, **kwargs)

    @staticmethod
    def _next_order_number():
        """A short, readable, unique reference such as ``GH-4A7C21``."""
        import uuid

        while True:
            candidate = "GH-" + uuid.uuid4().hex[:6].upper()
            if not Order.objects.filter(order_number=candidate).exists():
                return candidate

    @property
    def customer_name(self):
        return f"{self.first_name} {self.last_name}".strip()

    @property
    def item_count(self):
        return sum(item.quantity for item in self.items.all())


class OrderItem(models.Model):
    """One line of an order, with the product details snapshotted."""

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(
        Product, on_delete=models.SET_NULL, null=True, related_name="order_items"
    )

    product_name = models.CharField(max_length=160)
    product_sku = models.CharField(max_length=32)
    product_slug = models.CharField(max_length=180, blank=True)

    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    quantity = models.PositiveIntegerField(default=1)

    class Meta:
        ordering = ["id"]

    def __str__(self):
        return f"{self.quantity} x {self.product_name}"

    @property
    def line_total(self):
        return (self.unit_price * self.quantity).quantize(Decimal("0.01"))


class ContactMessage(TimeStampedModel):
    """A message sent from the front end's contact page."""

    name = models.CharField(max_length=120)
    email = models.EmailField()
    subject = models.CharField(max_length=160, blank=True)
    message = models.TextField()
    handled = models.BooleanField(default=False)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name} <{self.email}>"