from django.urls import path
from . import views

urlpatterns = [
    path('', views.diagnosis_list, name='diagnosis_list'),
    path('<int:pk>/', views.diagnosis_detail, name='diagnosis_detail'),
    path('new/', views.diagnosis_create, name='diagnosis_create'),
    path('<int:pk>/edit/', views.diagnosis_update, name='diagnosis_update'),
    path('<int:pk>/delete/', views.diagnosis_delete, name='diagnosis_delete'),
]
