# patients/urls.py
from django.urls import path
from . import views

urlpatterns = [
    path('', views.patient_list, name='patient_list'),
    path('register/', views.patient_register, name='patient_register'),
    path('<int:patient_id>/', views.patient_detail, name='patient_detail'),
]

