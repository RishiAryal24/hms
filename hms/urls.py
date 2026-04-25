# ----------------------------------------------------------------------
# LOCATION: HMS/hms/urls.py
# ACTION:   REPLACE the entire contents of this file
# ----------------------------------------------------------------------
from django.http import JsonResponse
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('', lambda request: JsonResponse({
        "status": "HMS API is running 🚀",
        "endpoints": {
            "auth": "/api/auth/",
            "patients": "/api/patients/",
            "appointments": "/api/appointments/",
            "admin": "/admin/"
        }
    })),

    path('admin/',              admin.site.urls),
    path('api/auth/',           include('accounts.urls')),
    path('api/patients/',       include('patients.urls')),
    path('api/appointments/',   include('appointments.urls')),
]
