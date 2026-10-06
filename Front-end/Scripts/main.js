/* ==========================================================================
   GHOSTINC_STORE - main.js
   --------------------------------------------------------------------------
   One script for every page. It starts the shared furniture (theme, mobile
   nav, cart badge, drawer) and then hands over to the controller for the page
   named in <body data-page="...">.

   Each controller looks for its own hook element and quietly does nothing when
   that element is missing, so there is no need for a per-page script.
   ========================================================================== */
(function (window, document) {
    "use strict";

    var api = window.GHOSTINC.api;
    var store = window.GHOSTINC.store;
    var ui = window.GHOSTINC.ui;

    function qs(selector, root) {
        return (root || document).querySelector(selector);
    }

    function qsa(selector, root) {
        return Array.prototype.slice.call((root || document).querySelectorAll(selector));
    }

    /* -- query string helpers -------------------------------------------- */
    function param(name) {
        var parts = (window.location.search || "").replace(/^\?/, "").split("&");

        for (var i = 0; i < parts.length; i++) {
            if (!parts[i]) {
                continue;
            }
            var pair = parts[i].split("=");
            if (decodeURIComponent(pair[0].replace(/\+/g, " ")) === name) {
                return decodeURIComponent(
                    pair.slice(1).join("=").replace(/\+/g, " ")
                );
            }
        }
        return "";
    }

    function paramList(name) {
        var value = param(name);
        return value ? value.split(",").filter(Boolean) : [];
    }

    function intParam(name, fallback) {
        var value = parseInt(param(name), 10);
        return isFinite(value) && value > 0 ? value : fallback;
    }

    /* Change the query string without reloading the page. */
    function updateQuery(changes, replace) {
        var query = new window.URLSearchParams(window.location.search);

        Object.keys(changes).forEach(function (key) {
            var value = changes[key];
            if (value === null || value === undefined || value === "") {
                query.delete(key);
            } else if (Object.prototype.toString.call(value) === "[object Array]") {
                query.delete(key);
                if (value.length) {
                    query.set(key, value.join(","));
                }
            } else {
                query.set(key, value);
            }
        });

        var search = query.toString();
        var url = window.location.pathname + (search ? "?" + search : "");

        if (replace) {
            window.history.replaceState(null, "", url);
        } else {
            window.history.pushState(null, "", url);
        }
        return url;
    }

    /* -- a loud, friendly warning when the backend is not running -------- */
    function showApiWarning(error) {
        var main = qs("main");
        if (!main || qs(".api-warning", main)) {
            return;
        }

        /* An offline.js refusal is a real answer about a real action (checkout,
           contact), not a broken API, so it is worded differently. */
        var needsApi = error && error.name === "OfflineError";

        var box = document.createElement("div");
        box.className = "api-warning";
        box.innerHTML = needsApi
            ? "<strong>That needs the store API.</strong>" +
              "<span>" +
              ui.escapeHtml(error.message) +
              "</span>"
            : "<strong>The store API is not answering.</strong>" +
              "<span>Start the back end with <code>python manage.py runserver</code>, " +
              "then reload this page. Tried <code>" +
              ui.escapeHtml(api.BASE) +
              "</code>.</span>";
        main.insertBefore(box, main.firstChild);
    }

    /* -- the shop fell back to its offline snapshot ------------------------ */
    function showOfflineNotice() {
        var main = qs("main");
        if (!main || qs(".offline-notice", main)) {
            return;
        }

        var box = document.createElement("div");
        box.className = "api-warning offline-notice";
        box.innerHTML =
            "<strong>Showing saved prices.</strong>" +
            "<span>The store API is not answering, so this page is using the " +
            "catalogue snapshot saved in <code>Scripts/data.js</code>. Browsing, " +
            "searching and the cart all work; checkout needs the back end running " +
            "with <code>python manage.py runserver</code>.</span>";
        main.insertBefore(box, main.firstChild);
    }

    /* -- theme ------------------------------------------------------------ */
    var THEME_KEY = "ghostinc-theme";

    function readStoredTheme() {
        try {
            var stored = window.localStorage.getItem(THEME_KEY);
            return stored === "light" || stored === "dark" ? stored : null;
        } catch (error) {
            return null;
        }
    }

    function storeTheme(theme) {
        try {
            window.localStorage.setItem(THEME_KEY, theme);
        } catch (error) {
            /* Private mode: the choice simply will not persist. */
        }
    }

    function currentTheme() {
        return document.documentElement.getAttribute("data-theme") === "light"
            ? "light"
            : "dark";
    }

    function applyTheme(theme) {
        var isLight = theme === "light";
        document.documentElement.setAttribute("data-theme", theme);

        qsa("[data-theme-toggle]").forEach(function (button) {
            button.setAttribute("aria-pressed", String(isLight));
            button.setAttribute(
                "aria-label",
                isLight ? "Switch to dark theme" : "Switch to light theme"
            );

            var icon = qs("[data-theme-icon]", button);
            if (icon) {
                icon.textContent = isLight ? "\uD83C\uDF19" : "☀️";
            }
        });
    }

    /* Wires the header's theme button. */
    function initTheme() {
        var toggles = qsa("[data-theme-toggle]");
        if (!toggles.length) {
            return;
        }

        applyTheme(readStoredTheme() || currentTheme());

        toggles.forEach(function (button) {
            button.addEventListener("click", function () {
                var next = currentTheme() === "light" ? "dark" : "light";
                applyTheme(next);
                storeTheme(next);
            });
        });
    }

    /* -- shared furniture ------------------------------------------------- */
    function stampYear() {
        var year = String(new Date().getFullYear());
        qsa("[data-year]").forEach(function (slot) {
            slot.textContent = year;
        });
    }

    function initNavToggle() {
        var toggle = qs("[data-nav-toggle]");
        var nav = qs("#primary-nav");
        if (!toggle || !nav) {
            return;
        }

        function setExpanded(expanded) {
            toggle.setAttribute("aria-expanded", String(expanded));
            nav.classList.toggle("is-open", expanded);
        }

        toggle.addEventListener("click", function () {
            setExpanded(toggle.getAttribute("aria-expanded") !== "true");
        });

        nav.addEventListener("click", function (event) {
            if (event.target.closest("a")) {
                setExpanded(false);
            }
        });

        document.addEventListener("keydown", function (event) {
            if (event.key === "Escape") {
                setExpanded(false);
            }
        });

        window.addEventListener("resize", function () {
            if (window.innerWidth >= 768) {
                setExpanded(false);
            }
        });
    }

    function initActiveLink() {
        var here = window.location.pathname.split("/").pop() || "index.html";
        qsa(".primary-nav a[href]").forEach(function (link) {
            var target = link.getAttribute("href").split("#")[0].split("/").pop();
            if (target && target === here) {
                link.classList.add("is-active");
                link.setAttribute("aria-current", "page");
            }
        });
    }

    /* -- home ------------------------------------------------------------- */
    function initHome() {
        var categoryHost = qs("[data-categories]");
        var featuredHost = qs("[data-featured]");
        var dealsHost = qs("[data-deals]");
        var statsHost = qs("[data-stats]");

        if (categoryHost) {
            api.categories()
                .then(function (categories) {
                    categoryHost.innerHTML = categories
                        .map(function (category) {
                            return (
                                '<a class="category-card" href="shop.html?category=' +
                                encodeURIComponent(category.slug) + '">' +
                                '<span class="category-icon" aria-hidden="true">' +
                                ui.escapeHtml(category.icon || "\u25C6") + "</span>" +
                                "<span>" +
                                '<span class="category-name">' +
                                ui.escapeHtml(category.name) + "</span>" +
                                '<span class="category-count">' +
                                category.product_count + " product" +
                                (category.product_count === 1 ? "" : "s") +
                                "</span></span></a>"
                            );
                        })
                        .join("");
                })
                .catch(showApiWarning);
        }

        if (featuredHost) {
            ui.skeletons(featuredHost, 4);
            api.products({ sort: "featured", page_size: 8 })
                .then(function (payload) {
                    ui.renderProducts(featuredHost, payload.results);
                })
                .catch(function (error) {
                    showApiWarning(error);
                    featuredHost.innerHTML = ui.emptyState(
                        "The catalogue is unavailable",
                        "The store API did not answer."
                    );
                });
        }

        if (dealsHost) {
            ui.skeletons(dealsHost, 4);
            api.products({ on_sale: "1", sort: "price_asc", page_size: 4 })
                .then(function (payload) {
                    if (!payload.results.length) {
                        dealsHost.innerHTML = ui.emptyState(
                            "No sales on right now",
                            "Everything is at full price this week."
                        );
                        return;
                    }
                    ui.renderProducts(dealsHost, payload.results);
                })
                .catch(function (error) {
                    showApiWarning(error);
                    dealsHost.innerHTML = "";
                });
        }

        if (statsHost) {
            api.health()
                .then(function (health) {
                    qsa("[data-stat]", statsHost).forEach(function (node) {
                        if (node.getAttribute("data-stat") === "products") {
                            node.textContent = String(health.products);
                        }
                    });
                })
                .catch(function () {
                    /* The numbers are decorative; failing quietly is fine. */
                });
        }
    }

    /* -- shop ------------------------------------------------------------- */
    function initShop() {
        var results = qs("[data-shop-results]");
        if (!results) {
            return;
        }

        var countLabel = qs("[data-shop-count]");
        var paginationHost = qs("[data-shop-pagination]");
        var categoryHost = qs("[data-filter-categories]");
        var brandHost = qs("[data-filter-brands]");
        var minInput = qs("[data-price-min]");
        var maxInput = qs("[data-price-max]");
        var stockBox = qs("[data-filter-stock]");
        var saleBox = qs("[data-filter-sale]");
        var sortSelect = qs("[data-sort]");
        var searchForm = qs("[data-search-form]");
        var searchInput = qs("[data-search-input]");
        var clearButton = qs("[data-clear-filters]");
        var pageSize = 12;

        function currentParams(page) {
            return {
                search: param("search") || undefined,
                category: paramList("category").join(",") || undefined,
                brand: paramList("brand").join(",") || undefined,
                min_price: param("min_price") || undefined,
                max_price: param("max_price") || undefined,
                in_stock: param("in_stock") === "1" ? "1" : undefined,
                on_sale: param("on_sale") === "1" ? "1" : undefined,
                sort: param("sort") || "featured",
                page: page || intParam("page", 1),
                page_size: pageSize
            };
        }

        function syncControls() {
            var categories = paramList("category");
            var brands = paramList("brand");

            if (searchInput) {
                searchInput.value = param("search");
            }
            if (sortSelect) {
                sortSelect.value = param("sort") || "featured";
            }
            if (minInput) {
                minInput.value = param("min_price");
            }
            if (maxInput) {
                maxInput.value = param("max_price");
            }
            if (stockBox) {
                stockBox.checked = param("in_stock") === "1";
            }
            if (saleBox) {
                saleBox.checked = param("on_sale") === "1";
            }

            qsa("input[data-facet='category']", categoryHost).forEach(function (box) {
                box.checked = categories.indexOf(box.value) !== -1;
            });
            qsa("input[data-facet='brand']", brandHost).forEach(function (box) {
                box.checked = brands.indexOf(box.value) !== -1;
            });
        }

        function load(page) {
            var wanted = currentParams(page);
            ui.skeletons(results, 6);

            api.products(wanted)
                .then(function (payload) {
                    ui.renderProducts(results, payload.results);

                    if (countLabel) {
                        countLabel.textContent =
                            payload.count + " product" +
                            (payload.count === 1 ? "" : "s") +
                            (param("search")
                                ? ' matching "' + param("search") + '"'
                                : "");
                    }

                    ui.renderPagination(
                        paginationHost,
                        {
                            count: payload.count,
                            page: wanted.page,
                            pageSize: pageSize
                        },
                        function (nextPage) {
                            updateQuery({ page: nextPage });
                            load(nextPage);
                            window.scrollTo({ top: 0, behavior: "smooth" });
                        }
                    );

                    syncControls();
                })
                .catch(function (error) {
                    showApiWarning(error);
                    results.innerHTML = ui.emptyState(
                        "We could not load the catalogue",
                        error.message
                    );
                    if (countLabel) {
                        countLabel.textContent = "";
                    }
                });
        }

        function buildFacets() {
            if (categoryHost) {
                api.categories()
                    .then(function (categories) {
                        categoryHost.innerHTML = categories
                            .map(function (category) {
                                return (
                                    '<label class="check">' +
                                    '<input type="checkbox" data-facet="category" value="' +
                                    ui.escapeHtml(category.slug) + '">' +
                                    "<span>" + ui.escapeHtml(category.name) + "</span>" +
                                    '<span class="check-count">' +
                                    category.product_count + "</span></label>"
                                );
                            })
                            .join("");
                        syncControls();
                    })
                    .catch(function () {
                        categoryHost.innerHTML = "";
                    });
            }

            if (brandHost) {
                api.brands()
                    .then(function (brands) {
                        brandHost.innerHTML = brands
                            .filter(function (brand) {
                                return brand.product_count > 0;
                            })
                            .map(function (brand) {
                                return (
                                    '<label class="check">' +
                                    '<input type="checkbox" data-facet="brand" value="' +
                                    ui.escapeHtml(brand.slug) + '">' +
                                    "<span>" + ui.escapeHtml(brand.name) + "</span>" +
                                    '<span class="check-count">' +
                                    brand.product_count + "</span></label>"
                                );
                            })
                            .join("");
                        syncControls();
                    })
                    .catch(function () {
                        brandHost.innerHTML = "";
                    });
            }
        }

        function selectedValues(host, facet) {
            return qsa("input[data-facet='" + facet + "']", host)
                .filter(function (box) {
                    return box.checked;
                })
                .map(function (box) {
                    return box.value;
                });
        }

        document.addEventListener("change", function (event) {
            var box = event.target;

            if (box.matches("input[data-facet='category']")) {
                updateQuery({
                    category: selectedValues(categoryHost, "category"),
                    page: null
                });
                load(1);
                return;
            }
            if (box.matches("input[data-facet='brand']")) {
                updateQuery({
                    brand: selectedValues(brandHost, "brand"),
                    page: null
                });
                load(1);
                return;
            }
            if (box === stockBox) {
                updateQuery({ in_stock: box.checked ? "1" : null, page: null });
                load(1);
                return;
            }
            if (box === saleBox) {
                updateQuery({ on_sale: box.checked ? "1" : null, page: null });
                load(1);
                return;
            }
            if (box === sortSelect) {
                updateQuery({ sort: box.value, page: null });
                load(1);
            }
        });

        if (searchForm) {
            searchForm.addEventListener("submit", function (event) {
                event.preventDefault();
                updateQuery({
                    search: searchInput ? searchInput.value.trim() : null,
                    page: null
                });
                load(1);
            });
        }

        if (minInput) {
            minInput.addEventListener("change", function () {
                updateQuery({ min_price: minInput.value || null, page: null });
                load(1);
            });
        }

        if (maxInput) {
            maxInput.addEventListener("change", function () {
                updateQuery({ max_price: maxInput.value || null, page: null });
                load(1);
            });
        }

        if (clearButton) {
            clearButton.addEventListener("click", function () {
                window.history.pushState(null, "", window.location.pathname);
                syncControls();
                load(1);
            });
        }

        window.addEventListener("popstate", function () {
            syncControls();
            load(null);
        });

        buildFacets();
        syncControls();
        load(null);
    }

    /* -- product detail --------------------------------------------------- */
    function initProduct() {
        var root = qs("[data-product]");
        if (!root) {
            return;
        }

        var missing = qs("[data-product-missing]");
        var slug = param("slug");

        function showMissing(message) {
            root.hidden = true;
            if (missing) {
                missing.hidden = false;
                var note = qs("[data-product-missing-text]", missing);
                if (note) {
                    note.textContent = message;
                }
            }
        }

        if (!slug) {
            showMissing("No product was requested. Pick one from the catalogue.");
            return;
        }

        api.product(slug)
            .then(function (product) {
                root.hidden = false;
                if (missing) {
                    missing.hidden = true;
                }
                fill(product);
            })
            .catch(function (error) {
                showApiWarning(error);
                showMissing(
                    error.status === 404
                        ? "That product is no longer available."
                        : error.message
                );
            });

        function setText(selector, value) {
            var node = qs(selector, root);
            if (node) {
                node.textContent =
                    value === null || value === undefined ? "" : value;
            }
        }

        function setHtml(selector, value) {
            var node = qs(selector, root);
            if (node) {
                node.innerHTML = value;
            }
        }

        function priceMarkup(product) {
            var html =
                '<span class="price-now">' +
                ui.escapeHtml(store.money(product.price)) + "</span>";
            if (product.is_on_sale && product.compare_at_price) {
                html +=
                    '<span class="price-was">' +
                    ui.escapeHtml(store.money(product.compare_at_price)) +
                    "</span>" +
                    '<span class="price-off">Save ' +
                    ui.escapeHtml(product.discount_percent) + "%</span>";
            }
            return html;
        }

        function specsMarkup(specs) {
            var keys = Object.keys(specs || {});
            if (!keys.length) {
                return "";
            }
            return (
                '<table class="spec-table">' +
                '<caption class="visually-hidden">Specifications</caption>' +
                "<tbody>" +
                keys
                    .map(function (key) {
                        return (
                            '<tr><th scope="row">' + ui.escapeHtml(key) +
                            "</th><td>" + ui.escapeHtml(specs[key]) + "</td></tr>"
                        );
                    })
                    .join("") +
                "</tbody></table>"
            );
        }

        function fill(product) {
            document.title = product.name + " | GHOSTINC";

            var image = qs("[data-product-image]", root);
            if (image) {
                image.src = ui.asset(product.image);
                image.alt = product.name;
            }

            setText("[data-product-brand]", product.brand);
            setText("[data-product-name]", product.name);
            setText("[data-product-short]", product.short_description);
            setText("[data-product-description]", product.description);
            setText("[data-product-sku]", product.sku);
            setHtml("[data-product-price]", priceMarkup(product));

            setHtml(
                "[data-product-rating]",
                '<span class="rating-stars" aria-hidden="true">' +
                    ui.stars(product.rating) + "</span>" +
                    Number(product.rating).toFixed(1) + " out of 5 (" +
                    ui.escapeHtml(product.rating_count) + " reviews)"
            );

            var stockNode = qs("[data-product-stock]", root);
            if (stockNode) {
                stockNode.className =
                    "stock " +
                    (product.in_stock
                        ? product.low_stock ? "stock-low" : "stock-in"
                        : "stock-out");
                stockNode.textContent = product.stock_label;
            }

            setHtml("[data-product-specs]", specsMarkup(product.specs));

            var categoryLink = qs("[data-product-category-link]", root);
            if (categoryLink) {
                categoryLink.textContent = product.category;
                categoryLink.href =
                    "shop.html?category=" +
                    encodeURIComponent(product.category_slug);
            }

            var availability = qs("[data-product-availability]", root);
            if (availability) {
                availability.textContent =
                    product.in_stock
                        ? product.stock + " in stock, ready to ship"
                        : "Currently unavailable";
            }

            /* The one Add to cart button, carrying its own product data. */
            var addButton = qs("[data-add-to-cart]", root);
            if (addButton) {
                addButton.setAttribute("data-sku", product.sku);
                addButton.setAttribute("data-slug", product.slug);
                addButton.setAttribute("data-name", product.name);
                addButton.setAttribute("data-brand", product.brand);
                addButton.setAttribute("data-image", product.image);
                addButton.setAttribute("data-price", product.price);

                if (product.in_stock) {
                    addButton.disabled = false;
                    addButton.textContent = "Add to cart";
                } else {
                    addButton.disabled = true;
                    addButton.textContent = "Sold out";
                }
            }

            /* The related rail sits outside [data-product], so search the document. */
            var related = qs("[data-related]");
            var relatedSection = qs("[data-related-section]");
            if (related) {
                if (product.related && product.related.length) {
                    ui.renderProducts(related, product.related);
                    if (relatedSection) {
                        relatedSection.hidden = false;
                    }
                } else if (relatedSection) {
                    relatedSection.hidden = true;
                }
            }
        }

        /* -- quantity stepper --------------------------------------------- */
        var qtyInput = qs("[data-qty-input]", root);
        var minus = qs("[data-qty-minus]", root);
        var plus = qs("[data-qty-plus]", root);

        function step(delta) {
            if (!qtyInput) {
                return;
            }
            var value = parseInt(qtyInput.value, 10);
            if (!isFinite(value)) {
                value = 1;
            }
            value = value + delta;
            if (value < 1) {
                value = 1;
            }
            if (value > 99) {
                value = 99;
            }
            qtyInput.value = String(value);
        }

        if (minus) {
            minus.addEventListener("click", function () {
                step(-1);
            });
        }
        if (plus) {
            plus.addEventListener("click", function () {
                step(1);
            });
        }

        /* Tell ui.js where to read the quantity from on this page. */
        ui.setQuantitySource(function () {
            var value = parseInt(qtyInput ? qtyInput.value : "1", 10);
            return isFinite(value) && value > 0 ? value : 1;
        });
    }

    /* -- cart & checkout -------------------------------------------------- */
    function initCart() {
        var list = qs("[data-cart-items]");
        if (!list) {
            return;
        }

        var content = qs("[data-cart-content]");
        var empty = qs("[data-cart-empty]");
        var summaryHost = qs("[data-cart-summary]");
        var countLabel = qs("[data-cart-count-label]");
        var promoForm = qs("[data-promo-form]");
        var promoInput = qs("[data-promo-input]");
        var promoMessage = qs("[data-promo-msg]");
        var checkoutForm = qs("[data-checkout-form]");
        var checkoutStatus = qs("[data-checkout-status]");
        var checkoutButton = qs("[data-checkout-submit]");

        function lineMarkup(line) {
            return (
                '<li class="cart-row" data-row-sku="' +
                ui.escapeHtml(line.sku) + '">' +
                '<img class="cart-thumb" src="' +
                ui.escapeHtml(ui.asset(line.image)) + '" alt="' +
                ui.escapeHtml(line.name) + '">' +
                '<div class="cart-info">' +
                '<h3><a href="product.html?slug=' +
                encodeURIComponent(line.slug) + '">' + ui.escapeHtml(line.name) +
                "</a></h3>" +
                '<p class="product-desc">' + ui.escapeHtml(line.brand || "") +
                " &middot; " + ui.escapeHtml(line.sku) + "</p>" +
                '<div class="cart-line-actions">' +
                '<div class="qty">' +
                '<button class="qty-btn" type="button" data-line-dec' +
                ' aria-label="Decrease quantity">&minus;</button>' +
                '<input class="qty-input" type="text" inputmode="numeric"' +
                ' data-line-qty value="' + ui.escapeHtml(line.quantity) +
                '" aria-label="Quantity for ' + ui.escapeHtml(line.name) + '">' +
                '<button class="qty-btn" type="button" data-line-inc' +
                ' aria-label="Increase quantity">+</button>' +
                "</div>" +
                '<button class="remove-btn" type="button" data-remove="' +
                ui.escapeHtml(line.sku) + '">Remove</button>' +
                '<span class="cart-line-total" data-line-total>' +
                ui.escapeHtml(
                    store.money(Number(line.price) * Number(line.quantity))
                ) +
                "</span>" +
                "</div>" +
                '<p class="line-warning" data-line-warning hidden></p>' +
                "</div></li>"
            );
        }

        function render() {
            var lines = store.items();

            if (!lines.length) {
                if (content) {
                    content.hidden = true;
                }
                if (empty) {
                    empty.hidden = false;
                }
                return;
            }

            if (content) {
                content.hidden = false;
            }
            if (empty) {
                empty.hidden = true;
            }

            list.innerHTML = lines.map(lineMarkup).join("");

            if (countLabel) {
                var count = store.count();
                countLabel.textContent =
                    count + " item" + (count === 1 ? "" : "s");
            }

            if (promoInput && store.promo()) {
                promoInput.value = store.promo();
            }

            store
                .price()
                .then(function (quote) {
                    if (summaryHost) {
                        summaryHost.innerHTML =
                            ui.totalsMarkup(quote) +
                            '<p class="summary-note">Prices include 15% VAT. ' +
                            "Delivery is free over " +
                            ui.escapeHtml(
                                store.money(quote.free_shipping_threshold)
                            ) +
                            ", otherwise " +
                            ui.escapeHtml(store.money(quote.shipping_flat)) +
                            ".</p>";
                    }

                    /* Mark up any line the server says it cannot fill. */
                    quote.rows.forEach(function (row) {
                        var rowNode = qs('[data-row-sku="' + row.sku + '"]', list);
                        if (!rowNode) {
                            return;
                        }
                        var warning = qs("[data-line-warning]", rowNode);

                        if (row.available) {
                            rowNode.classList.remove("is-unavailable");
                            if (warning) {
                                warning.hidden = true;
                            }
                        } else {
                            rowNode.classList.add("is-unavailable");
                            if (warning) {
                                warning.hidden = false;
                                warning.textContent =
                                    "Only " + row.stock + " left, you asked for " +
                                    row.quantity + ".";
                            }
                        }
                    });

                    if (promoMessage) {
                        if (quote.promo_error) {
                            promoMessage.className = "promo-msg is-bad";
                            promoMessage.textContent = quote.promo_error;
                        } else if (quote.promo) {
                            promoMessage.className = "promo-msg is-ok";
                            promoMessage.textContent =
                                quote.promo.code + " applied: " +
                                quote.promo.percent_off + "% off.";
                        } else {
                            promoMessage.className = "promo-msg";
                            promoMessage.textContent = "";
                        }
                    }
                })
                .catch(function (error) {
                    if (summaryHost) {
                        summaryHost.innerHTML =
                            '<p class="form-status is-error">' +
                            ui.escapeHtml(error.message) + "</p>";
                    }
                });
        }

        list.addEventListener("click", function (event) {
            var row = event.target.closest("[data-row-sku]");
            if (!row) {
                return;
            }

            var sku = row.getAttribute("data-row-sku");
            var input = qs("[data-line-qty]", row);
            var current = parseInt(input ? input.value : "1", 10);

            if (!isFinite(current)) {
                current = 1;
            }

            if (event.target.closest("[data-line-dec]")) {
                store.setQuantity(sku, current - 1);
                return;
            }
            if (event.target.closest("[data-line-inc]")) {
                store.setQuantity(sku, current + 1);
            }
        });

        list.addEventListener("change", function (event) {
            var input = event.target.closest("[data-line-qty]");
            if (!input) {
                return;
            }
            var row = input.closest("[data-row-sku]");
            store.setQuantity(
                row.getAttribute("data-row-sku"),
                parseInt(input.value, 10)
            );
        });

        if (promoForm) {
            promoForm.addEventListener("submit", function (event) {
                event.preventDefault();
                var code = promoInput ? promoInput.value.trim() : "";

                if (!code) {
                    store.setPromo("");
                    render();
                    return;
                }

                api.validatePromo(code)
                    .then(function (result) {
                        store.setPromo(result.valid ? result.code : code);
                        if (promoMessage) {
                            promoMessage.className = result.valid
                                ? "promo-msg is-ok"
                                : "promo-msg is-bad";
                            promoMessage.textContent = result.valid
                                ? result.code + " applied: " + result.percent_off +
                                  "% off."
                                : result.detail;
                        }
                        render();
                    })
                    .catch(function (error) {
                        store.setPromo(code);
                        if (promoMessage) {
                            promoMessage.className = "promo-msg is-bad";
                            promoMessage.textContent = error.message;
                        }
                        render();
                    });
            });
        }

        /* -- checkout ------------------------------------------------------- */
        function noteError(message) {
            if (checkoutStatus) {
                checkoutStatus.className = "form-status is-error";
                checkoutStatus.textContent = message;
            }
            ui.toast(message, true);
        }

        if (checkoutForm) {
            checkoutForm.addEventListener("submit", function (event) {
                event.preventDefault();

                if (store.isEmpty()) {
                    noteError("Your cart is empty.");
                    return;
                }

                var form = checkoutForm;
                var payload = {
                    items: store.payload().items,
                    promo_code: store.promo(),
                    first_name: (form.elements.first_name.value || "").trim(),
                    last_name: (form.elements.last_name.value || "").trim(),
                    email: (form.elements.email.value || "").trim(),
                    phone: (form.elements.phone.value || "").trim(),
                    address_line1: (form.elements.address_line1.value || "").trim(),
                    address_line2: (form.elements.address_line2.value || "").trim(),
                    city: (form.elements.city.value || "").trim(),
                    province: (form.elements.province.value || "").trim(),
                    postal_code: (form.elements.postal_code.value || "").trim(),
                    notes: (form.elements.notes.value || "").trim()
                };

                if (checkoutButton) {
                    checkoutButton.disabled = true;
                    checkoutButton.textContent = "Placing your order\u2026";
                }
                if (checkoutStatus) {
                    checkoutStatus.className = "form-status";
                    checkoutStatus.textContent =
                        "Sending your order to the store\u2026";
                }

                api.placeOrder(payload)
                    .then(function (order) {
                        /* The server has the order, so the local cart is done. */
                        store.clear();
                        window.location.href =
                            "confirmation.html?order=" +
                            encodeURIComponent(order.order_number);
                    })
                    .catch(function (error) {
                        noteError(error.message);
                        if (checkoutButton) {
                            checkoutButton.disabled = false;
                            checkoutButton.textContent = "Place order";
                        }
                    });
            });
        }

        store.subscribe(render);
        render();
    }

    /* -- order confirmation ----------------------------------------------- */
    function initConfirmation() {
        var root = qs("[data-order]");
        if (!root) {
            return;
        }

        var missing = qs("[data-order-missing]");
        var number = param("order");

        function showMissing(message) {
            root.hidden = true;
            if (missing) {
                missing.hidden = false;
                var note = qs("[data-order-missing-text]", missing);
                if (note) {
                    note.textContent = message;
                }
            }
        }

        if (!number) {
            showMissing("No order reference was given.");
            return;
        }

        api.order(number)
            .then(function (order) {
                root.hidden = false;
                if (missing) {
                    missing.hidden = true;
                }
                fill(order);
            })
            .catch(function (error) {
                showApiWarning(error);
                showMissing(
                    error.status === 404
                        ? "We could not find an order with that reference."
                        : error.message
                );
            });

        function fill(order) {
            document.title = "Order " + order.order_number + " | GHOSTINC";

            function setText(selector, value) {
                var node = qs(selector, root);
                if (node) {
                    node.textContent =
                        value === null || value === undefined ? "" : value;
                }
            }

            setText("[data-order-number]", order.order_number);
            setText("[data-order-status]", order.status_label);
            setText(
                "[data-order-placed]",
                new Date(order.created_at).toLocaleString("en-ZA")
            );
            setText("[data-order-name]", order.customer_name);
            setText(
                "[data-order-address]",
                [
                    order.address_line1,
                    order.address_line2,
                    order.city,
                    order.province,
                    order.postal_code,
                    order.country
                ]
                    .filter(Boolean)
                    .join(", ")
            );
            setText("[data-order-email]", order.email);

            var items = qs("[data-order-items]", root);
            if (items) {
                items.innerHTML = order.items
                    .map(function (line) {
                        return (
                            '<li class="cart-row">' +
                            '<img class="cart-thumb" src="' +
                            ui.escapeHtml(ui.asset(line.image)) + '" alt="' +
                            ui.escapeHtml(line.product_name) + '">' +
                            '<div class="cart-info">' +
                            "<h3>" + ui.escapeHtml(line.product_name) + "</h3>" +
                            '<p class="product-desc">' +
                            ui.escapeHtml(line.product_sku) + " &middot; " +
                            ui.escapeHtml(store.money(line.unit_price)) +
                            " &times; " + ui.escapeHtml(line.quantity) + "</p>" +
                            '<div class="cart-line-actions"><span class="cart-line-total">' +
                            ui.escapeHtml(store.money(line.line_total)) +
                            "</span></div></div></li>"
                        );
                    })
                    .join("");
            }

            var totals = qs("[data-order-totals]", root);
            if (totals) {
                var rows =
                    '<div class="summary-row"><span>Subtotal</span><span>' +
                    ui.escapeHtml(store.money(order.subtotal)) + "</span></div>";

                if (Number(order.discount) > 0) {
                    rows +=
                        '<div class="summary-row is-discount"><span>Discount' +
                        (order.promo_code
                            ? " (" + ui.escapeHtml(order.promo_code) + ")"
                            : "") +
                        "</span><span>-" +
                        ui.escapeHtml(store.money(order.discount)) + "</span></div>";
                }

                rows +=
                    '<div class="summary-row"><span>Delivery</span><span>' +
                    (Number(order.shipping) > 0
                        ? ui.escapeHtml(store.money(order.shipping))
                        : "Free") +
                    "</span></div>" +
                    '<div class="summary-row"><span>VAT</span><span>' +
                    ui.escapeHtml(store.money(order.vat)) + "</span></div>" +
                    '<div class="summary-total"><span>Total paid</span><span>' +
                    ui.escapeHtml(store.money(order.total)) + "</span></div>";

                totals.innerHTML = rows;
            }
        }
    }

    /* -- contact ---------------------------------------------------------- */
    function initContact() {
        var form = qs("[data-contact-form]");
        if (!form) {
            return;
        }

        var status = qs("[data-contact-status]");
        var button = qs("[data-contact-submit]");

        form.addEventListener("submit", function (event) {
            event.preventDefault();

            var payload = {
                name: (form.elements.name.value || "").trim(),
                email: (form.elements.email.value || "").trim(),
                subject: (form.elements.subject.value || "").trim(),
                message: (form.elements.message.value || "").trim()
            };

            if (!payload.name || !payload.email || !payload.message) {
                if (status) {
                    status.className = "form-status is-error";
                    status.textContent = "Name, email and message are all required.";
                }
                return;
            }

            if (button) {
                button.disabled = true;
                button.textContent = "Sending\u2026";
            }
            if (status) {
                status.className = "form-status";
                status.textContent = "Sending your message\u2026";
            }

            api.contact(payload)
                .then(function () {
                    form.reset();
                    if (status) {
                        status.className = "form-status";
                        status.textContent = "Thanks - your message has been logged.";
                    }
                    ui.toast("Message sent. We will get back to you.");
                })
                .catch(function (error) {
                    if (status) {
                        status.className = "form-status is-error";
                        status.textContent = error.message;
                    }
                })
                .then(function () {
                    if (button) {
                        button.disabled = false;
                        button.textContent = "Send message";
                    }
                });
        });
    }

    /* -- bootstrap -------------------------------------------------------- */
    var PAGES = {
        home: initHome,
        shop: initShop,
        product: initProduct,
        cart: initCart,
        confirmation: initConfirmation,
        contact: initContact
    };

    function init() {
        stampYear();
        initTheme();
        initNavToggle();
        initActiveLink();
        ui.init();

        /* Fires immediately if the shop already dropped to offline data. */
        api.onOffline(showOfflineNotice);

        var controller = PAGES[document.body.getAttribute("data-page")];
        if (controller) {
            controller();
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})(window, document);
