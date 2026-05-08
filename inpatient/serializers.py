from rest_framework import serializers

from patients.models import AdmissionRecord, VitalSign
from patients.serializers import AdmissionRecordSerializer, PatientListSerializer, VitalSignSerializer
from .models import Bed, BedAssignment, BedStatus, BedTransfer, DoctorOrder, DoctorRound, NursingRound, Room, Ward


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


class AdmissionDischargeSerializer(serializers.Serializer):
    diagnosis_on_discharge = serializers.CharField(required=False, allow_blank=True)
    discharge_summary = serializers.CharField(required=False, allow_blank=True)
    generate_bed_charges = serializers.BooleanField(default=True)


class DoctorRoundSerializer(serializers.ModelSerializer):
    admission_number = serializers.CharField(source="admission.admission_number", read_only=True)
    doctor_name = serializers.CharField(source="doctor.get_full_name", read_only=True)
    invoice_number = serializers.CharField(source="invoice_line.invoice.invoice_number", read_only=True)
    invoice_line_total = serializers.DecimalField(source="invoice_line.line_total", max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = DoctorRound
        fields = "__all__"
        read_only_fields = ["invoice_line", "created_at", "updated_at"]

    def validate_doctor(self, doctor):
        if doctor.role_name != "doctor":
            raise serializers.ValidationError("Selected user must have the doctor role.")
        return doctor

    def create(self, validated_data):
        request = self.context["request"]
        admission = validated_data["admission"]
        doctor = validated_data.get("doctor")
        if getattr(request.user, "role_name", None) == "doctor":
            doctor = request.user
        if not doctor:
            raise serializers.ValidationError({"doctor": "Doctor is required."})
        validated_data["doctor"] = doctor
        profile = getattr(doctor, "doctor_profile", None)

        if not validated_data.get("visit_fee") and profile:
            validated_data["visit_fee"] = profile.consultation_fee

        doctor_round = DoctorRound.objects.create(**validated_data)

        if doctor_round.visit_fee:
            from billing.models import ChargeCategory
            from billing.services import add_billable_line

            doctor_name = doctor.get_full_name() or doctor.username
            line = add_billable_line(
                patient=admission.patient,
                admission=admission,
                created_by=request.user,
                description=f"IPD doctor round - Dr. {doctor_name}",
                category=ChargeCategory.IPD,
                unit_price=doctor_round.visit_fee,
                source_module="inpatient.doctor_round",
                source_id=doctor_round.id,
            )
            if line:
                doctor_round.invoice_line = line
                doctor_round.save(update_fields=["invoice_line", "updated_at"])

        return doctor_round


class IPDVitalSignSerializer(VitalSignSerializer):
    class Meta(VitalSignSerializer.Meta):
        read_only_fields = ["patient", "admission", "recorded_by", "created_at", "updated_at"]

    def create(self, validated_data):
        admission = self.context["admission"]
        return VitalSign.objects.create(
            patient=admission.patient,
            admission=admission,
            recorded_by=self.context["request"].user,
            **validated_data,
        )


class DoctorOrderSerializer(serializers.ModelSerializer):
    doctor_name = serializers.CharField(source="doctor.get_full_name", read_only=True)
    completed_by_name = serializers.CharField(source="completed_by.get_full_name", read_only=True)
    lab_order_number = serializers.CharField(source="lab_order.order_number", read_only=True)
    lab_order_id = serializers.IntegerField(source="lab_order.id", read_only=True)

    class Meta:
        model = DoctorOrder
        fields = "__all__"
        read_only_fields = ["doctor", "completed_at", "completed_by", "created_at", "updated_at"]

    def create(self, validated_data):
        validated_data["doctor"] = self.context["request"].user
        return super().create(validated_data)


class IPDAdmissionSerializer(AdmissionRecordSerializer):
    patient_detail = PatientListSerializer(source="patient", read_only=True)
    active_bed = serializers.SerializerMethodField()
    doctor_round_count = serializers.IntegerField(source="doctor_rounds.count", read_only=True)
    active_order_count = serializers.SerializerMethodField()
    latest_vital = serializers.SerializerMethodField()

    class Meta(AdmissionRecordSerializer.Meta):
        fields = AdmissionRecordSerializer.Meta.fields

    def get_active_bed(self, obj):
        assignment = obj.bed_assignments.filter(status="active").select_related("bed", "bed__ward", "bed__room").first()
        return BedAssignmentSerializer(assignment).data if assignment else None

    def get_active_order_count(self, obj):
        return obj.doctor_orders.filter(status="active").count()

    def get_latest_vital(self, obj):
        vital = obj.vitals.order_by("-created_at").first()
        return VitalSignSerializer(vital).data if vital else None
