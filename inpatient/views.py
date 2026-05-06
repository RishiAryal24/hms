from django.db.models import Count, Q
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from patients.models import AdmissionRecord
from shared.permissions import IsTenantAdmin, role_required
from .models import Bed, BedAssignment, BedStatus, BedTransfer, DoctorRound, NursingRound, Room, Ward
from .serializers import (
    BedAssignmentSerializer,
    BedSerializer,
    DoctorRoundSerializer,
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
