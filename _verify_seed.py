"""Verify the generated Supabase seed against the Django source of truth.

Confirms the cent conversion, the row count, and that the flagship product's
price really did become 4499900 and not 44999.

    python _verify_seed.py
"""

import os
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT / "Back-end"))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

import django  # noqa: E402

django.setup()

from store.models import Brand, Category, Product, PromoCode  # noqa: E402

SEED = ROOT / "supabase" / "migrations" / "002_seed_catalogue.sql"
text = SEED.read_text(encoding="utf-8")

failures = 0


def check(label, condition, detail=""):
    global failures
    if condition:
        print(f"PASS  {label}")
    else:
        failures += 1
        print(f"FAIL  {label}   {detail}")


products = list(
    Product.objects.filter(is_active=True).select_related("category", "brand")
)

check(
    "one INSERT per active product",
    len(re.findall(r"INSERT INTO public\.products", text)) == len(products),
    f"{len(re.findall(r'INSERT INTO public.products', text))} vs {len(products)}",
)
check(
    "one INSERT per category",
    len(re.findall(r"INSERT INTO public\.categories", text))
    == Category.objects.filter(is_active=True).count(),
)
check(
    "one INSERT per brand",
    len(re.findall(r"INSERT INTO public\.brands", text)) == Brand.objects.count(),
)
check(
    "one INSERT per promo code",
    len(re.findall(r"INSERT INTO public\.promo_codes", text)) == PromoCode.objects.count(),
)

# Every product price must appear as exact cents.
missing = []
for product in products:
    expected = int((product.price * 100).to_integral_value())
    if f"  {expected},\n" not in text:
        missing.append(f"{product.sku} expected {expected}")

check("every price_cents is the exact cent value", not missing, ", ".join(missing[:4]))

# The flagship: R 44 999.00 -> 4499900 cents, never 44999.
flagship = next(p for p in products if p.sku == "GH-LP-002")
flagship_cents = int((flagship.price * 100).to_integral_value())
check(
    "flagship converts to 4499900 cents",
    flagship_cents == 4_499_900 and "  4499900," in text,
    f"computed {flagship_cents}",
)

# Sale prices too.
sale = next((p for p in products if p.compare_at_price), None)
sale_cents = int((sale.compare_at_price * 100).to_integral_value())
check(
    "compare_at_cents converts correctly",
    f"  {sale_cents}," in text,
    f"{sale.sku} expected {sale_cents}",
)

# JSONB specs must be quoted and cast.
check("specs are cast to jsonb", "'::jsonb" in text)
check("image paths carried over", "Images/products/phones.svg" in text)

print()
print(f"{len(products)} products checked, {failures} failure(s).")
sys.exit(1 if failures else 0)
