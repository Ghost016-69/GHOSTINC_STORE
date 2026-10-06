/* ==========================================================================
   GHOSTINC_STORE - ui.js
   --------------------------------------------------------------------------
   Everything that turns API data into markup: product cards, grids, the
   pagination bar, the cart drawer, the totals panel and the little toasts.

   Two things worth knowing:

   * `asset()` prefixes the "../" the pages need, because the HTML lives in
     `Templates/` while the images (and the API's image paths) are relative to
     `Front-end/`.
   * Card actions use event delegation on `document`, so cards that arrive
     later from the API work without being wired up one at a time.
   ========================================================================== */
(function (window, document) {
    "use strict";

    var api = window.GHOSTINC.api;
    var store = window.GHOSTINC.store;

    /* Pages sit in Templates/, assets sit one level up. */
    var ASSET_PREFIX = (function () {
        var path = (window.location.pathname || "").replace(/\\/g, "/");
        return path.indexOf("/Templates/") !== -1 ? "../" : "";
    })();

    function asset(path) {
        if (!path) {
            return "";
        }
        if (/^https?:\/\//i.test(path) || path.charAt(0) === "/") {
            return path;
        }
        return ASSET_PREFIX + path;
    }

    function escapeHtml(value) {
        return String(value === null || value === undefined ? "" : value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function stars(rating) {
        var value = Math.round(Number(rating) || 0);
        var out = "";
        for (var i = 1; i <= 5; i++) {
            out += i <= value ? "\u2605" : "\u2606";
        }
        return out;
    }

    function stockClass(product) {
        if (!product.in_stock) {
            return "stock stock-out";
        }
        return product.low_stock ? "stock stock-low" : "stock stock-in";
    }

    function badgeMarkup(product) {
        if (!product.badge || !product.badge.label) {
            return "";
        }
        var tone = product.badge.tone || "accent";
        var known = ["sale", "warn", "new", "accent", "muted"];
        if (known.indexOf(tone) === -1) {
            tone = "accent";
        }
        return (
            '<span class="badge badge-' +
            tone +
            '">' +
            escapeHtml(product.badge.label) +
            "</span>"
        );
    }

    /* The attributes that let delegated handlers rebuild a cart line. */
    function productDataAttrs(product) {
        return (
            ' data-sku="' + escapeHtml(product.sku) + '"' +
            ' data-slug="' + escapeHtml(product.slug) + '"' +
            ' data-name="' + escapeHtml(product.name) + '"' +
            ' data-brand="' + escapeHtml(product.brand) + '"' +
            ' data-image="' + escapeHtml(product.image) + '"' +
            ' data-price="' + escapeHtml(product.price) + '"'
        );
    }

    /* The whole product card, as a string. */
    function productCard(product) {
        var wished = store ? store.isWished(product.sku) : false;
        var href = "product.html?slug=" + encodeURIComponent(product.slug);
        var attrs = productDataAttrs(product);

        var priceHtml =
            '<span class="price-now">' +
            escapeHtml(store.money(product.price)) +
            "</span>";
        if (product.is_on_sale && product.compare_at_price) {
            priceHtml +=
                '<span class="price-was">' +
                escapeHtml(store.money(product.compare_at_price)) +
                "</span>" +
                '<span class="price-off">-' +
                escapeHtml(product.discount_percent) +
                "%</span>";
        }

        var addButton = product.in_stock
            ? '<button class="btn btn-primary btn-sm" type="button"' +
              ' data-add-to-cart' + attrs + ">Add to cart</button>"
            : '<button class="btn btn-ghost btn-sm" type="button" disabled>' +
              "Sold out</button>";

        return (
            '<article class="product-card" data-sku="' +
            escapeHtml(product.sku) + '">' +
            '<div class="product-media">' +
            '<img src="' + escapeHtml(asset(product.image)) +
            '" alt="' + escapeHtml(product.name) + '" loading="lazy">' +
            badgeMarkup(product) +
            '<button class="wish-btn" type="button" data-wish' +
            attrs +
            ' aria-pressed="' + (wished ? "true" : "false") + '"' +
            ' aria-label="Save ' + escapeHtml(product.name) + ' for later">' +
            (wished ? "\u2665" : "\u2661") +
            "</button>" +
            "</div>" +
            '<div class="product-body">' +
            '<p class="product-brand">' + escapeHtml(product.brand) + "</p>" +
            '<h3 class="product-title"><a href="' + href + '">' +
            escapeHtml(product.name) + "</a></h3>" +
            '<p class="product-desc">' +
            escapeHtml(product.short_description) + "</p>" +
            '<p class="product-meta">' +
            '<span class="rating" aria-label="Rated ' +
            escapeHtml(product.rating) + ' out of 5">' +
            '<span class="rating-stars" aria-hidden="true">' +
            stars(product.rating) + "</span>" +
            Number(product.rating).toFixed(1) +
            " (" + escapeHtml(product.rating_count) + ")</span>" +
            '<span class="' + stockClass(product) + '">' +
            escapeHtml(product.stock_label) + "</span>" +
            "</p>" +
            '<p class="product-price">' + priceHtml + "</p>" +
            '<div class="card-actions">' + addButton + "</div>" +
            "</div>" +
            "</article>"
        );
    }

    function skeletons(container, count) {
        if (!container) {
            return;
        }
        var out = "";
        for (var i = 0; i < count; i++) {
            out += '<div class="skeleton skeleton-card" aria-hidden="true"></div>';
        }
        container.innerHTML = out;
    }

    function emptyState(title, message, actionHtml) {
        return (
            '<div class="empty">' +
            '<h3 class="empty-title">' + escapeHtml(title) + "</h3>" +
            "<p>" + escapeHtml(message) + "</p>" +
            (actionHtml || "") +
            "</div>"
        );
    }

    function renderProducts(container, products) {
        if (!container) {
            return;
        }
        if (!products || !products.length) {
            container.innerHTML = emptyState(
                "Nothing matches that",
                "Try widening the filters, or browse the whole catalogue.",
                '<a class="btn btn-ghost btn-sm" href="shop.html">See everything</a>'
            );
            return;
        }
        container.innerHTML = products.map(productCard).join("");
    }

    /* -- pagination ----------------------------------------------------- */
    function renderPagination(container, meta, onGo) {
        if (!container) {
            return;
        }
        var pageSize = meta.pageSize || 12;
        var totalPages = Math.max(1, Math.ceil((meta.count || 0) / pageSize));

        if (totalPages <= 1) {
            container.innerHTML = "";
            container.hidden = true;
            return;
        }

        container.hidden = false;
        var html =
            '<button class="page-link" type="button" data-page="' +
            (meta.page - 1) + '"' +
            (meta.page <= 1 ? " disabled" : "") +
            ' aria-label="Previous page">&lsaquo;</button>';

        for (var p = 1; p <= totalPages; p++) {
            var far = Math.abs(p - meta.page) > 1;
            var edge = p !== 1 && p !== totalPages;
            if (totalPages > 7 && far && edge) {
                if (p === 2 || p === totalPages - 1) {
                    html += '<span class="page-link" aria-hidden="true">&hellip;</span>';
                }
                continue;
            }
            html +=
                '<button class="page-link' +
                (p === meta.page ? " is-current" : "") +
                '" type="button" data-page="' + p + '"' +
                (p === meta.page ? ' aria-current="page"' : "") +
                ">" + p + "</button>";
        }

        html +=
            '<button class="page-link" type="button" data-page="' +
            (meta.page + 1) + '"' +
            (meta.page >= totalPages ? " disabled" : "") +
            ' aria-label="Next page">&rsaquo;</button>';

        container.innerHTML = html;
        container.onclick = function (event) {
            var button = event.target.closest("[data-page]");
            if (!button || button.disabled) {
                return;
            }
            onGo(parseInt(button.getAttribute("data-page"), 10));
        };
    }

    /* -- toasts --------------------------------------------------------- */
    function toast(message, isError) {
        var host = document.querySelector(".toasts");
        if (!host) {
            host = document.createElement("div");
            host.className = "toasts";
            host.setAttribute("role", "status");
            host.setAttribute("aria-live", "polite");
            document.body.appendChild(host);
        }

        var el = document.createElement("div");
        el.className = "toast" + (isError ? " is-error" : "");
        el.textContent = message;
        host.appendChild(el);

        window.setTimeout(function () {
            el.remove();
        }, isError ? 5200 : 3200);
    }

    /* -- the little number on the cart button ---------------------------- */
    function refreshBadge() {
        var count = store ? store.count() : 0;
        Array.prototype.forEach.call(
            document.querySelectorAll("[data-cart-count]"),
            function (el) {
                el.textContent = String(count);
                if (count > 0) {
                    el.removeAttribute("hidden");
                } else {
                    el.setAttribute("hidden", "hidden");
                }
            }
        );
    }

    /* -- totals panel (shared by the drawer and the cart page) ----------- */
    function summaryRows(quote) {
        var rows =
            '<div class="summary-row"><span>Subtotal</span><span>' +
            escapeHtml(store.money(quote.subtotal)) + "</span></div>";

        if (Number(quote.discount) > 0) {
            rows +=
                '<div class="summary-row is-discount"><span>Discount' +
                (quote.promo ? " (" + escapeHtml(quote.promo.code) + ")" : "") +
                "</span><span>-" + escapeHtml(store.money(quote.discount)) +
                "</span></div>";
        }

        rows +=
            '<div class="summary-row"><span>Delivery</span><span>' +
            (Number(quote.shipping) > 0
                ? escapeHtml(store.money(quote.shipping))
                : "Free") +
            "</span></div>";
        rows +=
            '<div class="summary-row"><span>VAT (' +
            Math.round(Number(quote.vat_rate) * 100) +
            "%)</span><span>" + escapeHtml(store.money(quote.vat)) +
            "</span></div>";

        return rows;
    }

    function totalsMarkup(quote) {
        return (
            summaryRows(quote) +
            '<div class="summary-total"><span>Total</span><span>' +
            escapeHtml(store.money(quote.total)) + "</span></div>"
        );
    }

    /* Stock problems the server reported for the lines in the cart. */
    function lineProblems(quote) {
        if (!quote || !quote.rows) {
            return [];
        }
        return quote.rows.filter(function (row) {
            return !row.available;
        });
    }

    /* -- cart drawer ----------------------------------------------------- */
    var drawerEl = null;
    var backdropEl = null;
    var lastFocus = null;
    var qtySource = null;

    function mountDrawer() {
        if (drawerEl) {
            return;
        }

        backdropEl = document.createElement("div");
        backdropEl.className = "drawer-backdrop";
        backdropEl.setAttribute("data-drawer-close", "");

        drawerEl = document.createElement("aside");
        drawerEl.className = "drawer";
        drawerEl.id = "cart-drawer";
        drawerEl.setAttribute("role", "dialog");
        drawerEl.setAttribute("aria-modal", "true");
        drawerEl.setAttribute("aria-label", "Your cart");
        drawerEl.setAttribute("aria-hidden", "true");
        drawerEl.innerHTML =
            '<div class="drawer-head">' +
            "<h2>Your cart</h2>" +
            '<button class="icon-btn" type="button" data-drawer-close' +
            ' aria-label="Close cart">\u2715</button>' +
            "</div>" +
            '<div class="drawer-body" data-drawer-body></div>' +
            '<div class="drawer-foot" data-drawer-foot></div>';

        document.body.appendChild(backdropEl);
        document.body.appendChild(drawerEl);

        backdropEl.addEventListener("click", closeDrawer);
        drawerEl.addEventListener("click", function (event) {
            if (event.target.closest("[data-drawer-close]")) {
                closeDrawer();
            }
        });
        document.addEventListener("keydown", function (event) {
            if (event.key === "Escape" && drawerEl.classList.contains("is-open")) {
                closeDrawer();
            }
        });
    }

    function openDrawer() {
        mountDrawer();
        lastFocus = document.activeElement;
        drawerEl.classList.add("is-open");
        drawerEl.setAttribute("aria-hidden", "false");
        backdropEl.classList.add("is-open");
        document.body.classList.add("has-panel");
        refreshDrawer();

        var closeButton = drawerEl.querySelector("[data-drawer-close]");
        if (closeButton) {
            closeButton.focus();
        }
    }

    function closeDrawer() {
        if (!drawerEl || !drawerEl.classList.contains("is-open")) {
            return;
        }
        drawerEl.classList.remove("is-open");
        drawerEl.setAttribute("aria-hidden", "true");
        backdropEl.classList.remove("is-open");
        document.body.classList.remove("has-panel");

        if (lastFocus && lastFocus.focus) {
            lastFocus.focus();
        }
    }

    function refreshDrawer() {
        if (!drawerEl || !store) {
            return;
        }

        var body = drawerEl.querySelector("[data-drawer-body]");
        var foot = drawerEl.querySelector("[data-drawer-foot]");
        var lines = store.items();

        if (!lines.length) {
            body.innerHTML = emptyState(
                "Your cart is empty",
                "Nothing in here yet.",
                '<a class="btn btn-primary btn-sm" href="shop.html">Start shopping</a>'
            );
            foot.innerHTML = "";
            return;
        }

        body.innerHTML = lines
            .map(function (line) {
                return (
                    '<div class="drawer-item">' +
                    '<img src="' + escapeHtml(asset(line.image)) +
                    '" alt="' + escapeHtml(line.name) + '">' +
                    "<div>" +
                    "<h3>" + escapeHtml(line.name) + "</h3>" +
                    "<p>" + escapeHtml(store.money(line.price)) +
                    " &times; " + escapeHtml(line.quantity) + "</p>" +
                    "</div>" +
                    '<button class="remove-btn" type="button" data-remove="' +
                    escapeHtml(line.sku) + '">Remove</button>' +
                    "</div>"
                );
            })
            .join("");

        foot.innerHTML =
            '<p class="form-status" data-drawer-status>Checking prices\u2026</p>' +
            '<div class="btn-row"><a class="btn btn-primary btn-block" ' +
            'href="cart.html">Go to checkout</a></div>';

        store
            .price()
            .then(function (quote) {
                var status = foot.querySelector("[data-drawer-status]");
                var problems = lineProblems(quote);

                if (problems.length) {
                    status.className = "form-status is-error";
                    status.textContent =
                        "Some items are no longer available in that quantity.";
                } else {
                    status.className = "form-status";
                    status.textContent =
                        quote.item_count + " item" +
                        (quote.item_count === 1 ? "" : "s") +
                        " \u00b7 Total " + store.money(quote.total);
                }
            });
    }

    /* -- delegated actions ----------------------------------------------- */
    function productFrom(element) {
        return {
            sku: element.getAttribute("data-sku"),
            slug: element.getAttribute("data-slug"),
            name: element.getAttribute("data-name"),
            brand: element.getAttribute("data-brand"),
            image: element.getAttribute("data-image"),
            price: element.getAttribute("data-price")
        };
    }

    function handleAdd(button) {
        var product = productFrom(button);
        var quantity = qtySource ? qtySource(button) : 1;

        store.add(product, quantity);
        toast("Added " + product.name + " to your cart.");
        openDrawer();
    }

    function handleWish(button) {
        var product = productFrom(button);
        var saved = store.toggleWish(product);

        button.setAttribute("aria-pressed", saved ? "true" : "false");
        button.textContent = saved ? "\u2665" : "\u2661";
        toast(
            saved
                ? "Saved " + product.name + " for later."
                : "Removed " + product.name + " from saved items."
        );
    }

    function handleDocumentClick(event) {
        if (!store) {
            return;
        }

        var target = event.target;

        var addButton = target.closest("[data-add-to-cart]");
        if (addButton && !addButton.disabled) {
            event.preventDefault();
            handleAdd(addButton);
            return;
        }

        var wishButton = target.closest("[data-wish]");
        if (wishButton) {
            event.preventDefault();
            handleWish(wishButton);
            return;
        }

        if (target.closest("[data-open-cart]")) {
            event.preventDefault();
            openDrawer();
            return;
        }

        var removeButton = target.closest("[data-remove]");
        if (removeButton) {
            event.preventDefault();
            store.remove(removeButton.getAttribute("data-remove"));
            toast("Removed from your cart.");
            refreshDrawer();
        }
    }

    function init() {
        refreshBadge();
        document.addEventListener("click", handleDocumentClick);

        if (store) {
            store.subscribe(refreshBadge);
        }
    }

    window.GHOSTINC.ui = {
        asset: asset,
        escapeHtml: escapeHtml,
        stars: stars,
        productCard: productCard,
        renderProducts: renderProducts,
        skeletons: skeletons,
        emptyState: emptyState,
        renderPagination: renderPagination,
        toast: toast,
        refreshBadge: refreshBadge,
        summaryRows: summaryRows,
        totalsMarkup: totalsMarkup,
        lineProblems: lineProblems,
        openDrawer: openDrawer,
        closeDrawer: closeDrawer,
        refreshDrawer: refreshDrawer,
        setQuantitySource: function (fn) {
            qtySource = fn;
        },
        init: init
    };
})(window, document);