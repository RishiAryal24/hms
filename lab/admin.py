from django.contrib import admin

from .models import LabOrder, LabOrderItem, LabTest


class LabOrderItemInline(admin.TabularInline):
    model = LabOrderItem
    extra = 0


@admin.register(LabTest)
class LabTestAdmin(admin.ModelAdmin):
    list_display = ("code", "name", "category", "sample_type", "price", "is_active")
    search_fields = ("code", "name", "category")
    list_filter = ("category", "is_active")


@admin.register(LabOrder)
class LabOrderAdmin(admin.ModelAdmin):
    list_display = ("order_number", "patient", "status", "priority", "ordered_by", "created_at")
    search_fields = ("order_number", "patient__patient_id", "patient__first_name", "patient__last_name")
    list_filter = ("status", "priority")
    inlines = [LabOrderItemInline]
