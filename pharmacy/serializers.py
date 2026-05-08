from decimal import Decimal

from rest_framework import serializers

from billing.models import ChargeCategory
from billing.services import add_billable_line
from patients.serializers import PatientListSerializer
from .models import MovementType, PharmacyItem, StockMovement


class PharmacyItemSerializer(serializers.ModelSerializer):
    is_low_stock = serializers.BooleanField(read_only=True)
    is_expired = serializers.BooleanField(read_only=True)

    class Meta:
        model = PharmacyItem
        fields = "__all__"
        read_only_fields = ["created_at", "updated_at"]

    def validate(self, attrs):
        for field in ["purchase_price", "selling_price", "stock_quantity", "reorder_level"]:
            value = attrs.get(field)
            if value is not None and value < 0:
                raise serializers.ValidationError({field: "Value cannot be negative."})
        return attrs


class StockMovementSerializer(serializers.ModelSerializer):
    item_detail = PharmacyItemSerializer(source="item", read_only=True)
    patient_detail = PatientListSerializer(source="patient", read_only=True)
    performed_by_name = serializers.CharField(source="performed_by.get_full_name", read_only=True)
    invoice_id = serializers.IntegerField(source="invoice_line.invoice_id", read_only=True)
    invoice_number = serializers.CharField(source="invoice_line.invoice.invoice_number", read_only=True)
    invoice_status = serializers.CharField(source="invoice_line.invoice.status", read_only=True)

    class Meta:
        model = StockMovement
        fields = "__all__"
        read_only_fields = ["performed_by", "invoice_line", "created_at", "updated_at"]

    def validate(self, attrs):
        item = attrs.get("item")
        movement_type = attrs.get("movement_type")
        quantity = attrs.get("quantity")
        patient = attrs.get("patient")
        admission = attrs.get("admission")

        if quantity is None or quantity <= 0:
            raise serializers.ValidationError({"quantity": "Quantity must be greater than zero."})
        if movement_type == MovementType.DISPENSE:
            if not patient:
                raise serializers.ValidationError({"patient": "Patient is required when dispensing."})
            if admission and admission.patient_id != patient.id:
                raise serializers.ValidationError({"admission": "Admission must belong to selected patient."})
            if item and quantity > item.stock_quantity:
                raise serializers.ValidationError({"quantity": "Insufficient stock."})
        return attrs

    def create(self, validated_data):
        request = self.context["request"]
        item = validated_data["item"]
        movement_type = validated_data["movement_type"]
        quantity = validated_data["quantity"]

        if not validated_data.get("unit_price"):
            validated_data["unit_price"] = item.selling_price if movement_type == MovementType.DISPENSE else item.purchase_price

        movement = StockMovement.objects.create(performed_by=request.user, **validated_data)

        if movement_type == MovementType.STOCK_IN:
            item.stock_quantity += quantity
            item.save(update_fields=["stock_quantity", "updated_at"])
        elif movement_type == MovementType.DISPENSE:
            item.stock_quantity -= quantity
            item.save(update_fields=["stock_quantity", "updated_at"])
            line = add_billable_line(
                patient=movement.patient,
                admission=movement.admission,
                created_by=request.user,
                description=f"Pharmacy - {item.name}",
                category=ChargeCategory.PHARMACY,
                quantity=quantity,
                unit_price=movement.unit_price,
                source_module="pharmacy.stock_movement",
                source_id=movement.id,
            )
            if line:
                movement.invoice_line = line
                movement.save(update_fields=["invoice_line", "updated_at"])
        elif movement_type == MovementType.ADJUSTMENT:
            # Positive adjustment adds stock; negative adjustment is represented by notes and stock-in/dispense in normal flow.
            item.stock_quantity = max(Decimal("0.00"), item.stock_quantity + quantity)
            item.save(update_fields=["stock_quantity", "updated_at"])

        return movement
