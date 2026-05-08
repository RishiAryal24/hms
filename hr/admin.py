from django.contrib import admin

from .models import DutyRoster, EmployeeProfile


@admin.register(EmployeeProfile)
class EmployeeProfileAdmin(admin.ModelAdmin):
    list_display = ["employee_code", "user", "designation", "employment_type", "status", "joining_date"]
    list_filter = ["employment_type", "status", "joining_date"]
    search_fields = ["employee_code", "user__first_name", "user__last_name", "user__username", "designation"]


@admin.register(DutyRoster)
class DutyRosterAdmin(admin.ModelAdmin):
    list_display = ["employee", "duty_date", "shift", "location", "department"]
    list_filter = ["shift", "location", "duty_date"]
    search_fields = ["employee__employee_code", "employee__user__first_name", "employee__user__last_name", "department"]
