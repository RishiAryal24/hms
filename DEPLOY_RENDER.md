# Deploying to Render

This repo is configured for a Render Blueprint with:

- `hms-api`: Django API web service
- `hms-frontend`: Vite React static site
- `hms-db`: Render PostgreSQL database

## Deploy

1. Push this repository to GitHub/GitLab/Bitbucket.
2. In Render, create a new Blueprint and select this repo.
3. Apply the blueprint from `render.yaml`.
4. After Render creates the services, confirm these environment variables:
   - `hms-api`: `DATABASE_URL`, `SECRET_KEY`, `DEBUG=False`
   - `hms-frontend`: `VITE_API_BASE_URL=https://hms-api-qv4m.onrender.com/api`
5. Add `HMS_ADMIN_PASSWORD` to the `hms-api` environment variables, then redeploy
   the API to create the initial tenant admin user.

If Render assigns a different service URL, update `VITE_API_BASE_URL`,
`CORS_ALLOWED_ORIGINS`, and `CSRF_TRUSTED_ORIGINS` to match the actual URLs.

## First Tenant

After the API deploy succeeds, open the Render Shell for `hms-api` and create a
tenant/domain that matches the API hostname:

```bash
python manage.py shell
```

```python
from tenants.models import Client, Domain

tenant = Client(schema_name="butwalhospital", name="Butwal Hospital")
tenant.save()
Domain.objects.create(
    domain="hms-api-qv4m.onrender.com",
    tenant=tenant,
    is_primary=True,
)
```

Use the real API hostname if Render gives your service a different URL.

## Initial Admin User

On the free Render plan, shell access is unavailable. Add these environment
variables to `hms-api`, then redeploy:

```env
HMS_ADMIN_USERNAME=admin
HMS_ADMIN_EMAIL=admin@example.com
HMS_ADMIN_PASSWORD=choose-a-strong-password
HMS_ADMIN_SUPERUSER=True
```

The deploy runs `python manage.py setup_render_admin` and creates the user in
the schema set by `TENANT_SCHEMA`.

To reset the password on a later deploy, temporarily add:

```env
HMS_ADMIN_RESET_PASSWORD=True
```

For true multi-tenant subdomains, add a custom domain or wildcard domain in
Render/DNS, then create one `Domain` row per tenant hostname.
