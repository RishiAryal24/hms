#!/usr/bin/env bash
set -o errexit

pip install -r requirements.txt
python manage.py collectstatic --no-input
python manage.py migrate_schemas --shared
python manage.py migrate_schemas
python manage.py setup_render_tenant
python manage.py setup_render_admin
