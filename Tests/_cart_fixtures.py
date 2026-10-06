"""Print the cart totals Django's own quote() produces, as JSON.

This is the ground truth the JavaScript pricing in offline.js is checked
against. Run it from the Back-end folder:

    python ../_cart_fixtures.py
"""

import json
import os
import pathlib
import sys

BACK_END = pathlib.Path(__file__).resolve().parent.parent / "Back-end"
sys.path.insert(0, str(BACK_END))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

import django  # noqa: E402

django.setup()

from store.models import Product, PromoCode  # noqa: E402
from store.pricing import as_json, quote  # noqa: E402

# Pick a spread of prices so the free-shipping branch is exercised both ways.
products = list(
    Product.objects.filter(is_active=True).order_by("price").select_related("brand", "category")
)
cheapest = products[0]
mid = products[len(products) // 2]
dearest = products[-1]

CART_FIXTURES = [
    {"label": "empty", "items": [], "promo_code": ""},
    {"label": "cheapest x1", "items": [(cheapest, 1)], "promo_code": ""},
    {"label": "cheapest x3", "items": [(cheapest, 3)], "promo_code": ""},
    {"label": "mid x2", "items": [(mid, 2)], "promo_code": ""},
    {"label": "dearest x1", "items": [(dearest, 1)], "promo_code": ""},
    {"label": "cheapest+mid", "items": [(cheapest, 1), (mid, 1)], "promo_code": ""},
    {"label": "dearest x1 + GHOST10", "items": [(dearest, 1)], "promo_code": "GHOST10"},
    {"label": "cheapest x3 + TECH15", "items": [(cheapest, 3)], "promo_code": "TECH15"},
    {"label": "dearest x1 + EXPIRED20", "items": [(dearest, 1)], "promo_code": "EXPIRED20"},
]

payload = []
for fixture in CART_FIXTURES:
    lines = [(product, quantity) for product, quantity in fixture["items"]]
    promo = None
    promo_error = ""
    code = fixture["promo_code"]
    if code:
        candidate = PromoCode.objects.filter(code=code).first()
        if candidate is not None and candidate.is_valid():
            promo = candidate
        else:
            promo_error = "That promo code is not valid."

    totals = as_json(quote(lines, promo))
    totals["promo_error"] = promo_error
    payload.append(
        {
            "label": fixture["label"],
            "items": [
                {"sku": product.sku, "quantity": quantity}
                for product, quantity in fixture["items"]
            ],
            "promo_code": code,
            "expected": totals,
        }
    )

print(json.dumps(payload, indent=2))
