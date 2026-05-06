from django.urls import path

from . import views

urlpatterns = [
    path("options/", views.ClinicalStaffOptionsView.as_view(), name="clinical-options"),
    path("doctors/", views.DoctorProfileListCreateView.as_view(), name="doctor-profile-list"),
    path("doctors/<int:pk>/", views.DoctorProfileDetailView.as_view(), name="doctor-profile-detail"),
    path("nurses/", views.NurseProfileListCreateView.as_view(), name="nurse-profile-list"),
    path("nurses/<int:pk>/", views.NurseProfileDetailView.as_view(), name="nurse-profile-detail"),
]
