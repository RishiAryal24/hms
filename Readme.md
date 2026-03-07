# 🏥 Multi-Tenant Hospital Management System (HMS)

A production-ready, schema-isolated multi-tenant Hospital Management System built with **Django**, **Django REST Framework**, and **PostgreSQL**. Each hospital operates in its own dedicated PostgreSQL schema, ensuring complete data isolation, independent administration, and role-based access control (RBAC).

---

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture Overview](#architecture-overview)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation & Setup](#installation--setup)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Running the Project](#running-the-project)
- [Admin Hierarchy](#admin-hierarchy)
- [API Overview](#api-overview)
- [Multi-Tenancy: How It Works](#multi-tenancy-how-it-works)
- [Role-Based Access Control (RBAC)](#role-based-access-control-rbac)
- [VS Code Setup](#vs-code-setup)
- [Management Commands](#management-commands)
- [Contributing](#contributing)

---

## ✨ Features

- **Schema-based multi-tenancy** — each hospital gets its own isolated PostgreSQL schema
- **Super Admin** — platform-level admin for tenant creation, subscription management, and cross-tenant analytics
- **Tenant Admin** — per-hospital admin for managing users, roles, and permissions
- **Role-Based Access Control (RBAC)** — granular roles: Doctor, Nurse, Receptionist, Pharmacist, Lab Technician, Billing Staff, IT Support
- **JWT Authentication** — secure, stateless token-based auth with refresh token rotation
- **Modular HMS Modules** — Patients, Doctors, Appointments, Billing, Pharmacy
- **REST API** with OpenAPI/Swagger documentation via drf-spectacular
- **Subdomain routing** — `hospital-a.yourhms.com` automatically routes to Hospital A's schema

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Backend Framework | Django 4.2+ |
| API | Django REST Framework |
| Multi-tenancy | django-tenants |
| Database | PostgreSQL 14+ |
| Authentication | JWT (djangorestframework-simplejwt) |
| API Docs | drf-spectacular (Swagger/OpenAPI) |
| Dev Environment | VS Code |
| Language | Python 3.11+ |

---

## 🏗 Architecture Overview

```
PostgreSQL Database: hms_db
├── public schema          → Super admin, tenant registry, domain routing
│   ├── tenants_hospital
│   └── tenants_domain
│
├── hospital_a schema      → Hospital A — fully isolated
│   ├── accounts_user
│   ├── patients_patient
│   ├── doctors_doctor
│   └── ...
│
└── hospital_b schema      → Hospital B — fully isolated
    ├── accounts_user
    ├── patients_patient
    └── ...
```

**Request routing:**

```
hospital-a.yourhms.com  →  Middleware  →  SET search_path = hospital_a
hospital-b.yourhms.com  →  Middleware  →  SET search_path = hospital_b
yourhms.com             →  Middleware  →  SET search_path = public  (Super Admin)
```

---

## 📁 Project Structure

```
hms_project/
├── config/
│   ├── settings/
│   │   ├── base.py
│   │   ├── development.py
│   │   └── production.py
│   ├── urls.py
│   └── wsgi.py
├── apps/
│   ├── tenants/           # Tenant model, super-admin API
│   ├── accounts/          # Custom User model, roles, permissions
│   ├── patients/          # Patient records
│   ├── doctors/           # Doctor profiles
│   ├── appointments/      # Appointment scheduling
│   ├── billing/           # Invoices and payments
│   └── pharmacy/          # Medication and inventory
├── shared/
│   ├── middleware.py
│   ├── permissions.py     # IsSuperAdmin, IsTenantAdmin, role_required()
│   └── utils.py
├── .env
├── manage.py
└── requirements.txt
```

---

## ✅ Prerequisites

- Python 3.11+
- PostgreSQL 14+
- Node.js (optional, for frontend tooling)
- Git

---

## ⚙️ Installation & Setup

### 1. Clone the repository

```bash
git clone https://github.com/your-org/hms-multitenant.git
cd hms-multitenant
```

### 2. Create and activate a virtual environment

```bash
python -m venv venv

# macOS / Linux
source venv/bin/activate

# Windows
venv\Scripts\activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

---

## 🔐 Environment Variables

Create a `.env` file in the project root:

```env
# Django
SECRET_KEY=your-secret-key-here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1,.yourhms.com

# Database
DB_NAME=hms_db
DB_USER=postgres
DB_PASSWORD=yourpassword
DB_HOST=localhost
DB_PORT=5432

# JWT
JWT_ACCESS_TOKEN_LIFETIME_HOURS=8
JWT_REFRESH_TOKEN_LIFETIME_DAYS=1

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:3000,https://yourhms.com
```

---

## 🗄 Database Setup

### 1. Create the PostgreSQL database

```bash
psql -U postgres
CREATE DATABASE hms_db;
\q
```

### 2. Run migrations

```bash
# Migrate the public (shared) schema first
python manage.py migrate_schemas --shared

# Migrate all tenant schemas
python manage.py migrate_schemas
```

### 3. Create the public tenant

```bash
python manage.py create_public_tenant
```

### 4. Create the Super Admin user

```bash
python manage.py createsuperuser
```

---

## 🚀 Running the Project

```bash
python manage.py runserver
```

Access the API docs at: `http://localhost:8000/api/docs/`

Access the Django admin at: `http://localhost:8000/admin/`

---

## 👑 Admin Hierarchy

| Role | Access Scope | Capabilities |
|---|---|---|
| **Super Admin** | `yourhms.com` (public schema) | Create/disable hospitals, manage subscriptions, view cross-tenant statistics |
| **Hospital Admin** | `hospital-a.yourhms.com` (tenant schema) | Create/manage users, assign roles, access all HMS modules for their hospital |
| **Doctor** | Tenant schema | Access patient records, appointments, medical notes |
| **Nurse** | Tenant schema | Patient care, ward management |
| **Receptionist** | Tenant schema | Appointment booking, patient registration |
| **Pharmacist** | Tenant schema | Pharmacy and medication management |
| **Lab Technician** | Tenant schema | Lab orders and results |
| **Billing Staff** | Tenant schema | Invoices, payments, financial reports |

---

## 🌐 API Overview

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/login/` | Obtain JWT access + refresh tokens |
| POST | `/api/auth/refresh/` | Refresh access token |
| POST | `/api/auth/logout/` | Revoke refresh token |

### Super Admin — Tenant Management

> Accessible only at `yourhms.com` by superusers.

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/super-admin/tenants/` | List all hospitals |
| POST | `/api/super-admin/tenants/` | Create a new hospital + schema + admin user |
| GET | `/api/super-admin/tenants/{id}/` | Get hospital details |
| PATCH | `/api/super-admin/tenants/{id}/` | Update hospital info |
| DELETE | `/api/super-admin/tenants/{id}/` | Deactivate hospital |
| GET | `/api/super-admin/stats/` | Cross-tenant statistics |

### Hospital Admin — User Management

> Accessible only to `is_tenant_admin` users within their tenant schema.

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/users/` | List all users in this hospital |
| POST | `/api/users/` | Create a new user |
| GET | `/api/users/{id}/` | Get user details |
| PATCH | `/api/users/{id}/` | Update user |
| DELETE | `/api/users/{id}/` | Deactivate user |
| POST | `/api/users/{id}/assign-role/` | Assign role to user |
| GET | `/api/users/roles/` | List available roles |

### HMS Modules (per tenant)

| Module | Base Endpoint |
|---|---|
| Patients | `/api/patients/` |
| Doctors | `/api/doctors/` |
| Appointments | `/api/appointments/` |
| Billing | `/api/billing/` |
| Pharmacy | `/api/pharmacy/` |

Full interactive API documentation is available at `/api/docs/` (Swagger UI).

---

## 🔄 Multi-Tenancy: How It Works

This project uses [django-tenants](https://django-tenants.readthedocs.io/), which leverages **PostgreSQL schemas** for isolation.

1. **Tenant Creation** — When a new hospital is created via the Super Admin API, `django-tenants` automatically creates a new PostgreSQL schema and runs all tenant-app migrations inside it.
2. **Request Routing** — The `TenantMainMiddleware` inspects the incoming subdomain (e.g., `hospital-a.yourhms.com`) and sets `search_path` to the matching schema for the duration of the request.
3. **Shared vs Tenant Apps** — Apps listed in `SHARED_APPS` (e.g., `tenants`) live in the `public` schema. Apps in `TENANT_APPS` (e.g., `patients`, `accounts`) are replicated per schema.
4. **Cross-schema queries** — Use `schema_context(schema_name)` to programmatically query a specific tenant's schema.

---

## 🛡 Role-Based Access Control (RBAC)

Permissions are enforced using custom DRF permission classes in `shared/permissions.py`.

```python
# Protect a view to super admins only
class MyView(APIView):
    permission_classes = [IsSuperAdmin]

# Protect a view to hospital admins only
class MyView(APIView):
    permission_classes = [IsTenantAdmin]

# Protect a view to specific roles
class MyView(APIView):
    permission_classes = [role_required('doctor', 'nurse')]
```

Hospital Admins bypass all role checks within their own schema and have full access.

---

## 🖥 VS Code Setup

Install the recommended extensions:

- **Python** (ms-python.python)
- **Pylance** (ms-python.vscode-pylance)
- **Django** (batisteo.vscode-django)
- **Black Formatter** (ms-python.black-formatter)
- **GitLens**

Add to `.vscode/settings.json`:

```json
{
    "python.analysis.extraPaths": ["./apps"],
    "python.defaultInterpreterPath": "./venv/bin/python",
    "editor.formatOnSave": true,
    "[python]": {
        "editor.defaultFormatter": "ms-python.black-formatter"
    },
    "python.analysis.typeCheckingMode": "basic"
}
```

---

## 🔧 Management Commands

| Command | Description |
|---|---|
| `python manage.py create_public_tenant` | Creates the public schema and domain |
| `python manage.py migrate_schemas --shared` | Runs migrations on the public schema |
| `python manage.py migrate_schemas` | Runs migrations on all tenant schemas |
| `python manage.py createsuperuser` | Creates a Django superuser (Super Admin) |
| `python manage.py tenant_command <schema> <command>` | Run any management command inside a specific tenant schema |

**Example — create a shell inside a specific tenant schema:**

```bash
python manage.py tenant_command hospital_a shell
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Commit your changes: `git commit -m 'Add some feature'`
4. Push to the branch: `git push origin feature/your-feature-name`
5. Open a Pull Request

Please follow PEP8 and run `black .` before submitting.

---

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

> Built with Django, django-tenants, and PostgreSQL. Designed for healthcare providers who need scalable, isolated, and secure multi-hospital management.