# ----------------------------------------------------------------------
# LOCATION: HMS/hms/urls.py
# ACTION:   REPLACE the entire contents of this file
# ----------------------------------------------------------------------
from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse

def home(request):
    return JsonResponse({
        "message": "HMS API is running 🚀"
    })

urlpatterns = [
    path('', home),   # 👈 ADD THIS
    path('admin/', admin.site.urls),
    path('api/auth/',           include('accounts.urls')),
    path('api/patients/',       include('patients.urls')),
    path('api/appointments/',   include('appointments.urls')),
    path('api/inpatient/',      include('inpatient.urls')),
    path('api/billing/',        include('billing.urls')),
    path('api/clinical/',       include('clinical.urls')),
    path('api/lab/',            include('lab.urls')),

    
]
