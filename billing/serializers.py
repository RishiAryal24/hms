from rest_framework import serializers

from patients.serializers import PatientListSerializer
from .models import ChargeItem, Invoice, InvoiceLine, Payment


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
