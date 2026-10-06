"""
URL configuration for the GHOSTINC_STORE back end.

Everything the front end talks to lives under ``/api/``. The Django admin is
available at ``/admin/`` for managing the catalogue.
"""

from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path


def api_root(request):
    """A tiny index so hitting /api/ in a browser explains what is here."""
    return JsonResponse(
        {
            "name": "GHOSTINC_STORE API",
            "version": "1.0",
            "endpoints": {
                "products": "/api/products/",
                "product_detail": "/api/products/<slug>/",
                "categories": "/api/categories/",
                "brands": "/api/brands/",
                "price_cart": "/api/cart/price/  (POST)",
                "validate_promo": "/api/promo/validate/  (POST)",
                "orders": "/api/orders/  (POST)",
                "order_lookup": "/api/orders/<order_number>/",
                "contact": "/api/contact/  (POST)",
                "health": "/api/health/",
            },
        }
    )


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("store.urls")),
]