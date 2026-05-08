from rest_framework import serializers
from django.db.models import Sum

from patients.serializers import PatientListSerializer
from .models import ChargeCategory, ChargeItem, Invoice, InvoiceLine, Payment


class ChargeItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChargeItem
        fields = "__all__"
        read_only_fields = ["created_at", "updated_at"]


class InvoiceLineSerializer(serializers.ModelSerializer):
    charge_item_name = serializers.CharField(source="charge_item.name", read_only=True)

    class Meta:
        model = InvoiceLine
        fields = "__all__"
        read_only_fields = ["invoice", "line_total", "created_at", "updated_at"]

    def validate(self, attrs):
        if attrs.get("quantity", 0) <= 0:
            raise serializers.ValidationError({"quantity": "Quantity must be greater than zero."})
        if attrs.get("unit_price", 0) < 0:
            raise serializers.ValidationError({"unit_price": "Unit price cannot be negative."})
        return attrs


class PaymentSerializer(serializers.ModelSerializer):
    received_by_name = serializers.CharField(source="received_by.get_full_name", read_only=True)

    class Meta:
        model = Payment
        fields = "__all__"
        read_only_fields = ["invoice", "received_by", "created_at", "updated_at"]

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Payment amount must be greater than zero.")
        invoice = self.context.get("invoice")
        if invoice and value > invoice.balance_amount:
            raise serializers.ValidationError("Payment cannot be greater than the remaining invoice balance.")
        return value


class InvoiceSerializer(serializers.ModelSerializer):
    patient_detail = PatientListSerializer(source="patient", read_only=True)
    lines = InvoiceLineSerializer(many=True, read_only=True)
    payments = PaymentSerializer(many=True, read_only=True)
    created_by_name = serializers.CharField(source="created_by.get_full_name", read_only=True)

    class Meta:
        model = Invoice
        fields = "__all__"
        read_only_fields = [
            "invoice_number", "subtotal", "total_amount", "paid_amount",
            "balance_amount", "created_by", "created_at", "updated_at",
        ]


class InvoiceCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Invoice
        fields = ["patient", "admission", "due_date", "discount_amount", "tax_amount", "notes"]

    def create(self, validated_data):
        invoice = Invoice.objects.create(created_by=self.context["request"].user, **validated_data)
        invoice.recalculate()
        return invoice


class PatientStatementSerializer(serializers.Serializer):
    patient = serializers.SerializerMethodField()
    invoices = serializers.SerializerMethodField()
    categories = serializers.SerializerMethodField()
    payments = serializers.SerializerMethodField()
    totals = serializers.SerializerMethodField()

    def get_patient(self, patient):
        return PatientListSerializer(patient).data

    def get_invoices(self, patient):
        invoices = Invoice.objects.filter(patient=patient).exclude(status="cancelled").prefetch_related("lines", "payments")
        return InvoiceSerializer(invoices, many=True).data

    def get_categories(self, patient):
        lines = InvoiceLine.objects.filter(
            invoice__patient=patient,
        ).exclude(invoice__status="cancelled").select_related("invoice")
        category_labels = dict(ChargeCategory.choices)
        categories = []
        for row in lines.values("category").annotate(total=Sum("line_total")).order_by("category"):
            category_lines = lines.filter(category=row["category"]).order_by("created_at")
            categories.append({
                "category": row["category"],
                "label": category_labels.get(row["category"], row["category"].title()),
                "total": row["total"] or 0,
                "lines": [
                    {
                        "id": line.id,
                        "invoice_id": line.invoice_id,
                        "invoice_number": line.invoice.invoice_number,
                        "invoice_status": line.invoice.status,
                        "date": line.created_at,
                        "description": line.description,
                        "quantity": line.quantity,
                        "unit_price": line.unit_price,
                        "line_total": line.line_total,
                        "source_module": line.source_module,
                        "source_id": line.source_id,
                    }
                    for line in category_lines
                ],
            })
        return categories

    def get_payments(self, patient):
        payments = Payment.objects.filter(
            invoice__patient=patient,
        ).exclude(invoice__status="cancelled").select_related("invoice", "received_by").order_by("-received_at")
        return [
            {
                "id": payment.id,
                "invoice_id": payment.invoice_id,
                "invoice_number": payment.invoice.invoice_number,
                "received_at": payment.received_at,
                "method": payment.method,
                "reference": payment.reference,
                "amount": payment.amount,
                "received_by_name": payment.received_by.get_full_name() if payment.received_by else "",
                "notes": payment.notes,
            }
            for payment in payments
        ]

    def get_totals(self, patient):
        invoices = Invoice.objects.filter(patient=patient).exclude(status="cancelled")
        return {
            "billed": invoices.aggregate(total=Sum("total_amount"))["total"] or 0,
            "paid": invoices.aggregate(total=Sum("paid_amount"))["total"] or 0,
            "balance": invoices.aggregate(total=Sum("balance_amount"))["total"] or 0,
            "invoice_count": invoices.count(),
            "unpaid_invoice_count": invoices.exclude(status="paid").count(),
        }
