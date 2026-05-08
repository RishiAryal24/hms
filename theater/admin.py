from django.contrib import admin

from .models import OperatingRoom, Procedure, TheaterBooking


@admin.register(Procedure)
class ProcedureAdmin(admin.ModelAdmin):
    list_display = ["code", "name", "procedure_type", "default_price", "estimated_minutes", "is_active"]
    list_filter = ["procedure_type", "is_active"]
    search_fields = ["code", "name"]


@admin.register(OperatingRoom)
class OperatingRoomAdmin(admin.ModelAdmin):
    list_display = ["name", "location", "is_active"]
    list_filter = ["is_active"]
    search_fields = ["name", "location"]


@admin.register(TheaterBooking)
class TheaterBookingAdmin(admin.ModelAdmin):
    list_display = ["booking_number", "patient", "procedure", "operating_room", "scheduled_at", "status"]
    list_filter = ["status", "priority", "anesthesia_type", "operating_room"]
    search_fields = ["booking_number", "patient__patient_id", "patient__first_name", "patient__last_name", "procedure__name"]
    readonly_fields = ["booking_number", "invoice_line"]
