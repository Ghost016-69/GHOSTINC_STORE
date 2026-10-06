/* ==========================================================================
   GHOSTINC_STORE - store.js
   --------------------------------------------------------------------------
   Cart and wishlist state, kept in localStorage. The prices are deliberately
   NOT kept here.

   A cart line holds only a SKU, a quantity and a little display data (name,
   slug, image) so the drawer can paint instantly. Every price, discount, tax
   and total comes from POST /api/cart/price/, so the browser can never invent
   or stale a price.

   Every localStorage call is wrapped: it throws in some private-browsing
   modes, and a shop should still work when storage does not.
   ========================================================================== */
(function (window) {
    "use strict";

    var api = window.GHOSTINC.api;

    var CART_KEY = "ghostinc-cart";
    var WISH_KEY = "ghostinc-wishlist";
    var PROMO_KEY = "ghostinc-promo";

    var listeners = [];

    function read(key, fallback) {
        try {
            var raw = window.localStorage.getItem(key);
            if (!raw) {
                return fallback;
            }
            var parsed = JSON.parse(raw);
            return parsed === null || parsed === undefined ? fallback : parsed;
        } catch (error) {
            return fallback;
        }
    }

    function write(key, value) {
        try {
            window.localStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
            /* Storage full or blocked: carry on without persisting. */
        }
    }

    var cart = read(CART_KEY, []);
    var wishlist = read(WISH_KEY, []);
    var promoCode = read(PROMO_KEY, "");

    if (Object.prototype.toString.call(cart) !== "[object Array]") {
        cart = [];
    }
    if (Object.prototype.toString.call(wishlist) !== "[object Array]") {
        wishlist = [];
    }
    if (typeof promoCode !== "string") {
        promoCode = "";
    }

    function notify() {
        listeners.forEach(function (listener) {
            try {
                listener();
            } catch (error) {
                /* A broken listener must not break the cart. */
            }
        });
    }

    /* R 12 999.00 - space-grouped thousands, always two decimals. */
    function money(value) {
        var amount = Number(value);
        if (!isFinite(amount)) {
            amount = 0;
        }
        var negative = amount < 0;
        var fixed = Math.abs(amount).toFixed(2);
        var parts = fixed.split(".");
        var whole = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, " ");
        return (negative ? "-R " : "R ") + whole + "." + parts[1];
    }

    function cleanQuantity(quantity) {
        var value = parseInt(quantity, 10);
        if (!isFinite(value) || value < 1) {
            value = 1;
        }
        if (value > 99) {
            value = 99;
        }
        return value;
    }

    function lineFor(sku) {
        for (var i = 0; i < cart.length; i++) {
            if (cart[i].sku === sku) {
                return cart[i];
            }
        }
        return null;
    }

    function persist() {
        write(CART_KEY, cart);
        write(WISH_KEY, wishlist);
        write(PROMO_KEY, promoCode);
        notify();
    }

    function snapshot(product) {
        return {
            sku: product.sku,
            slug: product.slug,
            name: product.name,
            brand: product.brand,
            image: product.image,
            price: product.price
        };
    }

    var store = {
        /* -- subscriptions ------------------------------------------------- */
        subscribe: function (listener) {
            listeners.push(listener);
            return function unsubscribe() {
                listeners = listeners.filter(function (item) {
                    return item !== listener;
                });
            };
        },

        /* -- cart ---------------------------------------------------------- */
        items: function () {
            return cart.slice();
        },

        count: function () {
            return cart.reduce(function (total, line) {
                return total + cleanQuantity(line.quantity);
            }, 0);
        },

        isEmpty: function () {
            return cart.length === 0;
        },

        add: function (product, quantity) {
            var amount = cleanQuantity(quantity || 1);
            var line = lineFor(product.sku);

            if (line) {
                line.quantity = cleanQuantity(line.quantity + amount);
            } else {
                var fresh = snapshot(product);
                fresh.quantity = amount;
                cart.push(fresh);
            }
            persist();
            return amount;
        },

        setQuantity: function (sku, quantity) {
            var line = lineFor(sku);
            if (!line) {
                return;
            }
            line.quantity = cleanQuantity(quantity);
            persist();
        },

        remove: function (sku) {
            cart = cart.filter(function (line) {
                return line.sku !== sku;
            });
            persist();
        },

        clear: function () {
            cart = [];
            promoCode = "";
            persist();
        },

        /* -- promo code ---------------------------------------------------- */
        promo: function () {
            return promoCode;
        },

        setPromo: function (code) {
            promoCode = String(code || "").trim().toUpperCase();
            persist();
            return promoCode;
        },

        /* -- talking to the API -------------------------------------------- */
        payload: function () {
            return {
                items: cart.map(function (line) {
                    return {
                        sku: line.sku,
                        quantity: cleanQuantity(line.quantity)
                    };
                }),
                promo_code: promoCode
            };
        },

        /* Ask the server what this cart costs. */
        price: function () {
            if (!api) {
                return window.Promise.reject(new Error("api.js did not load."));
            }
            return api.priceCart(store.payload());
        },

        /* -- wishlist ------------------------------------------------------ */
        wishlist: function () {
            return wishlist.slice();
        },

        isWished: function (sku) {
            return wishlist.some(function (line) {
                return line.sku === sku;
            });
        },

        toggleWish: function (product) {
            var already = store.isWished(product.sku);
            if (already) {
                wishlist = wishlist.filter(function (line) {
                    return line.sku !== product.sku;
                });
            } else {
                wishlist.push(snapshot(product));
            }
            persist();
            return !already;
        },

        money: money
    };

    window.GHOSTINC.store = store;
})(window);