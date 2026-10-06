"""
API tests for the GHOSTINC store.

Run them with::

    python manage.py test

The pricing tests pin the arithmetic down exactly. The cart in the browser and
the order in the database must always agree, so the same expectations are
asserted against ``POST /api/cart/price/`` and ``POST /api/orders/``.
"""

from decimal import Decimal

from django.test import TestCase
from rest_framework.test import APIClient

from .models import Brand, Category, ContactMessage, Order, Product, PromoCode
from .pricing import money, quote


class StoreFixtureTestCase(TestCase):
    """A small catalogue shared by the test cases below."""

    def setUp(self):
        self.client = APIClient()

        self.phones = Category.objects.create(name="Phones", icon="\U0001F4F1")
        self.audio = Category.objects.create(
            name="Audio", icon="\U0001F3A7", sort_order=2
        )
        self.ghost = Brand.objects.create(name="Ghost Labs")
        self.helios = Brand.objects.create(name="Helios Audio")

        # On sale, plenty of stock, featured.
        self.flagship = Product.objects.create(
            sku="GH-PH-001",
            name="Ghost X1 Pro 5G",
            brand=self.ghost,
            category=self.phones,
            price=Decimal("18999.00"),
            compare_at_price=Decimal("20999.00"),
            short_description="6.7 inch OLED, 120 Hz, 5000 mAh.",
            description="The flagship.",
            specs={"Display": "6.7 inch OLED", "Battery": "5000 mAh"},
            image="Images/products/phones.svg",
            stock=12,
            rating=Decimal("4.80"),
            rating_count=120,
            is_featured=True,
        )

        # A cheap item, for the shipping-threshold maths.
        self.buds = Product.objects.create(
            sku="GH-AU-002",
            name="Helios Air Buds Pro",
            brand=self.helios,
            category=self.audio,
            price=Decimal("1000.00"),
            image="Images/products/audio.svg",
            stock=30,
            rating=Decimal("4.20"),
            rating_count=44,
        )

        # Expensive, so it qualifies for free delivery.
        self.monitor = Product.objects.create(
            sku="GH-AU-003",
            name="Helios Reference Monitor",
            brand=self.helios,
            category=self.audio,
            price=Decimal("3000.00"),
            image="Images/products/audio.svg",
            stock=1,
            rating=Decimal("4.60"),
            rating_count=9,
        )

        # Never available.
        self.soldout = Product.objects.create(
            sku="GH-PH-009",
            name="Ghost X1 Lite",
            brand=self.ghost,
            category=self.phones,
            price=Decimal("1499.00"),
            image="Images/products/phones.svg",
            stock=0,
            rating=Decimal("4.10"),
            rating_count=15,
        )

        # Hidden from the catalogue.
        self.retired = Product.objects.create(
            sku="GH-PH-000",
            name="Ghost X1 (2019)",
            brand=self.ghost,
            category=self.phones,
            price=Decimal("499.00"),
            image="Images/products/phones.svg",
            stock=5,
            is_active=False,
        )

        self.promo = PromoCode.objects.create(
            code="GHOST10", percent_off=10, description="10% off everything"
        )
        PromoCode.objects.create(code="DEAD", percent_off=50, active=False)

        self.valid_order = {
            "first_name": "Ngcebo",
            "last_name": "Dlamini",
            "email": "ngcebo@example.com",
            "phone": "0821234567",
            "address_line1": "12 Circuit Road",
            "city": "Durban",
            "province": "KwaZulu-Natal",
            "postal_code": "4001",
        }


class HealthAndCatalogueTests(StoreFixtureTestCase):
    """Reading the catalogue."""

    def test_health_endpoint_reports_live_product_count(self):
        response = self.client.get("/api/health/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "ok")
        # The inactive product is not counted.
        self.assertEqual(response.json()["products"], 4)

    def test_api_index_lists_the_endpoints(self):
        response = self.client.get("/api/")
        self.assertEqual(response.status_code, 200)
        self.assertIn("products", response.json()["endpoints"])

    def test_product_list_is_paginated_and_hides_inactive_items(self):
        response = self.client.get("/api/products/")
        self.assertEqual(response.status_code, 200)
        payload = response.json()

        self.assertEqual(payload["count"], 4)
        self.assertNotIn("GH-PH-000", [row["sku"] for row in payload["results"]])
        # Money travels as an exact string, never a float.
        self.assertEqual(payload["results"][0]["price"], "18999.00")

    def test_featured_products_are_listed_first(self):
        response = self.client.get("/api/products/", {"sort": "featured"})
        self.assertEqual(response.json()["results"][0]["sku"], "GH-PH-001")

    def test_search_matches_name_sku_and_brand(self):
        by_name = self.client.get("/api/products/", {"search": "air buds"})
        self.assertEqual([r["sku"] for r in by_name.json()["results"]], ["GH-AU-002"])

        by_sku = self.client.get("/api/products/", {"search": "GH-PH-001"})
        self.assertEqual([r["sku"] for r in by_sku.json()["results"]], ["GH-PH-001"])

        by_brand = self.client.get("/api/products/", {"search": "helios"})
        self.assertEqual(by_brand.json()["count"], 2)

    def test_category_and_brand_filters(self):
        by_category = self.client.get("/api/products/", {"category": "audio"})
        self.assertEqual(by_category.json()["count"], 2)

        by_brand = self.client.get("/api/products/", {"brand": "ghost-labs"})
        # The flagship and the sold-out X1 Lite are both Ghost Labs; the
        # retired 2019 model is inactive and stays hidden.
        self.assertEqual(by_brand.json()["count"], 2)
        self.assertNotIn(
            "GH-PH-000", [row["sku"] for row in by_brand.json()["results"]]
        )

        # Comma separated values are accepted for both filters.
        combined = self.client.get(
            "/api/products/", {"category": "audio,phones", "brand": "helios-audio"}
        )
        self.assertEqual(combined.json()["count"], 2)

    def test_price_range_filter(self):
        response = self.client.get(
            "/api/products/", {"min_price": "1000", "max_price": "3000"}
        )
        skus = sorted(row["sku"] for row in response.json()["results"])
        self.assertEqual(skus, ["GH-AU-002", "GH-AU-003", "GH-PH-009"])

    def test_stock_and_sale_filters(self):
        in_stock = self.client.get("/api/products/", {"in_stock": "1"})
        self.assertNotIn("GH-PH-009", [r["sku"] for r in in_stock.json()["results"]])

        on_sale = self.client.get("/api/products/", {"on_sale": "1"})
        self.assertEqual([r["sku"] for r in on_sale.json()["results"]], ["GH-PH-001"])
        self.assertEqual(on_sale.json()["results"][0]["discount_percent"], 10)

    def test_sorting_by_price(self):
        ascending = self.client.get("/api/products/", {"sort": "price_asc"})
        prices = [Decimal(row["price"]) for row in ascending.json()["results"]]
        self.assertEqual(prices, sorted(prices))

        descending = self.client.get("/api/products/", {"sort": "price_desc"})
        prices = [Decimal(row["price"]) for row in descending.json()["results"]]
        self.assertEqual(prices, sorted(prices, reverse=True))

    def test_pagination_splits_the_catalogue(self):
        payload = self.client.get("/api/products/", {"page_size": 2}).json()
        self.assertEqual(payload["count"], 4)
        self.assertEqual(len(payload["results"]), 2)
        self.assertIsNotNone(payload["next"])

    def test_product_detail_includes_specs_and_related_items(self):
        response = self.client.get("/api/products/ghost-x1-pro-5g/")
        self.assertEqual(response.status_code, 200)

        payload = response.json()
        self.assertEqual(payload["specs"]["Display"], "6.7 inch OLED")
        self.assertEqual(payload["stock_label"], "In stock")
        # The siblings are the other phone only (the inactive one is excluded).
        self.assertEqual([row["sku"] for row in payload["related"]], ["GH-PH-009"])

    def test_product_detail_404s_for_an_inactive_product(self):
        response = self.client.get("/api/products/ghost-x1-2019/")
        self.assertEqual(response.status_code, 404)

    def test_categories_and_brands_carry_product_counts(self):
        categories = self.client.get("/api/categories/").json()
        counts = {row["slug"]: row["product_count"] for row in categories}
        self.assertEqual(counts["phones"], 2)
        self.assertEqual(counts["audio"], 2)

        brands = self.client.get("/api/brands/").json()
        brand_counts = {row["slug"]: row["product_count"] for row in brands}
        self.assertEqual(brand_counts["ghost-labs"], 2)


class CartPricingTests(StoreFixtureTestCase):
    """POST /api/cart/price/ - the server prices every cart."""

    url = "/api/cart/price/"

    def test_empty_cart_costs_nothing(self):
        payload = self.client.post(self.url, {"items": []}, format="json").json()
        self.assertEqual(payload["item_count"], 0)
        self.assertEqual(payload["subtotal"], "0.00")
        self.assertEqual(payload["shipping"], "0.00")
        self.assertEqual(payload["vat"], "0.00")
        self.assertEqual(payload["total"], "0.00")

    def test_small_cart_pays_flat_shipping_and_15_percent_vat(self):
        payload = self.client.post(
            self.url, {"items": [{"sku": "GH-AU-002", "quantity": 1}]}, format="json"
        ).json()

        self.assertEqual(payload["subtotal"], "1000.00")
        # 1000 is under the 2500 free-delivery threshold.
        self.assertEqual(payload["shipping"], "99.00")
        self.assertEqual(payload["vat"], "164.85")      # 15% of 1099.00
        self.assertEqual(payload["total"], "1263.85")
        self.assertEqual(payload["currency"], "ZAR")

    def test_free_shipping_above_the_threshold(self):
        payload = self.client.post(
            self.url, {"items": [{"sku": "GH-AU-003", "quantity": 1}]}, format="json"
        ).json()

        self.assertEqual(payload["subtotal"], "3000.00")
        self.assertEqual(payload["shipping"], "0.00")
        self.assertEqual(payload["vat"], "450.00")
        self.assertEqual(payload["total"], "3450.00")

    def test_quantities_multiply_and_promos_come_off_the_subtotal(self):
        payload = self.client.post(
            self.url,
            {
                "items": [{"sku": "GH-AU-002", "quantity": 3}],
                "promo_code": "ghost10",
            },
            format="json",
        ).json()

        self.assertEqual(payload["subtotal"], "3000.00")
        self.assertEqual(payload["discount"], "300.00")   # 10% of 3000
        self.assertEqual(payload["promo"]["code"], "GHOST10")
        # Delivery is judged on the discounted goods value: 2700 >= 2500.
        self.assertEqual(payload["shipping"], "0.00")
        self.assertEqual(payload["vat"], "405.00")        # 15% of 2700
        self.assertEqual(payload["total"], "3105.00")

    def test_an_expired_promo_code_is_rejected(self):
        payload = self.client.post(
            self.url,
            {
                "items": [{"sku": "GH-AU-002", "quantity": 1}],
                "promo_code": "EXPIRED20",
            },
            format="json",
        ).json()

        self.assertEqual(payload["discount"], "0.00")
        self.assertEqual(payload["promo"], None)
        self.assertIn("not valid", payload["promo_error"])

    def test_unknown_sku_is_reported_not_priced(self):
        payload = self.client.post(
            self.url,
            {
                "items": [
                    {"sku": "GH-AU-002", "quantity": 1},
                    {"sku": "NOPE-123", "quantity": 1},
                ]
            },
            format="json",
        ).json()

        self.assertEqual(payload["unknown_skus"], ["NOPE-123"])
        self.assertEqual(payload["item_count"], 1)
        self.assertEqual(payload["subtotal"], "1000.00")

    def test_a_line_beyond_stock_is_flagged_unavailable(self):
        payload = self.client.post(
            self.url, {"items": [{"sku": "GH-AU-003", "quantity": 5}]}, format="json"
        ).json()

        row = payload["rows"][0]
        self.assertFalse(row["available"])
        self.assertEqual(row["stock"], 1)

    def test_quantity_must_be_a_positive_integer(self):
        response = self.client.post(
            self.url, {"items": [{"sku": "GH-AU-002", "quantity": 0}]}, format="json"
        )
        self.assertEqual(response.status_code, 400)

    def test_promo_validation_endpoint(self):
        good = self.client.post(
            "/api/promo/validate/", {"code": "ghost10"}, format="json"
        ).json()
        self.assertTrue(good["valid"])
        self.assertEqual(good["percent_off"], 10)

        bad = self.client.post(
            "/api/promo/validate/", {"code": "DEAD"}, format="json"
        ).json()
        self.assertFalse(bad["valid"])


class OrderTests(StoreFixtureTestCase):
    """POST /api/orders/ - checkout writes the order and moves stock."""

    url = "/api/orders/"

    def _payload(self, **overrides):
        payload = dict(self.valid_order)
        payload.update(overrides)
        return payload

    def test_placing_an_order_stores_totals_and_decrements_stock(self):
        response = self.client.post(
            self.url,
            self._payload(items=[{"sku": "GH-PH-001", "quantity": 2}]),
            format="json",
        )
        self.assertEqual(response.status_code, 201)

        order = response.json()
        self.assertTrue(order["order_number"].startswith("GH-"))
        self.assertEqual(order["item_count"], 2)

        # 2 x 18999.00, free delivery, 15% VAT.
        self.assertEqual(order["subtotal"], "37998.00")
        self.assertEqual(order["shipping"], "0.00")
        self.assertEqual(order["vat"], "5699.70")
        self.assertEqual(order["total"], "43697.70")

        # The line keeps its own copy of the product details.
        line = order["items"][0]
        self.assertEqual(line["product_sku"], "GH-PH-001")
        self.assertEqual(line["unit_price"], "18999.00")
        self.assertEqual(line["line_total"], "37998.00")

        self.flagship.refresh_from_db()
        self.assertEqual(self.flagship.stock, 10)
        self.assertEqual(Order.objects.count(), 1)

    def test_order_totals_match_what_the_cart_quoted(self):
        items = [{"sku": "GH-AU-002", "quantity": 3}]
        quoted = self.client.post(
            "/api/cart/price/",
            {"items": items, "promo_code": "GHOST10"},
            format="json",
        ).json()

        placed = self.client.post(
            self.url,
            self._payload(items=items, promo_code="GHOST10"),
            format="json",
        ).json()

        for field in ("subtotal", "discount", "shipping", "vat", "total"):
            self.assertEqual(placed[field], quoted[field], msg=field)

    def test_customer_prices_are_ignored_and_recalculated(self):
        """A tampered cart cannot buy the flagship for R1."""
        response = self.client.post(
            self.url,
            self._payload(
                items=[
                    {
                        "sku": "GH-PH-001",
                        "quantity": 1,
                        "price": "1.00",
                        "line_total": "1.00",
                    }
                ]
            ),
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["subtotal"], "18999.00")

    def test_order_is_refused_when_stock_is_too_low(self):
        response = self.client.post(
            self.url,
            self._payload(items=[{"sku": "GH-AU-003", "quantity": 4}]),
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(Order.objects.count(), 0)

        # Nothing was taken off the shelf.
        self.monitor.refresh_from_db()
        self.assertEqual(self.monitor.stock, 1)

    def test_order_is_refused_for_a_sold_out_product(self):
        response = self.client.post(
            self.url,
            self._payload(items=[{"sku": "GH-PH-009", "quantity": 1}]),
            format="json",
        )
        self.assertEqual(response.status_code, 400)

    def test_order_is_refused_for_an_unknown_sku(self):
        response = self.client.post(
            self.url,
            self._payload(items=[{"sku": "NOPE-123", "quantity": 1}]),
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("Unknown product", str(response.json()))

    def test_order_is_refused_for_an_invalid_promo_code(self):
        response = self.client.post(
            self.url,
            self._payload(
                items=[{"sku": "GH-AU-002", "quantity": 1}], promo_code="DEAD"
            ),
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(Order.objects.count(), 0)

    def test_an_empty_cart_cannot_be_checked_out(self):
        response = self.client.post(self.url, self._payload(items=[]), format="json")
        self.assertEqual(response.status_code, 400)

    def test_missing_customer_details_are_rejected(self):
        payload = self._payload(items=[{"sku": "GH-AU-002", "quantity": 1}])
        payload.pop("email")
        response = self.client.post(self.url, payload, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("email", response.json())

    def test_an_order_can_be_looked_up_by_its_number(self):
        placed = self.client.post(
            self.url,
            self._payload(items=[{"sku": "GH-AU-002", "quantity": 1}]),
            format="json",
        ).json()

        found = self.client.get(f"/api/orders/{placed['order_number']}/")
        self.assertEqual(found.status_code, 200)
        self.assertEqual(found.json()["email"], "ngcebo@example.com")
        self.assertEqual(found.json()["items"][0]["product_sku"], "GH-AU-002")

    def test_an_unknown_order_number_is_a_404(self):
        response = self.client.get("/api/orders/GH-NOPE01/")
        self.assertEqual(response.status_code, 404)


class ContactTests(StoreFixtureTestCase):
    """POST /api/contact/ - the contact page."""

    def test_a_message_is_logged(self):
        response = self.client.post(
            "/api/contact/",
            {
                "name": "Ngcebo Dlamini",
                "email": "ngcebo@example.com",
                "subject": "Stock question",
                "message": "When does the X1 Lite come back in?",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(ContactMessage.objects.count(), 1)

    def test_name_email_and_message_are_required(self):
        response = self.client.post("/api/contact/", {"name": "Nobody"}, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(ContactMessage.objects.count(), 0)


class PricingHelperTests(StoreFixtureTestCase):
    """The pricing helper itself, exercised directly."""

    def test_quote_matches_a_hand_calculation(self):
        totals = quote([(self.flagship, 1), (self.buds, 2)])

        self.assertEqual(totals["subtotal"], money("18999.00") + money("2000.00"))
        self.assertEqual(totals["item_count"], 3)
        # Well over the free-delivery threshold, so there is no shipping line.
        self.assertEqual(totals["shipping"], Decimal("0.00"))
        self.assertEqual(totals["vat"], money(Decimal("20999.00") * Decimal("0.15")))
        self.assertEqual(totals["total"], money(Decimal("20999.00") * Decimal("1.15")))

    def test_discount_is_rounded_to_cents(self):
        totals = quote([(self.soldout, 3)], self.promo)
        # 3 x 1499.00 = 4497.00, and 10% of that is 449.70 exactly.
        self.assertEqual(totals["subtotal"], Decimal("4497.00"))
        self.assertEqual(totals["discount"], Decimal("449.70"))
        self.assertEqual(totals["vat"], money(Decimal("4047.30") * Decimal("0.15")))