from django.contrib import admin

from .models import Bed, BedAssignment, BedTransfer, NursingRound, Room, Ward


class RoomInline(admin.TabularInline):
    model = Room
    extra = 0


class BedInline(admin.TabularInline):
    model = Bed
    extra = 0


@admin.register(Ward)
class WardAdmin(admin.ModelAdmin):
    list_display = ["name", "ward_type", "department", "floor", "is_active"]
    list_filter = ["ward_type", "is_active", "department"]
    search_fields = ["name", "department", "floor"]
    inlines = [RoomInline, BedInline]


@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    list_display = ["room_number", "ward", "room_type", "daily_rate", "is_active"]
    list_filter = ["ward", "room_type", "is_active"]
    search_fields = ["room_number", "ward__name"]


@admin.register(Bed)
class BedAdmin(admin.ModelAdmin):
    list_display = ["bed_number", "ward", "room", "status", "effective_daily_rate"]
    list_filter = ["ward", "status"]
    search_fields = ["bed_number", "ward__name", "room__room_number"]


@admin.register(BedAssignment)
class BedAssignmentAdmin(admin.ModelAdmin):
    list_display = ["admission", "patient", "bed", "status", "assigned_at", "released_at"]
    list_filter = ["status", "bed__ward"]
    search_fields = ["admission__admission_number", "patient__patient_id", "bed__bed_number"]


@admin.register(BedTransfer)
class BedTransferAdmin(admin.ModelAdmin):
    list_display = ["admission", "from_bed", "to_bed", "transferred_at", "transferred_by"]
    search_fields = ["admission__admission_number", "from_bed__bed_number", "to_bed__bed_number"]


@admin.register(NursingRound)
class NursingRoundAdmin(admin.ModelAdmin):
    list_display = ["admission", "nurse", "round_time", "condition", "pain_score"]
    list_filter = ["condition"]
    search_fields = ["admission__admission_number", "admission__patient__patient_id", "nurse__username"]
