# 🏥 HMS — Hospital Management System

> **⚠️ This project is currently under active development. Several modules are still being built and will be released progressively.**

A full-stack, multi-tenant Hospital Management System built with **Django** (backend) and **React + Vite** (frontend). Designed to support multiple hospitals from a single deployment using schema-based multi-tenancy via `django-tenants`.

---

## Tech Stack

### Backend
| Layer | Technology |
|---|---|
| Framework | Django 4.x + Django REST Framework |
| Multi-tenancy | django-tenants (PostgreSQL schema isolation) |
| Authentication | JWT via djangorestframework-simplejwt |
| Database | PostgreSQL |
| Filtering | django-filter |
| File handling | Pillow |

### Frontend
| Layer | Technology |
|---|---|
| Framework | React 18 + Vite |
| Routing | react-router-dom v6 |
| State Management | Zustand |
| HTTP Client | Axios (with JWT interceptors + auto-refresh) |
| Forms | react-hook-form |
| Date Utilities | dayjs |

---

## Architecture

```
HMS/
├── manage.py
├── hms/
│   ├── settings.py          # Main Django settings
│   ├── urls.py              # Tenant schema URL conf
│   └── urls_public.py       # Public schema URL conf
├── tenants/                 # SuperAdmin, Client, Domain models (PUBLIC schema)
├── core/                    # TimeStampedModel base class
├── accounts/                # User, Role, JWT auth (TENANT schema)
├── patients/                # Full patient management module
├── appointments/            # OPD appointments, queue, schedules
└── frontend/                # React + Vite SPA
    └── src/
        ├── api/             # Axios API layer (auth, patients, appointments)
        ├── store/           # Zustand auth store
        ├── components/ui/   # Shared UI component library
        ├── layouts/         # AppLayout with collapsible sidebar
        └── pages/
            ├── auth/        # Login
            ├── reception/   # Reception dashboard, patients, appointments
            ├── doctor/      # Doctor dashboard, patient detail, appointments
            └── admin/       # Admin dashboard, staff management
```

---

## Multi-Tenancy Setup

Each hospital runs as an isolated PostgreSQL schema. The public schema manages hospital registration (SuperAdmin), while tenant schemas contain all clinical data.

```
Public schema  →  tenants, django_admin (SuperAdmin only)
Tenant schema  →  accounts, patients, appointments, core
```

**Current Tenant:** `butwalhospital` at `http://butwalhospital.localhost:8000`

---

## User Roles & Access

| Role | Dashboard | Capabilities |
|---|---|---|
| `hospital_admin` | Admin | Full access — staff, patients, appointments, schedules |
| `doctor` | Doctor | Patient detail, vitals, notes, medications, allergies, appointments |
| `nurse` | Doctor | Vitals, patient view, appointments |
| `receptionist` | Reception | Register patients, book/cancel appointments, queue |
| `billing_staff` | Reception | Patient view, insurance |
| `pharmacist` | Reception | Patient view |
| `lab_technician` | Reception | Patient view |

---

## Completed Modules ✅

### Authentication
- JWT login / logout with token blacklist on refresh
- Role-based redirect after login
- Auto token refresh via Axios interceptor
- Staff management (create, update, deactivate, reset password)

### Patients
- Patient registration with auto-generated ID (`HMS-00001`)
- Emergency contacts, insurance, medical history
- Vitals recording (temp, BP, pulse, SpO₂, glucose, weight, height, BMI)
- Allergy tracking with severity levels
- Medication prescriptions
- Clinical notes (with confidentiality flag)
- Inpatient admissions with auto-generated admission number (`ADM-000001`)
- Patient documents and discharge

### Appointments (OPD)
- Appointment booking with doctor availability check
- Auto token number per doctor per day
- Appointment types: Walk-in, New Patient, Follow-up, Referral
- Follow-up appointment linking
- Cancel with reason
- Mark complete with diagnosis and follow-up instructions
- Doctor schedule management (weekly availability, slot duration)
- Doctor leave management
- Live queue management

### Frontend Dashboards
- **Reception** — stat overview, quick actions, today's appointments, recent patients
- **Doctor** — today's schedule, pending queue, patient detail with tabbed clinical view
- **Admin** — staff overview, quick actions, today's appointments

---

## Modules In Progress 🔧

| Module | Status |
|---|---|
| **Billing** | 📋 Planned — invoices, payments, insurance claims |
| **Pharmacy** | 📋 Planned — drug inventory, dispensing, prescriptions |
| **Laboratory** | 📋 Planned — test orders, results, reports |
| **Queue Display** | 📋 Planned — live reception queue screen |
| **Discharge Summary** | 📋 Planned — full discharge workflow |
| **Reports & Analytics** | 📋 Planned — revenue, patient statistics, occupancy |
| **Notifications** | 📋 Planned — appointment reminders, alerts |

---

## Getting Started

### Prerequisites
- Python 3.10+
- PostgreSQL 14+
- Node.js 18+

### Backend Setup

```powershell
# Create and activate virtual environment
python -m venv venv
venv\Scripts\activate

# Install dependencies
pip install django djangorestframework django-tenants psycopg2-binary \
  djangorestframework-simplejwt django-filter Pillow django-cors-headers

# Configure database in hms/settings.py
# Run migrations
python manage.py migrate_schemas --shared
python manage.py migrate_schemas

# Create public superadmin
python manage.py createsuperuser

# Create a tenant
python manage.py shell
# >>> from tenants.models import Client, Domain
# >>> t = Client(schema_name='butwalhospital', name='Butwal Hospital')
# >>> t.save()
# >>> Domain(domain='butwalhospital.localhost', tenant=t, is_primary=True).save()

# Start server
python manage.py runserver
```

### Frontend Setup

```powershell
cd frontend
npm install
npm run dev
```

Frontend runs at: `http://localhost:5173` (or `5174` if port is busy)

### Hosts File

Add this line to `C:\Windows\System32\drivers\etc\hosts`:

```
127.0.0.1    butwalhospital.localhost
```

---

## API Overview

```
POST   /api/auth/login/
POST   /api/auth/refresh/
POST   /api/auth/logout/
GET    /api/auth/me/
GET    /api/auth/staff/
POST   /api/auth/staff/
GET    /api/auth/roles/

GET    /api/patients/
POST   /api/patients/register/
GET    /api/patients/:id/
GET    /api/patients/:id/vitals/
POST   /api/patients/:id/vitals/
GET    /api/patients/:id/allergies/
GET    /api/patients/:id/medications/
GET    /api/patients/:id/notes/
GET    /api/patients/:id/admissions/

GET    /api/appointments/
POST   /api/appointments/book/
GET    /api/appointments/today/
GET    /api/appointments/availability/
POST   /api/appointments/:id/complete/
POST   /api/appointments/:id/cancel/
GET    /api/appointments/queue/
GET    /api/appointments/schedules/
GET    /api/appointments/leaves/
```

---

## Environment Notes

- `TIME_ZONE` is set to `Asia/Kathmandu`
- `CORS_ALLOW_ALL_ORIGINS = True` is enabled for local development — **restrict this in production**
- `SECRET_KEY` in `settings.py` must be changed before deploying to production
- Media files (`/media/`) are served locally — configure object storage (S3/R2) for production

---

## License

Internal project — Rishi Aryal. All rights reserved.