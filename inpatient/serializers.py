from rest_framework import serializers

from patients.models import AdmissionRecord
from patients.serializers import AdmissionRecordSerializer, PatientListSerializer
from .models import Bed, BedAssignment, BedStatus, BedTransfer, NursingRound, Room, Ward


class WardSerializer(serializers.ModelSerializer):
    total_beds = serializers.IntegerField(read_only=True)
    available_beds = serializers.IntegerField(read_only=True)
    occupied_beds = serializers.IntegerField(read_only=True)

    class Meta:
        model = Ward
        fields = "__all__"
        read_only_fields = ["created_at", "updated_at"]


class RoomSerializer(serializers.ModelSerializer):
    ward_name = serializers.CharField(source="ward.name", read_only=True)

    class Meta:
        model = Room
        fields = "__all__"
        read_only_fields = ["created_at", "updated_at"]


class BedSerializer(serializers.ModelSerializer):
    ward_name = serializers.CharField(source="ward.name", read_only=True)
    room_number = serializers.CharField(source="room.room_number", read_only=True)
    effective_daily_rate = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = Bed
        fields = "__all__"
        read_only_fields = ["created_at", "updated_at"]


class BedAssignmentSerializer(serializers.ModelSerializer):
    bed_label = serializers.SerializerMethodField()
    patient_name = serializers.CharField(source="patient.get_full_name", read_only=True)
    patient_id = serializers.CharField(source="patient.patient_id", read_only=True)
    admission_number = serializers.CharField(source="admission.admission_number", read_only=True)
    assigned_by_name = serializers.CharField(source="assigned_by.get_full_name", read_only=True)

    class Meta:
        model = BedAssignment
        fields = "__all__"
        read_only_fields = ["patient", "assigned_by", "status", "released_at", "created_at", "updated_at"]

    def validate(self, attrs):
        bed = attrs.get("bed")
        admission = attrs.get("admission")
        if bed and bed.status != BedStatus.AVAILABLE:
            raise serializers.ValidationError({"bed": "Selected bed is not available."})
        if admission and admission.status != "admitted":
            raise serializers.ValidationError({"admission": "Bed can only be assigned to an active admission."})
        if admission and BedAssignment.objects.filter(admission=admission, status="active").exists():
            raise serializers.ValidationError({"admission": "Admission already has an active bed. Use bed transfer instead."})
        return attrs

    def get_bed_label(self, obj):
        return str(obj.bed)

    def create(self, validated_data):
        admission = validated_data["admission"]
        validated_data["patient"] = admission.patient
        validated_data["assigned_by"] = self.context["request"].user
        return super().create(validated_data)


class BedTransferSerializer(serializers.Serializer):
    admission = serializers.PrimaryKeyRelatedField(queryset=AdmissionRecord.objects.filter(status="admitted"))
    to_bed = serializers.PrimaryKeyRelatedField(queryset=Bed.objects.filter(status=BedStatus.AVAILABLE))
    reason = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        active_assignment = BedAssignment.objects.filter(
            admission=attrs["admission"],
            status="active",
        ).select_related("bed").first()
        if not active_assignment:
            raise serializers.ValidationError("Admission does not have an active bed assignment.")
        attrs["active_assignment"] = active_assignment
        return attrs

    def save(self, **kwargs):
        request = self.context["request"]
        admission = self.validated_data["admission"]
        to_bed = self.validated_data["to_bed"]
        active_assignment = self.validated_data["active_assignment"]

        from_bed = active_assignment.bed
        active_assignment.status = "transferred"
        active_assignment.released_at = self.context["now"]
        active_assignment.save(update_fields=["status", "released_at", "updated_at"])
        from_bed.status = BedStatus.CLEANING
        from_bed.save(update_fields=["status", "updated_at"])

        BedAssignment.objects.create(
            admission=admission,
            patient=admission.patient,
            bed=to_bed,
            assigned_by=request.user,
            notes=self.validated_data.get("reason", ""),
        )
        return BedTransfer.objects.create(
            admission=admission,
            from_bed=from_bed,
            to_bed=to_bed,
            reason=self.validated_data.get("reason", ""),
            transferred_by=request.user,
        )


class BedTransferReadSerializer(serializers.ModelSerializer):
    admission_number = serializers.CharField(source="admission.admission_number", read_only=True)
    from_bed_label = serializers.SerializerMethodField()
    to_bed_label = serializers.SerializerMethodField()
    transferred_by_name = serializers.CharField(source="transferred_by.get_full_name", read_only=True)

    class Meta:
        model = BedTransfer
        fields = "__all__"

    def get_from_bed_label(self, obj):
        return str(obj.from_bed)

    def get_to_bed_label(self, obj):
        return str(obj.to_bed)


class NursingRoundSerializer(serializers.ModelSerializer):
    admission_number = serializers.CharField(source="admission.admission_number", read_only=True)
    nurse_name = serializers.CharField(source="nurse.get_full_name", read_only=True)

    class Meta:
        model = NursingRound
        fields = "__all__"
        read_only_fields = ["nurse", "created_at", "updated_at"]

    def create(self, validated_data):
        validated_data["nurse"] = self.context["request"].user
        return super().create(validated_data)


class IPDAdmissionSerializer(AdmissionRecordSerializer):
    patient_detail = PatientListSerializer(source="patient", read_only=True)
    active_bed = serializers.SerializerMethodField()

    class Meta(AdmissionRecordSerializer.Meta):
        fields = AdmissionRecordSerializer.Meta.fields

    def get_active_bed(self, obj):
        assignment = obj.bed_assignments.filter(status="active").select_related("bed", "bed__ward", "bed__room").first()
        return BedAssignmentSerializer(assignment).data if assignment else None
