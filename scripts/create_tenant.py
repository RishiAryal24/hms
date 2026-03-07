import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "hms.settings")
django.setup()

from tenants.models import Client, Domain

tenant = Client(schema_name='hospital1', name='Hospital 1')
tenant.save()

domain = Domain(domain='hospital1.localhost', tenant=tenant, is_primary=True)
domain.save()

print("Tenant hospital1 created successfully!")
