import os
import sys
import django

# 👇 Force project root into Python path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)

# 👇 Now Django can find hms.settings
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "hms.settings")

django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()

username = "admin"
email = "admin@hms.com"
password = "Admin@12345"

if not User.objects.filter(username=username).exists():
    User.objects.create_superuser(
        username=username,
        email=email,
        password=password
    )
    print("✅ Superuser created")
else:
    print("ℹ️ Superuser already exists")
