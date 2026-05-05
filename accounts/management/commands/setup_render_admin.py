import os

from django.core.management.base import BaseCommand
from django_tenants.utils import schema_context

from accounts.models import Role, User


class Command(BaseCommand):
    help = "Create or update the default tenant admin user for Render deployments."

    def handle(self, *args, **options):
        schema_name = os.environ.get("TENANT_SCHEMA", "butwalhospital")
        username = os.environ.get("HMS_ADMIN_USERNAME", "admin")
        email = os.environ.get("HMS_ADMIN_EMAIL", "admin@example.com")
        password = os.environ.get("HMS_ADMIN_PASSWORD")
        reset_password = os.environ.get("HMS_ADMIN_RESET_PASSWORD", "False").lower() == "true"
        is_superuser = os.environ.get("HMS_ADMIN_SUPERUSER", "True").lower() == "true"

        if not password:
            self.stdout.write(
                self.style.WARNING(
                    "HMS_ADMIN_PASSWORD is not set; skipping tenant admin setup."
                )
            )
            return

        with schema_context(schema_name):
            role, _ = Role.objects.get_or_create(name="hospital_admin")
            user, created = User.objects.get_or_create(
                username=username,
                defaults={
                    "email": email,
                    "role": role,
                    "is_tenant_admin": True,
                    "is_staff": True,
                    "is_superuser": is_superuser,
                    "is_active": True,
                },
            )

            user.email = email
            user.role = role
            user.is_tenant_admin = True
            user.is_staff = True
            user.is_superuser = is_superuser
            user.is_active = True

            if created or reset_password:
                user.set_password(password)

            user.save()

        action = "Created" if created else "Updated"
        self.stdout.write(
            self.style.SUCCESS(
                f"{action} tenant admin '{username}' in schema '{schema_name}'."
            )
        )
