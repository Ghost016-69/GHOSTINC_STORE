"""
Money helpers for the store.

Everything is calculated with :class:`decimal.Decimal` and quantised to two
decimal places so the API never returns ``0.30000000000000004``-style floats.
The same rules are applied by ``POST /api/cart/price/`` and by order creation,
so the two cannot drift apart.
"""

from decimal import Decimal, ROUND_HALF_UP

from django.conf import settings

TWO_PLACES = Decimal("0.01")


def money(value):
    """Round any numeric value to a two-decimal ``Decimal``."""
    return Decimal(value).quantize(TWO_PLACES, rounding=ROUND_HALF_UP)


def vat_rate():
    return Decimal(str(settings.STORE_VAT_RATE))


def shipping_flat():
    return money(settings.STORE_SHIPPING_FLAT)


def free_shipping_threshold():
    return money(settings.STORE_FREE_SHIPPING_THRESHOLD)


def quote(lines, promo=None):
    """Price a cart.

    ``lines`` is an iterable of ``(product, quantity)`` pairs. ``promo`` is an
    optional :class:`~store.models.PromoCode`.

    Returns a dictionary of the figures the front end needs, plus the per-line
    rows it already rendered so the cart table stays in step with the totals.
    """
    rows = []
    subtotal = Decimal("0.00")
    units = 0

    for product, quantity in lines:
        quantity = int(quantity)
        line_total = money(product.price * quantity)
        subtotal = subtotal + line_total
        units = units + quantity
        rows.append(
            {
                "sku": product.sku,
                "slug": product.slug,
                "name": product.name,
                "unit_price": money(product.price),
                "quantity": quantity,
                "line_total": line_total,
                "stock": product.stock,
                "available": product.stock >= quantity and product.is_active,
            }
        )

    subtotal = money(subtotal)

    # Discount ---------------------------------------------------------------
    discount = Decimal("0.00")
    promo_payload = None
    if promo is not None:
        discount = money(subtotal * (Decimal(promo.percent_off) / Decimal("100")))
        promo_payload = {
            "code": promo.code,
            "percent_off": promo.percent_off,
            "description": promo.description,
        }

    discounted = money(subtotal - discount)

    # Shipping is judged on the discounted goods value, and an empty cart never
    # pays for delivery.
    if units == 0:
        shipping = Decimal("0.00")
    elif discounted >= free_shipping_threshold():
        shipping = Decimal("0.00")
    else:
        shipping = shipping_flat()

    taxable = money(discounted + shipping)
    vat = money(taxable * vat_rate())
    total = money(taxable + vat)

    return {
        "rows": rows,
        "item_count": units,
        "subtotal": subtotal,
        "discount": discount,
        "shipping": shipping,
        "vat": vat,
        "total": total,
        "currency": settings.STORE_CURRENCY,
        "promo": promo_payload,
        "free_shipping_threshold": free_shipping_threshold(),
        "shipping_flat": shipping_flat(),
        "vat_rate": str(vat_rate()),
    }


# Keys in a quote that hold money, and therefore must leave the API as strings.
MONEY_KEYS = (
    "subtotal",
    "discount",
    "shipping",
    "vat",
    "total",
    "shipping_flat",
    "free_shipping_threshold",
)


def as_json(quote_result):
    """A quote with every money value as an exact two-decimal string.

    Django REST Framework would otherwise render a ``Decimal`` as a float on
    the way out, and a float cannot be trusted with money. The front end parses
    these strings with ``Number()`` only for display.
    """
    payload = dict(quote_result)

    for key in MONEY_KEYS:
        if payload.get(key) is not None:
            payload[key] = str(money(payload[key]))

    payload["rows"] = [
        dict(
            row,
            unit_price=str(money(row["unit_price"])),
            line_total=str(money(row["line_total"])),
        )
        for row in quote_result["rows"]
    ]
    return payload