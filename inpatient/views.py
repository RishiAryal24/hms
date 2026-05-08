from decimal import Decimal

from django.db import transaction
from django.db.models import Count, Q
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from patients.models import AdmissionRecord, VitalSign
from shared.permissions import IsTenantAdmin, role_required
from .models import (
    Bed,
    BedAssignment,
    BedStatus,
    BedTransfer,
    DischargeClearance,
    DoctorOrder,
    DoctorRound,
    NursingRound,
    Room,
    Ward,
)
from .serializers import (
    BedAssignmentSerializer,
    BedSerializer,
    AdmissionDischargeSerializer,
    DischargeClearanceSerializer,
    DoctorOrderSerializer,
    DoctorRoundSerializer,
    IPDVitalSignSerializer,
    BedTransferReadSerializer,
    BedTransferSerializer,
    IPDAdmissionSerializer,
    NursingRoundSerializer,
    RoomSerializer,
    WardSerializer,
)


CanManageBeds = role_required("receptionist", "nurse")
CanViewIPD = role_required("receptionist", "doctor", "nurse", "billing_staff")
CanNursing = role_required("nurse", "doctor")
CanDoctorRound = role_required("receptionist", "doctor", "nurse")
CanDischarge = role_required("doctor")
CanOrder = role_required("doctor")
CanVitals = role_required("doctor", "nurse")
CanBillingClearance = role_required("billing_staff", "receptionist")
CanPharmacyClearance = role_required("pharmacist")


class WardListCreateView(generics.ListCreateAPIView):
    serializer_class = WardSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name", "department", "floor"]
    ordering_fields = ["name", "ward_type", "created_at"]

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsTenantAdmin()]
        return [CanViewIPD()]

    def get_queryset(self):
        return Ward.objects.annotate(
            total_beds=Count("beds"),
            available_beds=Count("beds", filter=Q(beds__status=BedStatus.AVAILABLE)),
            occupied_beds=Count("beds", filter=Q(beds__status=BedStatus.OCCUPIED)),
        )


class WardDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = WardSerializer
    permission_classes = [IsTenantAdmin]
    queryset = Ward.objects.all()


class RoomListCreateView(generics.ListCreateAPIView):
    serializer_class = RoomSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["ward", "room_type", "is_active"]
    search_fields = ["room_number", "ward__name"]
    ordering_fields = ["room_number", "daily_rate", "created_at"]
    queryset = Room.objects.select_related("ward").all()

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsTenantAdmin()]
        return [CanViewIPD()]


class RoomDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = RoomSerializer
    permission_classes = [IsTenantAdmin]
    queryset = Room.objects.select_related("ward").all()


class BedListCreateView(generics.ListCreateAPIView):
    serializer_class = BedSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["ward", "room", "status"]
    search_fields = ["bed_number", "ward__name", "room__room_number"]
    ordering_fields = ["bed_number", "status", "created_at"]

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsTenantAdmin()]
        return [CanViewIPD()]

    def get_queryset(self):
        return Bed.objects.select_related("ward", "room").all()


class BedDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = BedSerializer

    def get_permissions(self):
        if self.request.method in ["PUT", "PATCH", "DELETE"]:
            return [IsTenantAdmin()]
        return [CanViewIPD()]

    def get_queryset(self):
        return Bed.objects.select_related("ward", "room").all()


class ActiveAdmissionListView(generics.ListAPIView):
    serializer_class = IPDAdmissionSerializer
    permission_classes = [CanViewIPD]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["admission_type", "department", "admitting_doctor"]
    search_fields = ["admission_number", "patient__patient_id", "patient__first_name", "patient__last_name"]
    ordering_fields = ["admission_date", "department"]

    def get_queryset(self):
        return AdmissionRecord.objects.filter(status="admitted").select_related(
            "patient", "admitting_doctor", "admitted_by"
        ).prefetch_related("bed_assignments")


class BedAssignmentListCreateView(generics.ListCreateAPIView):
    serializer_class = BedAssignmentSerializer

    def get_permissions(self):
        if self.request.method == "POST":
            return [CanManageBeds()]
        return [CanViewIPD()]

    def get_queryset(self):
        return BedAssignment.objects.select_related(
            "admission", "patient", "bed", "bed__ward", "bed__room", "assigned_by"
        ).all()


class ReleaseBedView(APIView):
    permission_classes = [CanManageBeds]

    def post(self, request, pk):
        assignment = BedAssignment.objects.select_related("bed").get(pk=pk, status="active")
        assignment.release()
        return Response(BedAssignmentSerializer(assignment).data)


class BedTransferView(APIView):
    permission_classes = [CanManageBeds]

    def post(self, request):
        serializer = BedTransferSerializer(
            data=request.data,
            context={"request": request, "now": timezone.now()},
        )
        serializer.is_valid(raise_exception=True)
        transfer = serializer.save()
        return Response(BedTransferReadSerializer(transfer).data, status=status.HTTP_201_CREATED)


class BedTransferListView(generics.ListAPIView):
    serializer_class = BedTransferReadSerializer
    permission_classes = [CanViewIPD]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["admission"]
    ordering_fields = ["transferred_at"]
    queryset = BedTransfer.objects.select_related(
        "admission", "from_bed", "from_bed__ward", "to_bed", "to_bed__ward", "transferred_by"
    ).all()


class NursingRoundListCreateView(generics.ListCreateAPIView):
    serializer_class = NursingRoundSerializer

    def get_permissions(self):
        if self.request.method == "POST":
            return [CanNursing()]
        return [CanViewIPD()]

    def get_queryset(self):
        return NursingRound.objects.select_related("admission", "nurse").filter(
            admission_id=self.kwargs["admission_pk"]
        )

    def perform_create(self, serializer):
        admission = AdmissionRecord.objects.get(pk=self.kwargs["admission_pk"], status="admitted")
        serializer.save(admission=admission)


class DoctorRoundListCreateView(generics.ListCreateAPIView):
    serializer_class = DoctorRoundSerializer

    def get_permissions(self):
        if self.request.method == "POST":
            return [CanDoctorRound()]
        return [CanViewIPD()]

    def get_queryset(self):
        return DoctorRound.objects.select_related(
            "admission", "doctor", "invoice_line", "invoice_line__invoice"
        ).filter(admission_id=self.kwargs["admission_pk"])

    def perform_create(self, serializer):
        admission = AdmissionRecord.objects.get(pk=self.kwargs["admission_pk"], status="admitted")
        serializer.save(admission=admission)


class IPDVitalSignListCreateView(generics.ListCreateAPIView):
    serializer_class = IPDVitalSignSerializer

    def get_permissions(self):
        if self.request.method == "POST":
            return [CanVitals()]
        return [CanViewIPD()]

    def get_queryset(self):
        return VitalSign.objects.filter(admission_id=self.kwargs["admission_pk"]).select_related("recorded_by")

    def get_serializer_context(self):
        context = super().get_serializer_context()
        if self.request.method == "POST":
            context["admission"] = AdmissionRecord.objects.get(pk=self.kwargs["admission_pk"], status="admitted")
        return context


class DoctorOrderListCreateView(generics.ListCreateAPIView):
    serializer_class = DoctorOrderSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["status", "order_type", "priority"]
    ordering_fields = ["ordered_at", "priority", "status"]

    def get_permissions(self):
        if self.request.method == "POST":
            return [CanOrder()]
        return [CanViewIPD()]

    def get_queryset(self):
        return DoctorOrder.objects.filter(admission_id=self.kwargs["admission_pk"]).select_related(
            "doctor", "completed_by"
        )

    def perform_create(self, serializer):
        admission = AdmissionRecord.objects.get(pk=self.kwargs["admission_pk"], status="admitted")
        serializer.save(admission=admission)


class CompleteDoctorOrderView(APIView):
    permission_classes = [CanVitals]

    def post(self, request, admission_pk, pk):
        order = DoctorOrder.objects.get(pk=pk, admission_id=admission_pk, status="active")
        order.status = "completed"
        order.completed_at = timezone.now()
        order.completed_by = request.user
        order.save(update_fields=["status", "completed_at", "completed_by", "updated_at"])
        return Response(DoctorOrderSerializer(order).data)


def get_active_admission(admission_pk):
    return AdmissionRecord.objects.select_related("patient").get(pk=admission_pk, status="admitted")


def get_or_create_discharge_clearance(admission):
    clearance, _ = DischargeClearance.objects.get_or_create(admission=admission)
    return clearance


def update_clearance_fields(clearance, data, fields):
    for field in fields:
        if field in data:
            setattr(clearance, field, data.get(field))


class DischargeClearanceDetailView(APIView):
    permission_classes = [CanViewIPD]

    def get(self, request, admission_pk):
        admission = get_active_admission(admission_pk)
        clearance = get_or_create_discharge_clearance(admission)
        return Response(DischargeClearanceSerializer(clearance).data)


class ClinicalDischargeClearanceView(APIView):
    permission_classes = [CanDischarge]

    def post(self, request, admission_pk):
        admission = get_active_admission(admission_pk)
        clearance = get_or_create_discharge_clearance(admission)
        update_clearance_fields(clearance, request.data, [
            "final_diagnosis",
            "discharge_summary",
            "treatment_given",
            "condition_at_discharge",
            "discharge_medications",
            "follow_up_advice",
            "clinical_notes",
        ])
        clearance.clinical_cleared = True
        clearance.clinical_cleared_by = request.user
        clearance.clinical_cleared_at = timezone.now()
        clearance.save()
        return Response(DischargeClearanceSerializer(clearance).data)


class NursingDischargeClearanceView(APIView):
    permission_classes = [CanNursing]

    def post(self, request, admission_pk):
        admission = get_active_admission(admission_pk)
        clearance = get_or_create_discharge_clearance(admission)
        update_clearance_fields(clearance, request.data, [
            "vitals_stable",
            "iv_removed",
            "catheter_removed",
            "instructions_explained",
            "nursing_notes",
        ])
        clearance.nursing_cleared = True
        clearance.nursing_cleared_by = request.user
        clearance.nursing_cleared_at = timezone.now()
        clearance.save()
        return Response(DischargeClearanceSerializer(clearance).data)


class BillingDischargeClearanceView(APIView):
    permission_classes = [CanBillingClearance]

    def post(self, request, admission_pk):
        admission = get_active_admission(admission_pk)
        clearance = get_or_create_discharge_clearance(admission)
        update_clearance_fields(clearance, request.data, [
            "generate_bed_charges",
            "billing_notes",
        ])
        clearance.billing_cleared = True
        clearance.billing_cleared_by = request.user
        clearance.billing_cleared_at = timezone.now()
        clearance.save()
        return Response(DischargeClearanceSerializer(clearance).data)


class PharmacyDischargeClearanceView(APIView):
    permission_classes = [CanPharmacyClearance]

    def post(self, request, admission_pk):
        admission = get_active_admission(admission_pk)
        clearance = get_or_create_discharge_clearance(admission)
        update_clearance_fields(clearance, request.data, ["pharmacy_notes"])
        clearance.pharmacy_cleared = True
        clearance.pharmacy_cleared_by = request.user
        clearance.pharmacy_cleared_at = timezone.now()
        clearance.save()
        return Response(DischargeClearanceSerializer(clearance).data)


class DischargeAdmissionView(APIView):
    permission_classes = [CanDischarge]

    def post(self, request, admission_pk):
        serializer = AdmissionDischargeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        admission = get_active_admission(admission_pk)
        clearance = get_or_create_discharge_clearance(admission)

        if serializer.validated_data.get("diagnosis_on_discharge"):
            clearance.final_diagnosis = serializer.validated_data["diagnosis_on_discharge"]
        if serializer.validated_data.get("discharge_summary"):
            clearance.discharge_summary = serializer.validated_data["discharge_summary"]
        clearance.generate_bed_charges = serializer.validated_data["generate_bed_charges"]
        clearance.save(update_fields=[
            "final_diagnosis",
            "discharge_summary",
            "generate_bed_charges",
            "updated_at",
        ])

        if not clearance.ready_for_discharge:
            missing = []
            if not clearance.clinical_cleared:
                missing.append("clinical")
            if not clearance.nursing_cleared:
                missing.append("nursing")
            if not clearance.billing_cleared:
                missing.append("billing")
            if not clearance.pharmacy_cleared:
                missing.append("pharmacy")
            return Response(
                {"detail": f"Discharge clearance is incomplete: {', '.join(missing)}."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        discharge_time = timezone.now()

        with transaction.atomic():
            if clearance.generate_bed_charges:
                generate_bed_charges(admission, request.user, discharge_time)

            admission.status = "discharged"
            admission.discharge_date = discharge_time
            admission.diagnosis_on_discharge = clearance.final_diagnosis
            admission.discharge_summary = clearance.discharge_summary
            admission.save(update_fields=[
                "status", "discharge_date", "diagnosis_on_discharge",
                "discharge_summary", "updated_at",
            ])

            active_assignment = admission.bed_assignments.filter(status="active").select_related("bed").first()
            if active_assignment:
                active_assignment.release()

            clearance.final_discharge_completed = True
            clearance.final_discharge_by = request.user
            clearance.final_discharge_at = discharge_time
            clearance.save(update_fields=[
                "final_discharge_completed",
                "final_discharge_by",
                "final_discharge_at",
                "updated_at",
            ])

        return Response(IPDAdmissionSerializer(admission).data)


def generate_bed_charges(admission, user, end_time):
    from billing.models import ChargeCategory
    from billing.services import add_billable_line

    assignments = BedAssignment.objects.filter(admission=admission).select_related("bed", "bed__ward", "bed__room")
    for assignment in assignments:
        bed = assignment.bed
        daily_rate = Decimal(str(bed.effective_daily_rate or 0))
        if daily_rate <= 0:
            continue

        charge_end = assignment.released_at or end_time
        stay_seconds = max((charge_end - assignment.assigned_at).total_seconds(), 0)
        days = max(1, int((stay_seconds + 86399) // 86400))
        add_billable_line(
            patient=admission.patient,
            admission=admission,
            created_by=user,
            description=f"IPD bed charge - {bed.ward.name} {bed.bed_number} ({days} day{'s' if days != 1 else ''})",
            category=ChargeCategory.IPD,
            quantity=days,
            unit_price=daily_rate,
            source_module="inpatient.bed_assignment",
            source_id=assignment.id,
        )
