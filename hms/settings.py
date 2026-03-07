# ----------------------------------------------------------------------
# LOCATION: HMS/hms/settings.py
# ACTION:   REPLACE the entire contents of this file
# ----------------------------------------------------------------------

import os
from pathlib import Path
from datetime import timedelta

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = 'django-insecure-change-this'
DEBUG = True
ALLOWED_HOSTS = ['localhost', '127.0.0.1', '.localhost']

# -----------------------
# APPS
# -----------------------
SHARED_APPS = [
    'django_tenants',

    'tenants',           # SuperAdmin, Client, Domain — public schema

    'django.contrib.contenttypes',
    'django.contrib.auth',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.admin',
    'django.contrib.staticfiles',

    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'django_filters',
    'corsheaders',
]

TENANT_APPS = [
    'tenant_apps',
    'core',              # TimeStampedModel base
    'accounts',          # User, Role
    'patients',          # Patient module
    'appointments',      # Appointments module
]

INSTALLED_APPS = list(SHARED_APPS) + [app for app in TENANT_APPS if app not in SHARED_APPS]

# -----------------------
# TENANT SETTINGS
# -----------------------
TENANT_MODEL        = "tenants.Client"
TENANT_DOMAIN_MODEL = "tenants.Domain"
DATABASE_ROUTERS    = ('django_tenants.routers.TenantSyncRouter',)
PUBLIC_SCHEMA_NAME  = 'public'

# -----------------------
# MIDDLEWARE
# -----------------------
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django_tenants.middleware.main.TenantMainMiddleware',

    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF      = 'hms.urls'
WSGI_APPLICATION  = 'hms.wsgi.application'

# -----------------------
# DATABASE
# -----------------------
DATABASES = {
    'default': {
        'ENGINE':   'django_tenants.postgresql_backend',
        'NAME':     'hms_db',
        'USER':     'postgres',
        'PASSWORD': '12345',
        'HOST':     'localhost',
        'PORT':     '5432',
    }
}

# -----------------------
# AUTH
# -----------------------
AUTH_USER_MODEL       = 'accounts.User'
PUBLIC_SCHEMA_URLCONF = 'hms.urls_public'

# -----------------------
# JWT SETTINGS
# -----------------------
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME':    timedelta(hours=8),
    'REFRESH_TOKEN_LIFETIME':   timedelta(days=30),
    'ROTATE_REFRESH_TOKENS':    True,
    'BLACKLIST_AFTER_ROTATION': True,
    'ALGORITHM':                'HS256',
    'SIGNING_KEY':              SECRET_KEY,
    'AUTH_HEADER_TYPES':        ('Bearer',),
    'USER_ID_FIELD':            'id',
    'USER_ID_CLAIM':            'user_id',
}

# -----------------------
# REST FRAMEWORK
# -----------------------
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
}

# -----------------------
# CORS
# -----------------------
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True

# -----------------------
# TEMPLATES
# -----------------------
TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS':    [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

# -----------------------
# INTERNATIONALIZATION
# -----------------------
LANGUAGE_CODE = 'en-us'
TIME_ZONE     = 'Asia/Kathmandu'
USE_I18N      = True
USE_TZ        = True

# -----------------------
# STATIC & MEDIA
# -----------------------
STATIC_URL  = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

MEDIA_URL  = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# -----------------------
# DEFAULT PRIMARY KEY
# -----------------------
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'