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
]
