# scripts/clean_setup.py

import os
import django
from django.core.management import call_command
from django.db import connection

# Set the Django settings module
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "hms.settings")
django.setup()

from tenants.models import Client, Domain  # Shared schema models
from django.contrib.auth import get_user_model

def drop_public_schema():
    """Drop public schema and recreate it"""
    with connection.cursor() as cursor:
        cursor.execute("DROP SCHEMA public CASCADE;")
        cursor.execute("CREATE SCHEMA public;")
        print("[INFO] Dropped and recreated public schema")

def run_shared_migrations():
    """Run shared apps migrations"""
    print("[INFO] Running shared migrations...")
    call_command("makemigrations", "accounts", "tenants", verbosity=1)
    call_command("migrate_schemas", "--shared", verbosity=1)
    print("[INFO] Shared migrations done")

def create_tenant(schema_name="hospital1", name="Hospital 1", domain_url="hospital1.localhost"):
    """Create a sample tenant"""
    tenant = Client(schema_name=schema_name, name=name)
    tenant.save()
    domain = Domain()
    domain.domain = domain_url
    domain.tenant = tenant
    domain.is_primary = True
    domain.save()
    print(f"[INFO] Tenant '{name}' created with schema '{schema_name}' and domain '{domain_url}'")
    return tenant

def run_tenant_migrations():
    """Run tenant apps migrations"""
    print("[INFO] Running tenant migrations...")
    call_command("makemigrations", "tenant_apps", verbosity=1)
    call_command("migrate_schemas", verbosity=1)
    print("[INFO] Tenant migrations done")

def create_super_admin():
    """Create a shared super-admin"""
    User = get_user_model()
    if not User.objects.filter(username="admin").exists():
        User.objects.create_superuser("admin", "admin@example.com", "admin123")
        print("[INFO] Super-admin created: username=admin password=admin123")
    else:
        print("[INFO] Super-admin already exists")

if __name__ == "__main__":
    drop_public_schema()
    run_shared_migrations()
    tenant = create_tenant()
    run_tenant_migrations()
    create_super_admin()
    print("[INFO] Clean HMS setup completed!")