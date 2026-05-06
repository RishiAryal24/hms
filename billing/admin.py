from django.contrib import admin

from .models import ChargeItem, Invoice, InvoiceLine, Payment


class InvoiceLineInline(admin.TabularInline):
    model = InvoiceLine
    extra = 0
    readonly_fields = ["line_total"]


class PaymentInline(admin.TabularInline):
    model = Payment
    extra = 0


@admin.register(ChargeItem)
class ChargeItemAdmin(admin.ModelAdmin):
    list_display = ["code", "name", "category", "default_price", "is_active"]
    list_filter = ["category", "is_active"]
    search_fields = ["code", "name"]


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ["invoice_number", "patient", "status", "total_amount", "paid_amount", "balance_amount", "created_at"]
    list_filter = ["status", "created_at"]
    search_fields = ["invoice_number", "patient__patient_id", "patient__first_name", "patient__last_name"]
    readonly_fields = ["invoice_number", "subtotal", "total_amount", "paid_amount", "balance_amount"]
    inlines = [InvoiceLineInline, PaymentInline]


@admin.register(InvoiceLine)
class InvoiceLineAdmin(admin.ModelAdmin):
    list_display = ["invoice", "description", "category", "quantity", "unit_price", "line_total"]
    list_filter = ["category"]
    search_fields = ["invoice__invoice_number", "description"]


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ["invoice", "amount", "method", "received_at", "received_by"]
    list_filter = ["method", "received_at"]
    search_fields = ["invoice__invoice_number", "reference"]
