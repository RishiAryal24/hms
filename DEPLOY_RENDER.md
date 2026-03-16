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
   - `hms-frontend`: `VITE_API_BASE_URL=https://hms-api.onrender.com/api`

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
    domain="hms-api.onrender.com",
    tenant=tenant,
    is_primary=True,
)
```

Use the real API hostname if Render gives your service a different URL.

For true multi-tenant subdomains, add a custom domain or wildcard domain in
Render/DNS, then create one `Domain` row per tenant hostname.
