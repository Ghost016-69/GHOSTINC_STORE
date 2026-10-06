/* Regression test for the *first* call on a *fresh* page.
 *
 * _test_offline.js warms the shop up with api.products() before it asks for a
 * product, which hides a bug: hybrid() takes a different path once it already
 * knows the API is down. On a real page load the very first call is the one
 * that discovers the API is unreachable, so that is the path exercised here.
 *
 * Run with headless Edge against _test_firstcall.html.
 */
(function () {
    "use strict";

    var api = window.GHOSTINC.api;
    var FIXTURES = window.GHOSTINC_FIXTURES || [];

    var lines = [];
    var failures = 0;

    function ok(name, condition, detail) {
        if (condition) {
            lines.push("PASS  " + name);
        } else {
            failures += 1;
            lines.push("FAIL  " + name + (detail ? "   [" + detail + "]" : ""));
        }
    }

    function done() {
        lines.push("");
        lines.push(
            "RESULT " + (failures === 0 ? "ALL PASSED" : failures + " FAILED")
        );
        document.getElementById("out").textContent = lines.join("\n");
        document.title = failures === 0 ? "TESTS_PASSED" : "TESTS_FAILED";
    }

    /* The very first thing the page does: fetch one product by slug. Nothing
       has called the API yet, so this must go live, fail, and fall back. */
    api.product("vanta-16-creator")
        .then(function (product) {
            ok(
                "first-call product has its slug",
                product && product.slug === "vanta-16-creator",
                "got " + (product && product.slug)
            );
            ok(
                "first-call product has its sku",
                product && product.sku === "GH-LP-002",
                "got " + (product && product.sku)
            );
            ok(
                "first-call product carries specs",
                !!product && !!product.specs && Object.keys(product.specs).length > 0
            );
            ok(
                "first-call product carries related",
                !!product && product.related.length > 0
            );
        })
        .catch(function (error) {
            ok("first-call product resolves", false, "rejected: " + error.message);
        })

        /* Next: price a cart, also from the fallback path. If the arguments were
           dropped this would quietly price an empty cart and report R 0.00. */
        .then(function () {
            var fixture = FIXTURES[1];
            return api
                .priceCart({
                    items: fixture.items,
                    promo_code: fixture.promo_code
                })
                .then(function (quote) {
                    var want = fixture.expected;
                    ok(
                        "first-call cart total (" + fixture.label + ")",
                        quote.total === want.total,
                        "js " + quote.total + " vs django " + want.total
                    );
                    ok(
                        "first-call cart subtotal (" + fixture.label + ")",
                        quote.subtotal === want.subtotal,
                        "js " + quote.subtotal + " vs django " + want.subtotal
                    );
                    ok(
                        "first-call cart has rows (" + fixture.label + ")",
                        quote.rows.length === want.rows.length,
                        "js " + quote.rows.length + " vs django " + want.rows.length
                    );
                    ok("shop reports it is offline", api.isOffline() === true);
                })
                .catch(function (error) {
                    ok("first-call cart resolves", false, "rejected: " + error.message);
                });
        })

        /* And a promo lookup, which also takes arguments through hybrid(). */
        .then(function () {
            return api.validatePromo("GHOST10").then(function (result) {
                ok("first-call promo lookup", result.valid === true);
            });
        })

        /* A filter, to be sure query parameters survive the fallback too. */
        .then(function () {
            return api.products({ category: "gaming" }).then(function (payload) {
                ok(
                    "first-call category filter",
                    payload.count > 0 &&
                        payload.results.every(function (product) {
                            return product.category_slug === "gaming";
                        }),
                    "count " + payload.count
                );
            });
        })

        .catch(function (error) {
            ok("first-call chain completed", false, "threw: " + error.message);
        })

        .then(done);
})();
