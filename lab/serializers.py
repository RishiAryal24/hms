from django.utils import timezone
from rest_framework import serializers

from billing.models import ChargeCategory
from billing.services import add_billable_line
from patients.serializers import PatientListSerializer
from .models import LabOrder, LabOrderItem, LabOrderStatus, LabTest


class LabTestSerializer(serializers.ModelSerializer):
    class Meta:
        model = LabTest
        fields = "__all__"
        read_only_fields = ["created_at", "updated_at"]

    def validate_price(self, value):
        if value < 0:
            raise serializers.ValidationError("Price cannot be negative.")
        return value


class LabOrderItemSerializer(serializers.ModelSerializer):
    test_detail = LabTestSerializer(source="test", read_only=True)
    resulted_by_name = serializers.CharField(source="resulted_by.get_full_name", read_only=True)
    invoice_number = serializers.CharField(source="invoice_line.invoice.invoice_number", read_only=True)

    class Meta:
        model = LabOrderItem
        fields = "__all__"
        read_only_fields = [
            "order", "status", "resulted_at", "resulted_by",
            "invoice_line", "created_at", "updated_at",
        ]


class LabOrderSerializer(serializers.ModelSerializer):
    patient_detail = PatientListSerializer(source="patient", read_only=True)
    ordered_by_name = serializers.CharField(source="ordered_by.get_full_name", read_only=True)
    collected_by_name = serializers.CharField(source="collected_by.get_full_name", read_only=True)
    items = LabOrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = LabOrder
        fields = "__all__"
        read_only_fields = [
            "order_number", "status", "ordered_by", "collected_at",
            "collected_by", "completed_at", "created_at", "updated_at",
        ]


class LabOrderCreateSerializer(serializers.ModelSerializer):
    tests = serializers.PrimaryKeyRelatedField(queryset=LabTest.objects.filter(is_active=True), many=True, write_only=True)

    class Meta:
        model = LabOrder
        fields = ["patient", "admission", "priority", "clinical_notes", "tests"]

    def validate(self, attrs):
        admission = attrs.get("admission")
        patient = attrs.get("patient")
        if admission and admission.patient_id != patient.id:
            raise serializers.ValidationError({"admission": "Admission must belong to the selected patient."})
        if not any(test.price > 0 for test in attrs.get("tests", [])):
            raise serializers.ValidationError({"tests": "At least one selected lab test must have a price greater than zero to create billing."})
        return attrs

    def create(self, validated_data):
        tests = validated_data.pop("tests")
        request = self.context["request"]
        order = LabOrder.objects.create(ordered_by=request.user, **validated_data)
        for test in tests:
            item = LabOrderItem.objects.create(order=order, test=test)
            line = add_billable_line(
                patient=order.patient,
                admission=order.admission,
                created_by=request.user,
                description=f"Lab test - {test.name}",
                category=ChargeCategory.LAB,
                unit_price=test.price,
                source_module="lab.order_item",
                source_id=item.id,
            )
            if line:
                item.invoice_line = line
                item.save(update_fields=["invoice_line", "updated_at"])
        return order


class LabResultSerializer(serializers.ModelSerializer):
    class Meta:
        model = LabOrderItem
        fields = ["result_value", "result_notes", "is_abnormal"]

    def update(self, instance, validated_data):
        instance.result_value = validated_data.get("result_value", instance.result_value)
        instance.result_notes = validated_data.get("result_notes", instance.result_notes)
        instance.is_abnormal = validated_data.get("is_abnormal", instance.is_abnormal)
        instance.status = LabOrderStatus.COMPLETED
        instance.resulted_at = timezone.now()
        instance.resulted_by = self.context["request"].user
        instance.save()
        instance.order.refresh_status()
        return instance
