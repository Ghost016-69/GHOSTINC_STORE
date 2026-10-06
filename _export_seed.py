"""Export the seeded Django catalogue to a Supabase seed migration.

Reading straight out of db.sqlite3 means the Postgres seed cannot disagree with
the Django one the browser tests already validate.

    cd Back-end
    python ../_export_seed.py
"""

import json
import os
import pathlib
import sys
from decimal import Decimal

ROOT = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT / "Back-end"))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

import django  # noqa: E402

django.setup()

from store.models import Brand, Category, Product, PromoCode  # noqa: E402


def cents(value):
    """Decimal or string rand -> integer cents, or the SQL NULL literal."""
    if value is None:
        return "NULL"
    return str(int((Decimal(str(value)) * 100).to_integral_value()))


def sql_str(value):
    if value is None:
        return "NULL"
    return "'" + str(value).replace("'", "''") + "'"


def sql_json(value):
    body = json.dumps(value or {}, ensure_ascii=False).replace("'", "''")
    return "'" + body + "'::jsonb"


HEADER = [
    "-- =========================================================================",
    "-- 002_seed_catalogue.sql",
    "--",
    "-- GENERATED FILE - do not edit by hand.",
    "--",
    "-- Rebuild it with:",
    "--     cd Back-end && python ../_export_seed.py",
    "--",
    "-- The same demo catalogue the Django back end ships with, converted to",
    "-- integer cents so the Postgres and SQLite stores agree exactly.",
    "-- Idempotent: keyed on slug / sku, so re-running updates in place.",
    "-- =========================================================================",
    "",
]


def section(title, width=58):
    return [f"-- {title} " + "-" * width]


lines = list(HEADER)

# -- categories ------------------------------------------------------------
lines += section("Categories")
for category in Category.objects.filter(is_active=True).order_by("sort_order", "name"):
    lines.append(
        "INSERT INTO public.categories (slug, name, description, icon, sort_order)\n"
        f"VALUES ({sql_str(category.slug)}, {sql_str(category.name)}, "
        f"{sql_str(category.description)}, {sql_str(category.icon)}, "
        f"{category.sort_order})\n"
        "ON CONFLICT (slug) DO UPDATE SET\n"
        "  name = EXCLUDED.name,\n"
        "  description = EXCLUDED.description,\n"
        "  icon = EXCLUDED.icon,\n"
        "  sort_order = EXCLUDED.sort_order,\n"
        "  is_active = true;"
    )
lines.append("")

# -- brands ----------------------------------------------------------------
lines += section("Brands", 62)
for brand in Brand.objects.all().order_by("name"):
    lines.append(
        "INSERT INTO public.brands (slug, name, blurb)\n"
        f"VALUES ({sql_str(brand.slug)}, {sql_str(brand.name)}, "
        f"{sql_str(brand.blurb)})\n"
        "ON CONFLICT (slug) DO UPDATE SET\n"
        "  name = EXCLUDED.name,\n"
        "  blurb = EXCLUDED.blurb;"
    )
lines.append("")

# -- promos ----------------------------------------------------------------
lines += section("Promo codes", 55)
lines.append("-- EXPIRED20 is deliberately already expired, so the expiry branch is")
lines.append("-- exercised the first time the shop loads.")
for promo in PromoCode.objects.all().order_by("code"):
    expiry = sql_str(promo.valid_until.isoformat()) if promo.valid_until else "NULL"
    lines.append(
        "INSERT INTO public.promo_codes "
        "(code, percent_off, description, is_active, valid_until)\n"
        f"VALUES ({sql_str(promo.code)}, {promo.percent_off}, "
        f"{sql_str(promo.description)}, "
        f"{'true' if promo.active else 'false'}, {expiry})\n"
        "ON CONFLICT (code) DO UPDATE SET\n"
        "  percent_off = EXCLUDED.percent_off,\n"
        "  description = EXCLUDED.description,\n"
        "  is_active = EXCLUDED.is_active,\n"
        "  valid_until = EXCLUDED.valid_until;"
    )
lines.append("")

# -- products --------------------------------------------------------------
lines += section("Products", 59)
count = 0
for product in Product.objects.filter(is_active=True).select_related("category", "brand"):
    count += 1
    lines.append(
        "INSERT INTO public.products (\n"
        "  sku, name, slug, category_id, brand_id,\n"
        "  price_cents, compare_at_cents, stock, low_stock_threshold,\n"
        "  short_description, description, specs, image_path,\n"
        "  rating, rating_count, condition, is_featured\n"
        ")\nVALUES (\n"
        f"  {sql_str(product.sku)},\n"
        f"  {sql_str(product.name)},\n"
        f"  {sql_str(product.slug)},\n"
        f"  (SELECT id FROM public.categories WHERE slug = "
        f"{sql_str(product.category.slug)}),\n"
        f"  (SELECT id FROM public.brands WHERE slug = "
        f"{sql_str(product.brand.slug)}),\n"
        f"  {cents(product.price)},\n"
        f"  {cents(product.compare_at_price)},\n"
        f"  {product.stock},\n"
        f"  {product.low_stock_threshold},\n"
        f"  {sql_str(product.short_description)},\n"
        f"  {sql_str(product.description)},\n"
        f"  {sql_json(product.specs)},\n"
        f"  {sql_str(product.image)},\n"
        f"  {product.rating},\n"
        f"  {product.rating_count},\n"
        f"  {sql_str(product.condition)},\n"
        f"  {'true' if product.is_featured else 'false'}\n"
        ")\nON CONFLICT (sku) DO UPDATE SET\n"
        "  name = EXCLUDED.name,\n"
        "  slug = EXCLUDED.slug,\n"
        "  category_id = EXCLUDED.category_id,\n"
        "  brand_id = EXCLUDED.brand_id,\n"
        "  price_cents = EXCLUDED.price_cents,\n"
        "  compare_at_cents = EXCLUDED.compare_at_cents,\n"
        "  stock = EXCLUDED.stock,\n"
        "  low_stock_threshold = EXCLUDED.low_stock_threshold,\n"
        "  short_description = EXCLUDED.short_description,\n"
        "  description = EXCLUDED.description,\n"
        "  specs = EXCLUDED.specs,\n"
        "  image_path = EXCLUDED.image_path,\n"
        "  rating = EXCLUDED.rating,\n"
        "  rating_count = EXCLUDED.rating_count,\n"
        "  condition = EXCLUDED.condition,\n"
        "  is_featured = EXCLUDED.is_featured,\n"
        "  is_active = true;"
    )

destination = ROOT / "supabase" / "migrations" / "002_seed_catalogue.sql"
destination.write_text("\n".join(lines) + "\n", encoding="utf-8")

print(
    f"wrote {destination} ({count} products, "
    f"{Category.objects.filter(is_active=True).count()} categories, "
    f"{Brand.objects.count()} brands, {PromoCode.objects.count()} promos)"
)