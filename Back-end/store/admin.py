"""Django admin registration for the store catalogue."""

from django.contrib import admin

from .models import (
    Brand,
    Category,
    ContactMessage,
    Order,
    OrderItem,
    Product,
    PromoCode,
)


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "icon", "sort_order", "is_active", "product_count")
    list_editable = ("sort_order", "is_active")
    search_fields = ("name", "description")
    prepopulated_fields = {"slug": ("name",)}

    @admin.display(description="Products")
    def product_count(self, obj):
        return obj.product_count


@admin.register(Brand)
class BrandAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "blurb")
    search_fields = ("name", "blurb")
    prepopulated_fields = {"slug": ("name",)}


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "sku",
        "brand",
        "category",
        "price",
        "stock",
        "rating",
        "is_featured",
        "is_active",
    )
    list_filter = ("category", "brand", "condition", "is_featured", "is_active")
    list_editable = ("price", "stock", "is_featured", "is_active")
    search_fields = ("name", "sku", "short_description", "brand__name")
    prepopulated_fields = {"slug": ("name",)}
    readonly_fields = ("created_at", "updated_at")
    fieldsets = (
        ("Identity", {"fields": ("sku", "name", "slug", "brand", "category")}),
        ("Pricing", {"fields": ("price", "compare_at_price")}),
        ("Copy", {"fields": ("short_description", "description", "specs")}),
        ("Media", {"fields": ("image",)}),
        (
            "Stock & scoring",
            {"fields": ("stock", "low_stock_threshold", "rating", "rating_count")},
        ),
        ("Flags", {"fields": ("condition", "is_featured", "is_active")}),
        ("Timestamps", {"fields": ("created_at", "updated_at")}),
    )


@admin.register(PromoCode)
class PromoCodeAdmin(admin.ModelAdmin):
    list_display = ("code", "percent_off", "description", "active", "valid_until")
    list_editable = ("percent_off", "active")
    search_fields = ("code", "description")


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = (
        "product",
        "product_name",
        "product_sku",
        "product_slug",
        "unit_price",
        "quantity",
    )
    can_delete = False


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = (
        "order_number",
        "first_name",
        "last_name",
        "email",
        "total",
        "status",
        "created_at",
    )
    list_filter = ("status", "created_at")
    search_fields = ("order_number", "email", "first_name", "last_name")
    readonly_fields = (
        "order_number",
        "subtotal",
        "discount",
        "shipping",
        "vat",
        "total",
        "created_at",
        "updated_at",
    )
    inlines = [OrderItemInline]
    date_hierarchy = "created_at"


@admin.register(ContactMessage)
class ContactMessageAdmin(admin.ModelAdmin):
    list_display = ("name", "email", "subject", "handled", "created_at")
    list_filter = ("handled", "created_at")
    list_editable = ("handled",)
    search_fields = ("name", "email", "subject", "message")