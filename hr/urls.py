from django.urls import path

from . import views

urlpatterns = [
    path("summary/", views.HRSummaryView.as_view(), name="hr-summary"),
    path("options/", views.HROptionsView.as_view(), name="hr-options"),
    path("employees/", views.EmployeeProfileListCreateView.as_view(), name="employee-list"),
    path("employees/<int:pk>/", views.EmployeeProfileDetailView.as_view(), name="employee-detail"),
    path("rosters/", views.DutyRosterListCreateView.as_view(), name="roster-list"),
    path("rosters/<int:pk>/", views.DutyRosterDetailView.as_view(), name="roster-detail"),
]
