from django.urls import path
from . import views

urlpatterns = [
    path('', views.admission_list, name='admission_list'),
    path('discharges/', views.discharge_list, name='discharge_list'),
    path('<int:pk>/', views.admission_detail, name='admission_detail'),
    path('new/', views.admission_create, name='admission_create'),
    path('<int:pk>/edit/', views.admission_update, name='admission_update'),
    path('<int:pk>/delete/', views.admission_delete, name='admission_delete'),
    path('<int:pk>/discharge/', views.discharge_patient, name='discharge_patient'),
    
]
