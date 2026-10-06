/* Browser test for the offline pricing engine, run by headless Edge.
 *
 * The Django API is deliberately NOT running while this runs, so every call
 * below has to land on the offline snapshot through api.js's fallback. The
 * expected totals come from Django's own quote(), so this compares the
 * JavaScript against the real back end rather than against itself.
 */
(function () {
    "use strict";

    var api = window.GHOSTINC.api;
    var FIXTURES = window.GHOSTINC_FIXTURES || [];

    var lines = [];
    var failures = 0;
    var tests = [];

    function ok(name, condition, detail) {
        if (condition) {
            lines.push("PASS  " + name);
        } else {
            failures += 1;
            lines.push("FAIL  " + name + (detail ? "   [" + detail + "]" : ""));
        }
    }

    /* -- the snapshot itself ---------------------------------------------- */

    tests.push(function () {
        ok("offline snapshot available", window.GHOSTINC.offline.isAvailable());
        ok(
            "30 products in the snapshot",
            window.GHOSTINC_DATA.products.length === 30,
            "got " + window.GHOSTINC_DATA.products.length
        );
        ok("8 categories", window.GHOSTINC_DATA.categories.length === 8);
        ok("14 brands", window.GHOSTINC_DATA.brands.length === 14);
    });

    /* -- the fallback path ------------------------------------------------- */

    tests.push(function () {
        return api.products({}).then(function (payload) {
            ok("api fell back to offline", api.isOffline() === true);
            ok("total count is 30", payload.count === 30, "got " + payload.count);
            ok("first page holds 12", payload.results.length === 12);
            ok(
                "list shape hides description",
                !Object.prototype.hasOwnProperty.call(
                    payload.results[0],
                    "description"
                )
            );
        });
    });

    tests.push(function () {
        return api.products({ category: "phones" }).then(function (payload) {
            ok("category filter works", payload.count > 0, "count " + payload.count);
            ok(
                "every result is a phone",
                payload.results.every(function (product) {
                    return product.category_slug === "phones";
                })
            );
        });
    });

    tests.push(function () {
        return api.products({ search: "cable" }).then(function (payload) {
            ok("search finds the cable", payload.count >= 1, "count " + payload.count);
        });
    });

    tests.push(function () {
        return api.products({ sort: "price_asc", page_size: 48 }).then(function (p) {
            var prices = p.results.map(function (product) {
                return Number(product.price);
            });
            var sorted = prices.slice().sort(function (a, b) {
                return a - b;
            });
            ok("price_asc is ordered", JSON.stringify(prices) === JSON.stringify(sorted));
        });
    });

    tests.push(function () {
        return api.products({ on_sale: "1" }).then(function (payload) {
            ok(
                "on_sale filter works",
                payload.count > 0 &&
                    payload.results.every(function (product) {
                        return product.is_on_sale === true;
                    })
            );
        });
    });

    tests.push(function () {
        return api.product("vanta-16-creator").then(function (product) {
            ok("product detail loads", product.sku === "GH-LP-002");
            ok(
                "detail carries specs",
                !!product.specs && Object.keys(product.specs).length > 0
            );
            ok("detail carries related", product.related.length > 0);
            ok(
                "related are siblings",
                product.related.every(function (sibling) {
                    return sibling.category_slug === product.category_slug;
                })
            );
        });
    });

    tests.push(function () {
        return api.product("does-not-exist").then(
            function () {
                ok("missing product rejects", false, "it resolved");
            },
            function (error) {
                ok("missing product rejects", error.status === 404);
            }
        );
    });

    /* -- the money: every figure must equal Django's quote() exactly ------- */

    var MONEY_KEYS = ["subtotal", "discount", "shipping", "vat", "total"];

    FIXTURES.forEach(function (fixture) {
        tests.push(function () {
            return api
                .priceCart({
                    items: fixture.items,
                    promo_code: fixture.promo_code
                })
                .then(function (quote) {
                    var want = fixture.expected;
                    var label = fixture.label;

                    MONEY_KEYS.forEach(function (key) {
                        ok(
                            label + " :: " + key,
                            String(quote[key]) === want[key],
                            "js " + quote[key] + " vs django " + want[key]
                        );
                    });

                    ok(
                        label + " :: item_count",
                        quote.item_count === want.item_count,
                        "js " + quote.item_count + " vs django " + want.item_count
                    );

                    ok(
                        label + " :: promo_error",
                        quote.promo_error === want.promo_error,
                        "js '" + quote.promo_error + "' vs django '" + want.promo_error + "'"
                    );

                    ok(
                        label + " :: row count",
                        quote.rows.length === want.rows.length,
                        "js " + quote.rows.length + " vs django " + want.rows.length
                    );

                    quote.rows.forEach(function (row, index) {
                        var expected = want.rows[index];
                        if (!expected) {
                            return;
                        }
                        ok(
                            label + " :: row " + index + " line_total",
                            row.line_total === expected.line_total,
                            "js " + row.line_total + " vs django " + expected.line_total
                        );
                        ok(
                            label + " :: row " + index + " available",
                            row.available === expected.available,
                            "js " + row.available + " vs django " + expected.available
                        );
                    });
                });
        });
    });

    /* -- promos ----------------------------------------------------------- */

    tests.push(function () {
        return api.validatePromo("ghost10").then(function (result) {
            ok("promo lookup is case-insensitive", result.valid === true);
            ok("promo percent is 10", result.percent_off === 10);
        });
    });

    tests.push(function () {
        return api.validatePromo("NOPE").then(function (result) {
            ok("bad promo is rejected", result.valid === false);
        });
    });

    /* -- writes must refuse rather than pretend ---------------------------- */

    tests.push(function () {
        return api
            .placeOrder({ items: [{ sku: "GH-AC-002", quantity: 1 }] })
            .then(
                function () {
                    ok("checkout refuses offline", false, "it resolved");
                },
                function (error) {
                    ok("checkout refuses offline", error.name === "OfflineError");
                }
            );
    });

    tests.push(function () {
        return api.contact({ name: "a", email: "a@b.co", message: "hi" }).then(
            function () {
                ok("contact refuses offline", false, "it resolved");
            },
            function (error) {
                ok("contact refuses offline", error.name === "OfflineError");
            }
        );
    });

    /* -- runner ----------------------------------------------------------- */

    function run(index) {
        if (index >= tests.length) {
            lines.push("");
            lines.push(
                "RESULT " +
                    (failures === 0 ? "ALL PASSED" : failures + " FAILED")
            );
            document.getElementById("out").textContent = lines.join("\n");
            document.title = failures === 0 ? "TESTS_PASSED" : "TESTS_FAILED";
            return;
        }

        Promise.resolve()
            .then(tests[index])
            .catch(function (error) {
                failures += 1;
                lines.push("FAIL  test " + index + " threw: " + error);
            })
            .then(function () {
                run(index + 1);
            });
    }

    run(0);
})();