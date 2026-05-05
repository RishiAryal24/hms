import os

from django.core.management.base import BaseCommand

from tenants.models import Client, Domain


class Command(BaseCommand):
    help = "Create or update the default tenant/domain for Render deployments."

    def handle(self, *args, **options):
        schema_name = os.environ.get("TENANT_SCHEMA", "butwalhospital")
        tenant_name = os.environ.get("TENANT_NAME", "Butwal Hospital")
        domain_name = (
            os.environ.get("TENANT_DOMAIN")
            or os.environ.get("RENDER_EXTERNAL_HOSTNAME")
            or os.environ.get("RENDER_SERVICE_NAME")
        )

        if not domain_name:
            self.stdout.write(
                self.style.WARNING(
                    "TENANT_DOMAIN or RENDER_EXTERNAL_HOSTNAME is not set; "
                    "skipping tenant domain setup."
                )
            )
            return

        domain_name = domain_name.replace("https://", "").replace("http://", "").strip("/")

        tenant, created = Client.objects.get_or_create(
            schema_name=schema_name,
            defaults={"name": tenant_name},
        )
        if not created and tenant.name != tenant_name:
            tenant.name = tenant_name
            tenant.save(update_fields=["name"])

        Domain.objects.update_or_create(
            domain=domain_name,
            defaults={"tenant": tenant, "is_primary": True},
        )

        action = "Created" if created else "Updated"
        self.stdout.write(
            self.style.SUCCESS(
                f"{action} tenant '{schema_name}' for domain '{domain_name}'."
            )
        )
