from django.contrib import admin

from .models import PharmacyItem, StockMovement


@admin.register(PharmacyItem)
class PharmacyItemAdmin(admin.ModelAdmin):
    list_display = ("code", "name", "category", "stock_quantity", "reorder_level", "selling_price", "expiry_date", "is_active")
    search_fields = ("code", "name", "generic_name", "batch_number")
    list_filter = ("category", "is_active")


@admin.register(StockMovement)
class StockMovementAdmin(admin.ModelAdmin):
    list_display = ("item", "movement_type", "quantity", "unit_price", "patient", "performed_by", "created_at")
    search_fields = ("item__name", "item__code", "patient__patient_id", "reference")
    list_filter = ("movement_type",)
