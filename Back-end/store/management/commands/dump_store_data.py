"""Regenerate ``Front-end/Scripts/data.js``, the offline copy of the catalogue.

The front end is written against the live API first and only falls back to this
file when the API cannot be reached (see ``Scripts/data.js`` and the fallback in
``Scripts/api.js``). Because of that, the snapshot has to be *exactly* the shape
the API returns, otherwise the two modes would render slightly different cards.

Rather than hand-maintaining a parallel JSON file that silently drifts, this
command serialises through the very same serializers the API uses, so the two
cannot disagree. ``related`` is deliberately left out: it is four sibling cards
that ``data.js`` derives in the browser from the full catalogue.

Run it from the ``Back-end`` folder, any time the catalogue changes:

    python manage.py dump_store_data
"""

import json
import pathlib

from django.conf import settings
from django.core.management.base import BaseCommand
from django.utils import timezone

from store.models import Brand, Category, Product, PromoCode
from store.serializers import (
    BrandSerializer,
    CategorySerializer,
    ProductDetailSerializer,
)

# Where the generated file lives, relative to Back-end/.
TARGET = pathlib.Path("..") / "Front-end" / "Scripts" / "data.js"


class Command(BaseCommand):
    help = "Write the offline catalogue snapshot used when the API is down."

    def add_arguments(self, parser):
        parser.add_argument(
            "--output",
            default=str(TARGET),
            help="Destination path (default: ../Front-end/Scripts/data.js).",
        )
        parser.add_argument(
            "--indent",
            type=int,
            default=0,
            help="JSON indent; 0 writes it compact (default).",
        )

    def handle(self, *args, **options):
        products = (
            Product.objects.select_related("brand", "category")
            .filter(is_active=True)
            .order_by("-is_featured", "-rating", "name")
        )

        rows = []
        for product in products:
            data = dict(ProductDetailSerializer(product).data)
            # The sibling cards are recomputed in the browser.
            data.pop("related", None)
            rows.append(data)

        payload = {
            "generated_at": timezone.now().isoformat(),
            "settings": {
                "currency": settings.STORE_CURRENCY,
                "vat_rate": str(settings.STORE_VAT_RATE),
                "shipping_flat": str(settings.STORE_SHIPPING_FLAT),
                "free_shipping_threshold": str(
                    settings.STORE_FREE_SHIPPING_THRESHOLD
                ),
                "demo_mode": settings.STORE_DEMO_MODE,
                "page_size": 12,
            },
            "categories": CategorySerializer(
                Category.objects.filter(is_active=True), many=True
            ).data,
            "brands": BrandSerializer(Brand.objects.all(), many=True).data,
            "promos": [
                {
                    "code": promo.code,
                    "percent_off": promo.percent_off,
                    "description": promo.description,
                    "active": promo.active,
                    "valid_until": (
                        promo.valid_until.isoformat()
                        if promo.valid_until
                        else None
                    ),
                }
                for promo in PromoCode.objects.all()
            ],
            "products": rows,
        }

        destination = pathlib.Path(options["output"]).resolve()
        destination.parent.mkdir(parents=True, exist_ok=True)

        body = json.dumps(payload, indent=options["indent"] or None, ensure_ascii=False)
        contents = (
            "/* GENERATED FILE - do not edit by hand.\n"
            " *\n"
            " * Rebuild it from the database with:\n"
            " *     cd Back-end && python manage.py dump_store_data\n"
            " *\n"
            " * This snapshot lets the storefront keep working when the Django API\n"
            " * is not running. Field names and money-as-string formatting match\n"
            " * the live API exactly, because it is written by the same serializers.\n"
            " */\n"
            "window.GHOSTINC_DATA = " + body + ";\n"
        )

        destination.write_text(contents, encoding="utf-8")

        self.stdout.write(
            self.style.SUCCESS(
                f"Wrote {len(rows)} product(s), "
                f"{len(payload['categories'])} categor(ies), "
                f"{len(payload['brands'])} brand(s), "
                f"{len(payload['promos'])} promo code(s) "
                f"to {destination}"
            )
        )