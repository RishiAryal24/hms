from django.contrib import admin

from .models import DoctorProfile, NurseProfile


@admin.register(DoctorProfile)
class DoctorProfileAdmin(admin.ModelAdmin):
    list_display = ["user", "specialty", "department", "license_number", "consultation_fee", "is_available"]
    list_filter = ["specialty", "department", "is_available"]
    search_fields = ["user__first_name", "user__last_name", "user__username", "license_number", "specialty"]


@admin.register(NurseProfile)
class NurseProfileAdmin(admin.ModelAdmin):
    list_display = ["user", "ward", "department", "registration_number", "shift", "is_charge_nurse", "is_available"]
    list_filter = ["ward", "department", "shift", "is_charge_nurse", "is_available"]
    search_fields = ["user__first_name", "user__last_name", "user__username", "registration_number", "ward"]
