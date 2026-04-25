# ----------------------------------------------------------------------
# LOCATION: HMS/hms/urls.py
# ACTION:   REPLACE the entire contents of this file
# ----------------------------------------------------------------------
from django.http import HttpResponse
from django.urls import path

def home(request):
    return HttpResponse("HMS IS WORKING 🚀")

urlpatterns = [
    path('', home),
    path('admin/', admin.site.urls),
    path('api/auth/', include('accounts.urls')),
    path('api/patients/', include('patients.urls')),
    path('api/appointments/', include('appointments.urls')),
]
