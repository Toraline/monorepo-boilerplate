"""Django settings of the server (apps/api).

Every value that differs per machine is read from the environment. On a local
machine the environment is the file .env in the root folder of the repository;
.env.example lists every variable with an invented sample value.
"""

from pathlib import Path

from django.core.exceptions import ImproperlyConfigured
from dotenv import load_dotenv

from config.env import env_bool, env_choice, env_int, env_list, env_required, env_text

BASE_DIR = Path(__file__).resolve().parent.parent
ROOT_DIR = BASE_DIR.parent.parent

# A variable that the environment already has wins over the same line of .env.
load_dotenv(ROOT_DIR / ".env")

# Local mode: the server runs on a developer's machine. It is off unless
# DJANGO_DEBUG says otherwise, so a server that has no .env is in the safe mode.
DEBUG = env_bool("DJANGO_DEBUG", default=False)
# The test runner turns DEBUG off. Code that asks "is this a local machine?"
# reads LOCAL_MODE, which keeps the value of DJANGO_DEBUG.
LOCAL_MODE = DEBUG

SAMPLE_VALUE_PREFIX = "sample-"

SECRET_KEY = env_required("DJANGO_SECRET_KEY")
if not LOCAL_MODE and SECRET_KEY.startswith(SAMPLE_VALUE_PREFIX):
    raise ImproperlyConfigured(
        "DJANGO_SECRET_KEY holds the sample value of .env.example and DJANGO_DEBUG is off. "
        "Fix: set DJANGO_SECRET_KEY to a long random value of your own."
    )

ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS", default="localhost,127.0.0.1")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "corsheaders",
    "apps.core",
    "apps.accounts",
    "apps.todos",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

# The pages of the Django admin. The requests under /api/ answer in JSON and use no template.
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

# The style sheets and scripts of the Django admin. In local mode "make run-api" serves them.
STATIC_URL = "static/"

WSGI_APPLICATION = "config.wsgi.application"

# PostgreSQL. The five POSTGRES_* variables are the ones docker-compose.yml uses.
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": env_required("POSTGRES_DB"),
        "USER": env_required("POSTGRES_USER"),
        "PASSWORD": env_required("POSTGRES_PASSWORD"),
        "HOST": env_required("POSTGRES_HOST"),
        "PORT": env_required("POSTGRES_PORT"),
        "OPTIONS": {"connect_timeout": 5},
    }
}

# A user is identified by an email (apps/accounts/models.py).
AUTH_USER_MODEL = "accounts.User"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# The first admin, created by "make seed" (apps/accounts/management/commands/seed_admin.py).
# The command refuses a password that starts with "sample-" when local mode is off.
SEED_ADMIN_EMAIL = env_text("SEED_ADMIN_EMAIL")
SEED_ADMIN_PASSWORD = env_text("SEED_ADMIN_PASSWORD")
SEED_ADMIN_NAME = env_text("SEED_ADMIN_NAME")

# The password of the 2 sample users of "make seed-sample"
# (apps/todos/management/commands/seed_sample.py). The command runs only in local mode.
SEED_SAMPLE_PASSWORD = env_text("SEED_SAMPLE_PASSWORD")

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# The server speaks JSON only. A request needs a login unless its view says
# otherwise. The login is the Django session, kept in a cookie.
REST_FRAMEWORK = {
    "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"],
    "DEFAULT_PARSER_CLASSES": ["rest_framework.parsers.JSONParser"],
    "DEFAULT_AUTHENTICATION_CLASSES": ["apps.core.authentication.CsrfSessionAuthentication"],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
}

# The web apps run on other addresses than the server (for example
# http://localhost:3000). WEB_ORIGINS lists the addresses whose pages may call
# the server from a browser with the cookies of the user.
WEB_ORIGINS = env_list("WEB_ORIGINS")
# CORS: the browser lets a page of these addresses read the answers of the server.
CORS_ALLOWED_ORIGINS = WEB_ORIGINS
CORS_ALLOW_CREDENTIALS = True
# CSRF: the server accepts a request that changes data from these addresses,
# when the request also carries the CSRF token.
CSRF_TRUSTED_ORIGINS = WEB_ORIGINS

# The cookies: "sessionid" (the login) and "csrftoken". apps/api/README.md explains them.
# JavaScript cannot read the session cookie.
SESSION_COOKIE_HTTPONLY = True
# How long a login lasts, in seconds. The default is 14 days.
SESSION_COOKIE_AGE = env_int("SESSION_COOKIE_AGE", default=60 * 60 * 24 * 14)
# Secure: the browser sends the cookies only over https. On unless local mode is on.
COOKIE_SECURE = env_bool("COOKIE_SECURE", default=not LOCAL_MODE)
SESSION_COOKIE_SECURE = COOKIE_SECURE
CSRF_COOKIE_SECURE = COOKIE_SECURE
# SameSite: "Lax" when the web apps and the server share one site (localhost,
# or two subdomains of one domain). "None" when they are on different sites.
COOKIE_SAMESITE = env_choice("COOKIE_SAMESITE", default="Lax", choices=("Lax", "Strict", "None"))
if COOKIE_SAMESITE == "None" and not COOKIE_SECURE:
    raise ImproperlyConfigured(
        "COOKIE_SAMESITE=None needs COOKIE_SECURE=True: browsers refuse a cookie "
        "that has SameSite=None and is not Secure."
    )
SESSION_COOKIE_SAMESITE = COOKIE_SAMESITE
CSRF_COOKIE_SAMESITE = COOKIE_SAMESITE
