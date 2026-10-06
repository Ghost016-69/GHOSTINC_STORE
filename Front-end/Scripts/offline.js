/* ==========================================================================
   GHOSTINC_STORE - offline.js
   --------------------------------------------------------------------------
   A stand-in for the Django API, backed by the snapshot in data.js.

   api.js tries the real API first and only calls in here when the network
   fails, so the shop still browses, filters, searches and adds to the cart with
   the back end stopped. Anything that genuinely needs the database - placing an
   order, looking one up, saving a contact message - is refused out loud rather
   than faked, so a demo is never mistaken for a real transaction.

   The rules below are deliberate copies of the back end:

     * store/views.py   ProductListView   -> filterProducts(), sortProducts()
     * store/pricing.py quote()           -> priceCart()
     * store/models.py  PromoCode         -> findPromo()

   Money is handled in whole cents with integer maths. A float never touches a
   total, so "R 1 999.99" cannot drift into "R 1 999.9899999999".
   ========================================================================== */
(function (window) {
    "use strict";

    var data = window.GHOSTINC_DATA || null;

    function OfflineError(message, status) {
        this.name = "OfflineError";
        this.message = message;
        this.status = status || 503;
    }
    OfflineError.prototype = Object.create(Error.prototype);
    OfflineError.prototype.constructor = OfflineError;

    /* -- money ------------------------------------------------------------ */

    /* "2499.00" -> 249900 cents. Anything odd is treated as zero. */
    function toCents(value) {
        var number = Number(value);
        if (!isFinite(number)) {
            return 0;
        }
        /* Round through a string so 18999.999999 is not truncated downward. */
        return Math.round(Number(number.toFixed(4)) * 100);
    }

    /* 249900 -> "2499.00", matching the API's money-as-string contract. */
    function toMoney(cents) {
        var negative = cents < 0;
        var absolute = Math.abs(Math.round(cents));
        var whole = Math.floor(absolute / 100);
        var part = absolute % 100;
        return (
            (negative ? "-" : "") +
            whole +
            "." +
            (part < 10 ? "0" + part : String(part))
        );
    }

    /* Python's ROUND_HALF_UP, for the non-negative amounts a cart produces. */
    function halfUp(numerator, denominator) {
        return Math.floor((numerator + Math.floor(denominator / 2)) / denominator);
    }

    /* -- settings --------------------------------------------------------- */

    var settings = (data && data.settings) || {};

    var CURRENCY = settings.currency || "ZAR";
    var VAT_PERMILLE = Math.round(parseFloat(settings.vat_rate || "0.15") * 1000);
    var SHIPPING_FLAT = toCents(
        settings.shipping_flat === undefined ? "99.00" : settings.shipping_flat
    );
    var FREE_SHIPPING = toCents(
        settings.free_shipping_threshold === undefined
            ? "2500.00"
            : settings.free_shipping_threshold
    );
    var VAT_RATE_TEXT = settings.vat_rate || "0.15";
    var DEFAULT_PAGE_SIZE = parseInt(settings.page_size, 10) || 12;
    var MAX_PAGE_SIZE = 48;

    /* -- query helpers ---------------------------------------------------- */

    /* The live API accepts a repeated key or a comma separated list. */
    function csv(params, name) {
        var values = [];
        var raw = params[name];

        if (raw === null || raw === undefined || raw === "") {
            return values;
        }

        var list =
            Object.prototype.toString.call(raw) === "[object Array]" ? raw : [raw];

        list.forEach(function (item) {
            if (item === null || item === undefined || item === "") {
                return;
            }
            String(item)
                .split(",")
                .forEach(function (part) {
                    var clean = part.trim();
                    if (clean) {
                        values.push(clean);
                    }
                });
        });

        return values;
    }

    function numberParam(params, name) {
        var raw = params[name];
        if (raw === null || raw === undefined || raw === "") {
            return null;
        }
        var value = parseFloat(raw);
        return isFinite(value) ? value : null;
    }

    var TRUE_VALUES = { "1": true, true: true, "true": true, "yes": true, "on": true };

    function isTrue(value) {
        return TRUE_VALUES[String(value)] === true;
    }

    /* Django's __icontains. */
    function contains(haystack, needle) {
        var text = haystack === null || haystack === undefined ? "" : haystack;
        return String(text).toLowerCase().indexOf(needle.toLowerCase()) !== -1;
    }

    /* -- filtering -------------------------------------------------------- */

    function filterProducts(params) {
        var products = data.products.slice();
        var search = (params.search || "").trim();
        var categories = csv(params, "category");
        var brands = csv(params, "brand");
        var minPrice = numberParam(params, "min_price");
        var maxPrice = numberParam(params, "max_price");

        return products.filter(function (product) {
            if (search) {
                var hit =
                    contains(product.name, search) ||
                    contains(product.sku, search) ||
                    contains(product.short_description, search) ||
                    contains(product.description, search) ||
                    contains(product.brand, search) ||
                    contains(product.category, search);
                if (!hit) {
                    return false;
                }
            }

            if (
                categories.length &&
                categories.indexOf(product.category_slug) === -1
            ) {
                return false;
            }

            if (brands.length && brands.indexOf(product.brand_slug) === -1) {
                return false;
            }

            var price = Number(product.price);
            if (minPrice !== null && price < minPrice) {
                return false;
            }
            if (maxPrice !== null && price > maxPrice) {
                return false;
            }

            if (isTrue(params.in_stock) && !(product.stock > 0)) {
                return false;
            }

            if (isTrue(params.on_sale) && !product.is_on_sale) {
                return false;
            }

            return true;
        });
    }

    /* -- sorting ---------------------------------------------------------- */

    /* The sort keys mirror SORT_OPTIONS in store/views.py. */
    function byName(a, b) {
        return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
    }

    var SORTS = {
        featured: function (a, b) {
            if (a.is_featured !== b.is_featured) {
                return a.is_featured ? -1 : 1;
            }
            if (a.rating !== b.rating) {
                return b.rating - a.rating;
            }
            return byName(a, b);
        },
        price_asc: function (a, b) {
            if (a.price !== b.price) {
                return Number(a.price) - Number(b.price);
            }
            return byName(a, b);
        },
        price_desc: function (a, b) {
            if (a.price !== b.price) {
                return Number(b.price) - Number(a.price);
            }
            return byName(a, b);
        },
        rating: function (a, b) {
            if (a.rating !== b.rating) {
                return b.rating - a.rating;
            }
            return (b.rating_count || 0) - (a.rating_count || 0);
        },
        newest: function (a, b) {
            return String(b.created_at || "").localeCompare(
                String(a.created_at || "")
            );
        },
        name: byName
    };

    function sortProducts(products, key) {
        var sorter = SORTS[key] || SORTS.featured;
        return products.slice().sort(sorter);
    }

    /* -- lookups ---------------------------------------------------------- */

    /* A product as the list endpoint returns it: no description, specs or dates. */
    function listShape(product) {
        var copy = {};
        Object.keys(product).forEach(function (key) {
            if (
                key !== "description" &&
                key !== "specs" &&
                key !== "related" &&
                key !== "created_at" &&
                key !== "updated_at" &&
                key !== "source"
            ) {
                copy[key] = product[key];
            }
        });
        return copy;
    }

    /* The four siblings the API attaches to a product page. */
    function relatedFor(product) {
        return sortProducts(
            data.products.filter(function (candidate) {
                return (
                    candidate.slug !== product.slug &&
                    candidate.category_slug === product.category_slug
                );
            }),
            "featured"
        )
            .slice(0, 4)
            .map(listShape);
    }

    function findBy(field, value) {
        for (var i = 0; i < data.products.length; i++) {
            if (data.products[i][field] === value) {
                return data.products[i];
            }
        }
        return null;
    }

    /* -- promos ----------------------------------------------------------- */

    /* A code is valid when it is switched on and not past its expiry. */
    function findPromo(code) {
        var wanted = String(code || "").trim().toUpperCase();
        if (!wanted) {
            return null;
        }

        var found = null;
        data.promos.forEach(function (promo) {
            if (promo.code === wanted) {
                found = promo;
            }
        });

        if (!found || found.active === false) {
            return null;
        }

        /* valid_until is UTC, and ISO-8601 sorts correctly as plain text. */
        if (found.valid_until && String(found.valid_until) < new Date().toISOString()) {
            return null;
        }

        return found;
    }

    /* -- the public surface ----------------------------------------------- */

    var offline = {
        isAvailable: function () {
            return !!(data && data.products && data.products.length);
        },

        generatedAt: function () {
            return data ? data.generated_at : null;
        },

        health: function () {
            return Promise.resolve({
                status: "ok",
                currency: CURRENCY,
                products: data.products.length,
                demo_mode: true,
                source: "offline"
            });
        },

        categories: function () {
            return Promise.resolve(data.categories.slice());
        },

        brands: function () {
            return Promise.resolve(data.brands.slice());
        },

        products: function (params) {
            params = params || {};

            var matched = filterProducts(params);
            var ordered = sortProducts(matched, String(params.sort || "featured"));

            var size = parseInt(params.page_size, 10);
            if (!isFinite(size) || size < 1) {
                size = DEFAULT_PAGE_SIZE;
            }
            size = Math.min(size, MAX_PAGE_SIZE);

            var page = parseInt(params.page, 10);
            if (!isFinite(page) || page < 1) {
                page = 1;
            }

            var total = ordered.length;
            var pages = Math.max(1, Math.ceil(total / size));
            if (page > pages) {
                page = pages;
            }

            var start = (page - 1) * size;

            /* DRF sends absolute URLs; nothing here reads them, so the base is
               left off and only the shape is preserved. */
            return Promise.resolve({
                count: total,
                next: page < pages ? "?page=" + (page + 1) : null,
                previous: page > 1 ? "?page=" + (page - 1) : null,
                results: ordered.slice(start, start + size).map(listShape),
                source: "offline"
            });
        },

        product: function (slug) {
            var product = findBy("slug", slug);
            if (!product) {
                return Promise.reject(
                    new OfflineError("No product found for that link.", 404)
                );
            }

            var detail = {};
            Object.keys(product).forEach(function (key) {
                detail[key] = product[key];
            });
            detail.related = relatedFor(product);
            detail.source = "offline";

            return Promise.resolve(detail);
        },

        /* quote() from store/pricing.py, in integer cents. */
        priceCart: function (payload) {
            payload = payload || {};

            var items =
                Object.prototype.toString.call(payload.items) === "[object Array]"
                    ? payload.items
                    : [];

            var rows = [];
            var unknownSkus = [];
            var subtotal = 0;
            var units = 0;

            items.forEach(function (item) {
                var product = findBy("sku", item.sku);
                if (!product) {
                    unknownSkus.push(item.sku);
                    return;
                }

                var quantity = parseInt(item.quantity, 10);
                if (!isFinite(quantity) || quantity < 1) {
                    quantity = 1;
                }
                if (quantity > 99) {
                    quantity = 99;
                }

                var unitPrice = toCents(product.price);
                var lineTotal = unitPrice * quantity;
                subtotal += lineTotal;
                units += quantity;

                rows.push({
                    sku: product.sku,
                    slug: product.slug,
                    name: product.name,
                    unit_price: toMoney(unitPrice),
                    quantity: quantity,
                    line_total: toMoney(lineTotal),
                    stock: product.stock,
                    available: product.stock >= quantity && product.in_stock
                });
            });

            /* -- discount --------------------------------------------------- */
            var discount = 0;
            var promoPayload = null;
            var promoError = "";
            var code = String(payload.promo_code || "").trim().toUpperCase();

            if (code) {
                var promo = findPromo(code);
                if (promo) {
                    discount = halfUp(subtotal * promo.percent_off, 100);
                    promoPayload = {
                        code: promo.code,
                        percent_off: promo.percent_off,
                        description: promo.description
                    };
                } else {
                    promoError = "That promo code is not valid.";
                }
            }

            var discounted = subtotal - discount;

            /* Delivery is judged on the discounted goods value, and an empty
               cart never pays for delivery. */
            var shipping = 0;
            if (units > 0 && discounted < FREE_SHIPPING) {
                shipping = SHIPPING_FLAT;
            }

            var taxable = discounted + shipping;
            var vat = halfUp(taxable * VAT_PERMILLE, 1000);
            var total = taxable + vat;

            return Promise.resolve({
                rows: rows,
                item_count: units,
                subtotal: toMoney(subtotal),
                discount: toMoney(discount),
                shipping: toMoney(shipping),
                vat: toMoney(vat),
                total: toMoney(total),
                currency: CURRENCY,
                promo: promoPayload,
                free_shipping_threshold: toMoney(FREE_SHIPPING),
                shipping_flat: toMoney(SHIPPING_FLAT),
                vat_rate: VAT_RATE_TEXT,
                unknown_skus: unknownSkus,
                promo_error: promoError,
                source: "offline"
            });
        },

        validatePromo: function (code) {
            var wanted = String(code || "").trim().toUpperCase();
            if (!wanted) {
                return Promise.reject(new OfflineError("Enter a promo code.", 400));
            }

            var promo = findPromo(wanted);
            if (!promo) {
                return Promise.resolve({
                    valid: false,
                    code: wanted,
                    detail: "That promo code is not valid."
                });
            }

            return Promise.resolve({
                valid: true,
                code: promo.code,
                percent_off: promo.percent_off,
                description: promo.description
            });
        },

        /* -- actions that genuinely need the database ---------------------- */

        placeOrder: function () {
            return Promise.reject(
                new OfflineError(
                    "Checkout needs the store API. Start the back end with " +
                        '"python manage.py runserver" and try again.'
                )
            );
        },

        order: function () {
            return Promise.reject(
                new OfflineError(
                    "Looking up an order needs the store API. Start the back " +
                        'end with "python manage.py runserver" and try again.'
                )
            );
        },

        contact: function () {
            return Promise.reject(
                new OfflineError(
                    "Sending a message needs the store API. Start the back end " +
                        'with "python manage.py runserver" and try again.'
                )
            );
        },

        OfflineError: OfflineError
    };

    window.GHOSTINC = window.GHOSTINC || {};
    window.GHOSTINC.offline = offline;
})(window);