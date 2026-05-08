from django.contrib import admin

from .models import AttendanceRecord, DutyRoster, EmployeeProfile, LeaveRequest


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


@admin.register(AttendanceRecord)
class AttendanceRecordAdmin(admin.ModelAdmin):
    list_display = ["employee", "attendance_date", "status", "check_in", "check_out", "recorded_by"]
    list_filter = ["status", "attendance_date"]
    search_fields = ["employee__employee_code", "employee__user__first_name", "employee__user__last_name"]


@admin.register(LeaveRequest)
class LeaveRequestAdmin(admin.ModelAdmin):
    list_display = ["employee", "leave_type", "start_date", "end_date", "status", "approved_by"]
    list_filter = ["leave_type", "status", "start_date"]
    search_fields = ["employee__employee_code", "employee__user__first_name", "employee__user__last_name", "reason"]
