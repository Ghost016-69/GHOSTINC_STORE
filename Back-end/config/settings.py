"""
Django settings for the GHOSTINC_STORE back end.

This mirrors the layout used by the other Django projects in this workspace
(the ``config`` project package plus a single API app), so the same habits
carry over: SQLite for development, django-cors-headers for the separately
served front end, and Django REST Framework serving the ``/api/`` routes.

For the full list of settings and their values, see
https://docs.djangoproject.com/en/6.0/ref/settings/
"""

import os
from pathlib import Path

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent


# Quick-start development settings - unsuitable for production --------------

# In production this must come from the environment. The development fallback
# keeps the project runnable out of the box, exactly like the other projects
# in this workspace.
SECRET_KEY = os.environ.get(
    "DJANGO_SECRET_KEY",
    "django-insecure-ghostinc-store-dev-key-change-me-before-deploying",
)

DEBUG = os.environ.get("DJANGO_DEBUG", "1") == "1"

ALLOWED_HOSTS = os.environ.get(
    "DJANGO_ALLOWED_HOSTS",
    "127.0.0.1,localhost",
).split(",")


# Application definition -----------------------------------------------------

INSTALLED_APPS = [
    "store",
    "corsheaders",
    "rest_framework",
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"


# Database -------------------------------------------------------------------

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}


# Password validation --------------------------------------------------------

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]


# Internationalization -------------------------------------------------------
# South African locale: ZAR prices, VAT and a sensible default time zone.

LANGUAGE_CODE = "en-za"
TIME_ZONE = "Africa/Johannesburg"
USE_I18N = True
USE_TZ = True


# Static files ---------------------------------------------------------------

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"


# CORS -----------------------------------------------------------------------
# The front end is plain static HTML served from its own little server
# (``python -m http.server 5500``), so it is always a different origin to the
# API on port 8000. Only the development origins are allowed; add the real
# deployment origin before going live.

CORS_ALLOWED_ORIGINS = [
    "http://127.0.0.1:5500",
    "http://localhost:5500",
    "http://127.0.0.1:8080",
    "http://localhost:8080",
]

# Extra origins can be added without editing this file, comma separated.
_extra_origins = os.environ.get("DJANGO_CORS_EXTRA_ORIGINS", "")
if _extra_origins:
    CORS_ALLOWED_ORIGINS += [o.strip() for o in _extra_origins.split(",") if o.strip()]

CORS_ALLOW_METHODS = ["GET", "POST", "OPTIONS"]


# Django REST Framework ------------------------------------------------------
# This is a public storefront API with no customer accounts yet, so anonymous
# visitors must be able to price a cart and place an order. Authentication is
# intentionally left empty: add SessionAuthentication (and CSRF) plus whatever
# token scheme is chosen once accounts exist.

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.AllowAny"],
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 12,
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
        "rest_framework.renderers.BrowsableAPIRenderer",
    ],
}


# Store settings -------------------------------------------------------------
# Money is handled as Decimal everywhere. 15% is the current South African VAT
# rate; the shipping figures below are the demo rules the front end mirrors.

STORE_VAT_RATE = os.environ.get("STORE_VAT_RATE", "0.15")
STORE_SHIPPING_FLAT = os.environ.get("STORE_SHIPPING_FLAT", "99.00")
STORE_FREE_SHIPPING_THRESHOLD = os.environ.get(
    "STORE_FREE_SHIPPING_THRESHOLD", "2500.00"
)
STORE_CURRENCY = "ZAR"

# Shown on the order confirmation screen so the demo is never mistaken for a
# real transaction.
STORE_DEMO_MODE = True