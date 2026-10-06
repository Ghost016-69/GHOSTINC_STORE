/* ==========================================================================
   GHOSTINC_STORE - api.js
   --------------------------------------------------------------------------
   A thin wrapper around fetch() for the Django REST API. No dependencies, no
   build step.

   The API base is worked out at runtime:

     * if a <meta name="ghostinc-api" content="..."> tag is present, it wins;
     * if the pages are being served on port 8000 (i.e. by Django itself), the
       API is same-origin, so no CORS is involved;
     * otherwise the front end is on its own little server, so it points at
       http://127.0.0.1:8000/api/ and lets django-cors-headers do its job.

    That means the same files work whether you serve them with
    `python -m http.server 5500` or straight from Django.

   HYBRID MODE
   -----------
   Every read (and the cart pricing) tries the live API first and falls back to
   the snapshot in data.js - priced by offline.js - when the request fails at
   the network level. Only a status of 0 counts as "the API is not there": a 400
   or a 404 is a real answer from a real server and is passed straight through,
   because falling back there would hide genuine mistakes.

   Once a fallback has happened the switch stays flipped for the rest of the
   session, so the shopper is not repeatedly waiting on a dead socket, and
   `isOffline()` lets the UI say so out loud.
   ========================================================================== */
(function (window) {
    "use strict";

    var FALLBACK_BASE = "http://127.0.0.1:8000/api/";

    function resolveBase() {
        var meta = window.document.querySelector('meta[name="ghostinc-api"]');
        if (meta) {
            var raw = (meta.getAttribute("content") || "").trim();
            if (raw) {
                return raw.charAt(raw.length - 1) === "/" ? raw : raw + "/";
            }
        }
        if (window.location.port === "8000") {
            return window.location.origin + "/api/";
        }
        return FALLBACK_BASE;
    }

    var BASE = resolveBase();

    /* Set the first time a request cannot reach the API at all. */
    var offlineMode = false;
    var offlineListeners = [];

    function markOffline() {
        if (offlineMode) {
            return;
        }
        offlineMode = true;
        offlineListeners.forEach(function (listener) {
            try {
                listener(true);
            } catch (error) {
                /* One broken listener must not break the page. */
            }
        });
    }

    /* True when this call could not reach the API, and therefore when a
       rejection is about connectivity rather than about the request itself. */
    function isUnreachable(error) {
        return !!error && Number(error.status) === 0;
    }

    function buildQuery(params) {
        if (!params) {
            return "";
        }
        var parts = [];

        Object.keys(params).forEach(function (key) {
            var value = params[key];
            if (value === null || value === undefined || value === "") {
                return;
            }
            if (Object.prototype.toString.call(value) === "[object Array]") {
                value.forEach(function (item) {
                    if (item !== null && item !== undefined && item !== "") {
                        parts.push(
                            encodeURIComponent(key) + "=" + encodeURIComponent(item)
                        );
                    }
                });
                return;
            }
            parts.push(encodeURIComponent(key) + "=" + encodeURIComponent(value));
        });

        return parts.length ? "?" + parts.join("&") : "";
    }

    function ApiError(message, status, data) {
        this.name = "ApiError";
        this.message = message;
        this.status = status;
        this.data = data || null;
    }

    ApiError.prototype = Object.create(Error.prototype);
    ApiError.prototype.constructor = ApiError;

    /* Turn whatever DRF sends back into one readable sentence. */
    function friendlyMessage(data, status) {
        if (data && typeof data === "object") {
            if (typeof data.detail === "string") {
                return data.detail;
            }
            var first = null;
            Object.keys(data).forEach(function (key) {
                if (first !== null) {
                    return;
                }
                var value = data[key];
                if (typeof value === "string") {
                    first = value;
                } else if (
                    Object.prototype.toString.call(value) === "[object Array]" &&
                    value.length
                ) {
                    first = String(value[0]);
                }
            });
            if (first) {
                return first;
            }
        }
        if (status === 0) {
            return "Could not reach the store API.";
        }
        return "Something went wrong (HTTP " + status + ").";
    }

    function request(path, options) {
        options = options || {};

        var isAbsolute = /^https?:\/\//i.test(path);
        var url = isAbsolute
            ? path
            : BASE +
              (path.charAt(0) === "/" ? path.slice(1) : path) +
              buildQuery(options.params);

        var init = {
            method: options.method || "GET",
            headers: { Accept: "application/json" }
        };

        if (options.body !== undefined) {
            init.headers["Content-Type"] = "application/json";
            init.body = JSON.stringify(options.body);
        }

        return window.fetch(url, init).then(
            function (response) {
                var type = response.headers.get("content-type") || "";
                var parse = type.indexOf("application/json") !== -1
                    ? response.json()
                    : response.text().then(function (text) {
                          return { detail: text };
                      });

                return parse.then(function (data) {
                    if (!response.ok) {
                        throw new ApiError(
                            friendlyMessage(data, response.status),
                            response.status,
                            data
                        );
                    }
                    return data;
                });
            },
            function () {
                /* Network failure: the backend is almost always not running. */
                throw new ApiError(
                    "Could not reach the store API at " + BASE,
                    0,
                    null
                );
            }
        );
    }

    /* Runs the live request, and hands over to the offline snapshot only when
       the network failed. A real HTTP error status is never retried locally. */
    function hybrid(attempt, offlineMethod) {
        var offline = window.GHOSTINC && window.GHOSTINC.offline;
        /* Captured here, in hybrid's own scope. Inside the .catch() callback
           below, `arguments` means the callback's arguments - just the error -
           so reading it there would pass no slug and no cart to offline.js. */
        var args = Array.prototype.slice.call(arguments, 2);

        /* Once the API is known to be down, skip the dead socket entirely. */
        if (offlineMode && offline && offline.isAvailable()) {
            return offline[offlineMethod].apply(offline, args);
        }

        return attempt().catch(function (error) {
            if (!isUnreachable(error) || !offline || !offline.isAvailable()) {
                throw error;
            }
            markOffline();
            return offline[offlineMethod].apply(offline, args);
        });
    }

    var api = {
        BASE: BASE,
        request: request,
        ApiError: ApiError,

        /* True once the store has had to fall back to its local snapshot. */
        isOffline: function () {
            return offlineMode;
        },

        /* Called with true the first time the shop drops to offline data. */
        onOffline: function (listener) {
            if (typeof listener !== "function") {
                return;
            }
            if (offlineMode) {
                listener(true);
                return;
            }
            offlineListeners.push(listener);
        },

        snapshotTime: function () {
            var offline = window.GHOSTINC && window.GHOSTINC.offline;
            return offline ? offline.generatedAt() : null;
        },

        health: function () {
            return hybrid(function () {
                return request("health/");
            }, "health");
        },

        products: function (params) {
            return hybrid(function () {
                return request("products/", { params: params });
            }, "products", params || {});
        },

        product: function (slug) {
            return hybrid(function () {
                return request("products/" + encodeURIComponent(slug) + "/");
            }, "product", slug);
        },

        categories: function () {
            return hybrid(function () {
                return request("categories/");
            }, "categories");
        },

        brands: function () {
            return hybrid(function () {
                return request("brands/");
            }, "brands");
        },

        /* The cart is priced by whichever engine is answering, using the same
           rules, so the total in the drawer always matches the one that would
           be charged. */
        priceCart: function (payload) {
            return hybrid(function () {
                return request("cart/price/", { method: "POST", body: payload });
            }, "priceCart", payload || {});
        },

        validatePromo: function (code) {
            return hybrid(function () {
                return request("promo/validate/", {
                    method: "POST",
                    body: { code: code }
                });
            }, "validatePromo", code);
        },

        /* -- these three write to the database, so offline.js refuses them
           rather than pretending an order was placed. ------------------------ */

        placeOrder: function (payload) {
            return hybrid(function () {
                return request("orders/", { method: "POST", body: payload });
            }, "placeOrder", payload);
        },

        order: function (number) {
            return hybrid(function () {
                return request("orders/" + encodeURIComponent(number) + "/");
            }, "order", number);
        },

        contact: function (payload) {
            return hybrid(function () {
                return request("contact/", { method: "POST", body: payload });
            }, "contact", payload);
        }
    };

    window.GHOSTINC = window.GHOSTINC || {};
    window.GHOSTINC.api = api;
})(window);