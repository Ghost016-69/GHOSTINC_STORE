"""Validate the TypeScript pricing algorithm without Node.

Node is not installed in this workspace, so `npm test` cannot run here. This
script re-implements src/utils/pricing.ts *statement for statement* in Python
and checks it against fixtures produced by the legacy Django quote().

It is not a substitute for `npm test` — it guards against the algorithm being
wrong before anyone installs Node. If the two ever disagree, the TypeScript
has drifted from this file and both need fixing.

    cd Back-end
    python ../_verify_pricing.py
"""

import os
import pathlib
import sys
from decimal import ROUND_HALF_UP, Decimal

ROOT = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT / "Back-end"))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

import django  # noqa: E402

django.setup()

from store.models import Product, PromoCode  # noqa: E402
from store.pricing import quote  # noqa: E402

# -- constants, copied from src/utils/pricing.ts ----------------------------
VAT_PERMILLE = 150
SHIPPING_FLAT_CENTS = 9_900
FREE_SHIPPING_THRESHOLD_CENTS = 250_000
MIN_QUANTITY = 1
MAX_QUANTITY = 99


def half_up_divide(numerator: int, denominator: int) -> int:
    """pricing.ts: halfUpDivide()"""
    return (numerator + denominator // 2) // denominator


def clamp_quantity(quantity: int) -> int:
    """pricing.ts: clampQuantity()"""
    if quantity < MIN_QUANTITY:
        return MIN_QUANTITY
    if quantity > MAX_QUANTITY:
        return MAX_QUANTITY
    return quantity


def calculate_cart_quote(items, percent_off: int = 0):
    """pricing.ts: calculateCartQuote()"""
    subtotal = 0
    item_count = 0

    for price_cents, quantity in items:
        qty = clamp_quantity(quantity)
        subtotal += price_cents * qty
        item_count += qty

    discount = half_up_divide(subtotal * percent_off, 100) if percent_off > 0 else 0
    discounted = subtotal - discount

    shipping = (
        SHIPPING_FLAT_CENTS
        if item_count > 0 and discounted < FREE_SHIPPING_THRESHOLD_CENTS
        else 0
    )

    taxable = discounted + shipping
    vat = half_up_divide(taxable * VAT_PERMILLE, 1000)

    return {
        "subtotal_cents": subtotal,
        "discount_cents": discount,
        "shipping_cents": shipping,
        "vat_cents": vat,
        "total_cents": taxable + vat,
        "item_count": item_count,
    }


def to_cents(value) -> int:
    return int((Decimal(str(value)) * 100).to_integral_value())


# -- cases that exercise both engines ---------------------------------------
by_price = list(Product.objects.filter(is_active=True).order_by("price"))
cheapest = by_price[0]
dearest = by_price[-1]
middle = by_price[len(by_price) // 2]

CASES = [
    ("empty", [], ""),
    ("cheapest x1", [(cheapest, 1)], ""),
    ("cheapest x3", [(cheapest, 3)], ""),
    ("middle x2", [(middle, 2)], ""),
    ("dearest x1", [(dearest, 1)], ""),
    ("cheapest + middle", [(cheapest, 1), (middle, 1)], ""),
    ("dearest x1 + GHOST10", [(dearest, 1)], "GHOST10"),
    ("cheapest x3 + TECH15", [(cheapest, 3)], "TECH15"),
    ("dearest x1 + EXPIRED20", [(dearest, 1)], "EXPIRED20"),
]

lines = []
failures = 0


def check(label, condition, detail=""):
    global failures
    if condition:
        lines.append(f"PASS  {label}")
    else:
        failures += 1
        lines.append(f"FAIL  {label}   {detail}")


for label, entries, code in CASES:
    django_promo = None
    if code:
        candidate = PromoCode.objects.filter(code=code).first()
        if candidate is not None and candidate.is_valid():
            django_promo = candidate

    result = quote([(product, qty) for product, qty in entries], django_promo)

    expected = {
        "subtotal_cents": int(result["subtotal"] * 100),
        "discount_cents": int(result["discount"] * 100),
        "shipping_cents": int(result["shipping"] * 100),
        "vat_cents": int(result["vat"] * 100),
        "total_cents": int(result["total"] * 100),
        "item_count": result["item_count"],
    }

    percent = django_promo.percent_off if django_promo else 0
    items = [(to_cents(product.price), qty) for product, qty in entries]
    mine = calculate_cart_quote(items, percent)

    check(label, mine == expected, "" if mine == expected else f"ts {mine} vs django {expected}")
    lines.append(
        f"        subtotal={mine['subtotal_cents']}c "
        f"discount={mine['discount_cents']}c "
        f"shipping={mine['shipping_cents']}c "
        f"vat={mine['vat_cents']}c "
        f"total={mine['total_cents']}c"
    )

# -- the float form, measured rather than assumed -----------------------------
lines.append("")
flagship = next(
    p for p in Product.objects.filter(is_active=True) if p.sku == "GH-LP-002"
)
subtotal = to_cents(flagship.price)
taxable = subtotal - half_up_divide(subtotal * 10, 100)

# NOTE: Python's round() is banker's rounding (round-half-to-even), while
# JavaScript's Math.round() rounds half away from zero. For an exact .5 they
# disagree, so this script must not be used to predict what JS does.
python_half_even = round(taxable * 0.15)
correct = half_up_divide(taxable * VAT_PERMILLE, 1000)
django_vat = int(
    (Decimal(taxable) * Decimal("0.15")).quantize(Decimal("1"), rounding=ROUND_HALF_UP)
)

check("integer formula matches Django", correct == django_vat, f"ts {correct} vs django {django_vat}")
check("the exact .5 is what makes Python and JS differ here", taxable * 0.15 == 607486.5)
check(
    "Python round() is half-to-even, so it is NOT a proxy for Math.round()",
    python_half_even == 607486,
    f"got {python_half_even}",
)

lines += ["", f"{len(CASES)} cart(s) compared against Django quote(), {failures} failure(s)."]

(ROOT / "_verify_pricing.txt").write_text("\n".join(lines), encoding="utf-8")
print("\n".join(lines))
sys.exit(1 if failures else 0)