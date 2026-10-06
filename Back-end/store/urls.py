"""
URL routes for the GHOSTINC store API.

``config.urls`` mounts everything here under ``/api/``. Routes use trailing
slashes throughout, matching the other Django projects in this workspace.
"""

from django.http import JsonResponse
from django.urls import path

from .views import (
    BrandListView,
    CartPriceView,
    CategoryListView,
    ContactCreateView,
    HealthView,
    OrderCreateView,
    OrderDetailView,
    ProductDetailView,
    ProductListView,
    PromoValidateView,
)


def api_index(request):
    """A small map of the API, handy when opening /api/ in a browser."""
    return JsonResponse(
        {
            "name": "GHOSTINC_STORE API",
            "version": "1.0",
            "endpoints": {
                "health": "GET /api/health/",
                "products": "GET /api/products/?search=&category=&brand="
                "&min_price=&max_price=&in_stock=&on_sale=&sort=&page=",
                "product_detail": "GET /api/products/<slug>/",
                "categories": "GET /api/categories/",
                "brands": "GET /api/brands/",
                "price_cart": "POST /api/cart/price/",
                "validate_promo": "POST /api/promo/validate/",
                "place_order": "POST /api/orders/",
                "order_lookup": "GET /api/orders/<order_number>/",
                "contact": "POST /api/contact/",
            },
        }
    )


urlpatterns = [
    path("", api_index, name="index"),
    path("health/", HealthView.as_view(), name="health"),
    path("products/", ProductListView.as_view(), name="product-list"),
    path("products/<slug:slug>/", ProductDetailView.as_view(), name="product-detail"),
    path("categories/", CategoryListView.as_view(), name="category-list"),
    path("brands/", BrandListView.as_view(), name="brand-list"),
    path("cart/price/", CartPriceView.as_view(), name="cart-price"),
    path("promo/validate/", PromoValidateView.as_view(), name="promo-validate"),
    path("orders/", OrderCreateView.as_view(), name="order-create"),
    path("orders/<str:order_number>/", OrderDetailView.as_view(), name="order-detail"),
    path("contact/", ContactCreateView.as_view(), name="contact-create"),
]