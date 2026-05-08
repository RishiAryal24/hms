from django.utils import timezone
from rest_framework import serializers

from accounts.models import User
from billing.models import ChargeCategory
from billing.services import add_billable_line
from patients.serializers import PatientListSerializer
from .models import BookingStatus, OperatingRoom, Procedure, TheaterBooking


class ProcedureSerializer(serializers.ModelSerializer):
    class Meta:
        model = Procedure
        fields = "__all__"
        read_only_fields = ["created_at", "updated_at"]

    def validate_default_price(self, value):
        if value < 0:
            raise serializers.ValidationError("Default price cannot be negative.")
        return value


class OperatingRoomSerializer(serializers.ModelSerializer):
    class Meta:
        model = OperatingRoom
        fields = "__all__"
        read_only_fields = ["created_at", "updated_at"]


class StaffOptionSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source="get_full_name", read_only=True)

    class Meta:
        model = User
        fields = ["id", "username", "full_name", "role", "department"]


class TheaterBookingSerializer(serializers.ModelSerializer):
    patient_detail = PatientListSerializer(source="patient", read_only=True)
    procedure_detail = ProcedureSerializer(source="procedure", read_only=True)
    operating_room_detail = OperatingRoomSerializer(source="operating_room", read_only=True)
    surgeon_name = serializers.CharField(source="surgeon.get_full_name", read_only=True)
    assistant_name = serializers.CharField(source="assistant.get_full_name", read_only=True)
    nurse_name = serializers.CharField(source="nurse.get_full_name", read_only=True)
    booked_by_name = serializers.CharField(source="booked_by.get_full_name", read_only=True)
    completed_by_name = serializers.CharField(source="completed_by.get_full_name", read_only=True)
    invoice_id = serializers.IntegerField(source="invoice_line.invoice_id", read_only=True)
    invoice_number = serializers.CharField(source="invoice_line.invoice.invoice_number", read_only=True)
    invoice_status = serializers.CharField(source="invoice_line.invoice.status", read_only=True)
    invoice_line_total = serializers.DecimalField(source="invoice_line.line_total", max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = TheaterBooking
        fields = "__all__"
        read_only_fields = [
            "booking_number", "status", "started_at", "completed_at", "booked_by",
            "completed_by", "invoice_line", "created_at", "updated_at",
        ]


class TheaterBookingCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = TheaterBooking
        fields = [
            "patient", "admission", "procedure", "operating_room", "scheduled_at",
            "priority", "surgeon", "assistant", "nurse", "anesthesia_type", "indication",
        ]

    def validate(self, attrs):
        patient = attrs.get("patient")
        admission = attrs.get("admission")
        procedure = attrs.get("procedure")
        operating_room = attrs.get("operating_room")
        scheduled_at = attrs.get("scheduled_at")

        if admission and admission.patient_id != patient.id:
            raise serializers.ValidationError({"admission": "Admission must belong to selected patient."})
        if procedure and not procedure.is_active:
            raise serializers.ValidationError({"procedure": "Procedure is inactive."})
        if operating_room and not operating_room.is_active:
            raise serializers.ValidationError({"operating_room": "Operating room is inactive."})
        if scheduled_at and scheduled_at < timezone.now():
            raise serializers.ValidationError({"scheduled_at": "Scheduled time cannot be in the past."})
        return attrs

    def create(self, validated_data):
        request = self.context["request"]
        return TheaterBooking.objects.create(booked_by=request.user, **validated_data)


class TheaterStartSerializer(serializers.Serializer):
    def update(self, instance, validated_data):
        if instance.status not in [BookingStatus.SCHEDULED]:
            raise serializers.ValidationError({"status": "Only scheduled bookings can be started."})
        instance.mark_in_progress(self.context["request"].user)
        return instance


class TheaterCompleteSerializer(serializers.ModelSerializer):
    charge_amount = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, write_only=True)

    class Meta:
        model = TheaterBooking
        fields = [
            "procedure_notes", "outcome", "complications", "anesthesia_type",
            "surgeon", "assistant", "nurse", "charge_amount",
        ]

    def validate(self, attrs):
        if self.instance.status == BookingStatus.CANCELLED:
            raise serializers.ValidationError({"status": "Cancelled bookings cannot be completed."})
        if self.instance.status == BookingStatus.COMPLETED:
            raise serializers.ValidationError({"status": "Booking is already completed."})
        if attrs.get("charge_amount") is not None and attrs["charge_amount"] < 0:
            raise serializers.ValidationError({"charge_amount": "Charge amount cannot be negative."})
        return attrs

    def update(self, instance, validated_data):
        charge_amount = validated_data.pop("charge_amount", None)
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.mark_completed(self.context["request"].user)
        instance.save(update_fields=[
            "procedure_notes", "outcome", "complications", "anesthesia_type",
            "surgeon", "assistant", "nurse", "updated_at",
        ])

        price = charge_amount if charge_amount is not None else instance.procedure.default_price
        line = add_billable_line(
            patient=instance.patient,
            admission=instance.admission,
            created_by=self.context["request"].user,
            description=f"Procedure - {instance.procedure.name}",
            category=ChargeCategory.THEATER,
            unit_price=price,
            source_module="theater.booking",
            source_id=instance.id,
        )
        if line:
            instance.invoice_line = line
            instance.save(update_fields=["invoice_line", "updated_at"])
        return instance


class TheaterCancelSerializer(serializers.Serializer):
    reason = serializers.CharField(required=False, allow_blank=True)

    def update(self, instance, validated_data):
        if instance.status == BookingStatus.COMPLETED:
            raise serializers.ValidationError({"status": "Completed bookings cannot be cancelled."})
        instance.status = BookingStatus.CANCELLED
        reason = validated_data.get("reason")
        if reason:
            instance.outcome = reason
        instance.save(update_fields=["status", "outcome", "updated_at"])
        return instance
