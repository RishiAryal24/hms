import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = 'django-insecure-change-this'
DEBUG = True
ALLOWED_HOSTS = ['localhost', '127.0.0.1', '.localhost']

# -----------------------
# APPS
# -----------------------
SHARED_APPS = [
    'django_tenants',

    'tenants',
    

    'django.contrib.contenttypes',
    'django.contrib.auth',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.admin',
    'django.contrib.staticfiles',

    'rest_framework',
]

TENANT_APPS = [
    'tenant_apps',
    'accounts',
]

# django-tenants requires this exact pattern — do NOT use SHARED_APPS + TENANT_APPS
INSTALLED_APPS = list(SHARED_APPS) + [app for app in TENANT_APPS if app not in SHARED_APPS]

# -----------------------
# TENANT SETTINGS
# -----------------------
TENANT_MODEL = "tenants.Client"
TENANT_DOMAIN_MODEL = "tenants.Domain"
DATABASE_ROUTERS = ('django_tenants.routers.TenantSyncRouter',)
PUBLIC_SCHEMA_NAME = 'public'

# -----------------------
# MIDDLEWARE
# -----------------------
MIDDLEWARE = [
    'django_tenants.middleware.main.TenantMainMiddleware',

    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'hms.urls'
WSGI_APPLICATION = 'hms.wsgi.application'

# -----------------------
# DATABASE
# -----------------------
DATABASES = {
    'default': {
        'ENGINE': 'django_tenants.postgresql_backend',
        'NAME': 'hms_db',
        'USER': 'postgres',
        'PASSWORD': '12345',
        'HOST': 'localhost',
        'PORT': '5432',
    }
}

# -----------------------
# AUTH
# -----------------------
# REPLACE WITH:
AUTH_USER_MODEL = 'accounts.User'  # tenant users
PUBLIC_SCHEMA_URLCONF = 'hms.urls_public'  # superadmin gets its own urls

# -----------------------
# TEMPLATES (Required for admin)
# -----------------------
TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],  # optional folder for custom templates
        'APP_DIRS': True,                   # must be True for admin templates
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',  # required by admin
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
TIME_ZONE = 'Asia/Kathmandu'
USE_I18N = True
USE_TZ = True

# -----------------------
# STATIC FILES
# -----------------------
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

# -----------------------
# DEFAULT PRIMARY KEY
# -----------------------
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

