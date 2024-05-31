# opd/urls.py
from django.urls import path
from . import views

urlpatterns = [
    path('', views.appointment_list, name='appointment_list'),
    path('create/', views.appointment_create, name='appointment_create'),
    path('<int:appointment_id>/', views.appointment_detail, name='appointment_detail'),
]
