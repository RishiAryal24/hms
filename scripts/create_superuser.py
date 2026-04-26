from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django_tenants.utils import schema_context
import os


class Command(BaseCommand):
    help = "Create superuser safely (public schema)"

    def handle(self, *args, **kwargs):
        User = get_user_model()

        username = os.environ.get("DJANGO_SUPERUSER_USERNAME", "admin")
        email = os.environ.get("DJANGO_SUPERUSER_EMAIL", "admin@hms.com")
        password = os.environ.get("DJANGO_SUPERUSER_PASSWORD", "Admin@12345")

        # 👇 Ensure it runs in PUBLIC schema
        with schema_context('public'):
            if not User.objects.filter(username=username).exists():
                User.objects.create_superuser(
                    username=username,
                    email=email,
                    password=password
                )
                self.stdout.write(self.style.SUCCESS("✅ Superuser created"))
            else:
                self.stdout.write("ℹ️ Superuser already exists")
