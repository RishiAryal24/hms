from django.urls import path

from . import views

urlpatterns = [
    path("summary/", views.HRSummaryView.as_view(), name="hr-summary"),
    path("options/", views.HROptionsView.as_view(), name="hr-options"),
    path("employees/", views.EmployeeProfileListCreateView.as_view(), name="employee-list"),
    path("employees/<int:pk>/", views.EmployeeProfileDetailView.as_view(), name="employee-detail"),
    path("rosters/", views.DutyRosterListCreateView.as_view(), name="roster-list"),
    path("rosters/<int:pk>/", views.DutyRosterDetailView.as_view(), name="roster-detail"),
    path("attendance/", views.AttendanceRecordListCreateView.as_view(), name="attendance-list"),
    path("attendance/<int:pk>/", views.AttendanceRecordDetailView.as_view(), name="attendance-detail"),
    path("leaves/", views.LeaveRequestListCreateView.as_view(), name="leave-list"),
    path("leaves/<int:pk>/", views.LeaveRequestDetailView.as_view(), name="leave-detail"),
]
