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

    
]
