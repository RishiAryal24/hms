from django.db.models import Count
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import User
from shared.permissions import IsTenantAdmin, role_required
from .models import BookingStatus, OperatingRoom, Procedure, TheaterBooking
from .serializers import (
    OperatingRoomSerializer,
    ProcedureSerializer,
    StaffOptionSerializer,
    TheaterBookingCreateSerializer,
    TheaterBookingSerializer,
    TheaterCancelSerializer,
    TheaterCompleteSerializer,
    TheaterStartSerializer,
)


CanManageTheater = role_required("doctor", "nurse", "receptionist")
CanViewTheater = role_required("doctor", "nurse", "receptionist", "billing_staff")


class ProcedureListCreateView(generics.ListCreateAPIView):
    serializer_class = ProcedureSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["procedure_type", "is_active"]
    search_fields = ["code", "name", "description"]
    ordering_fields = ["name", "procedure_type", "default_price", "estimated_minutes"]

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsTenantAdmin()]
        return [CanViewTheater()]

    def get_queryset(self):
        return Procedure.objects.all()


class ProcedureDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ProcedureSerializer
    permission_classes = [IsTenantAdmin]
    queryset = Procedure.objects.all()


class OperatingRoomListCreateView(generics.ListCreateAPIView):
    serializer_class = OperatingRoomSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["is_active"]
    search_fields = ["name", "location"]
    ordering_fields = ["name", "location"]

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsTenantAdmin()]
        return [CanViewTheater()]

    def get_queryset(self):
        return OperatingRoom.objects.all()


class OperatingRoomDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = OperatingRoomSerializer
    permission_classes = [IsTenantAdmin]
    queryset = OperatingRoom.objects.all()


class TheaterBookingListCreateView(generics.ListCreateAPIView):
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["status", "priority", "patient", "admission", "procedure", "operating_room", "surgeon"]
    search_fields = ["booking_number", "patient__patient_id", "patient__first_name", "patient__last_name", "procedure__name"]
    ordering_fields = ["scheduled_at", "created_at", "completed_at"]

    def get_permissions(self):
        if self.request.method == "POST":
            return [CanManageTheater()]
        return [CanViewTheater()]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return TheaterBookingCreateSerializer
        return TheaterBookingSerializer

    def get_queryset(self):
        return TheaterBooking.objects.select_related(
            "patient", "admission", "procedure", "operating_room", "surgeon",
            "assistant", "nurse", "booked_by", "completed_by", "invoice_line", "invoice_line__invoice",
        )

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        booking = serializer.save()
        return Response(TheaterBookingSerializer(booking).data, status=status.HTTP_201_CREATED)


class TheaterBookingDetailView(generics.RetrieveAPIView):
    serializer_class = TheaterBookingSerializer
    permission_classes = [CanViewTheater]
    queryset = TheaterBooking.objects.select_related(
        "patient", "admission", "procedure", "operating_room", "surgeon",
        "assistant", "nurse", "booked_by", "completed_by", "invoice_line", "invoice_line__invoice",
    )


class StartTheaterBookingView(APIView):
    permission_classes = [CanManageTheater]

    def post(self, request, pk):
        booking = TheaterBooking.objects.get(pk=pk)
        serializer = TheaterStartSerializer(booking, data={}, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(TheaterBookingSerializer(booking).data)


class CompleteTheaterBookingView(generics.UpdateAPIView):
    serializer_class = TheaterCompleteSerializer
    permission_classes = [CanManageTheater]
    http_method_names = ["patch"]
    queryset = TheaterBooking.objects.select_related("patient", "admission", "procedure")

    def update(self, request, *args, **kwargs):
        super().update(request, *args, **kwargs)
        booking = TheaterBooking.objects.select_related(
            "patient", "admission", "procedure", "operating_room", "surgeon",
            "assistant", "nurse", "booked_by", "completed_by", "invoice_line", "invoice_line__invoice",
        ).get(pk=self.kwargs["pk"])
        return Response(TheaterBookingSerializer(booking).data)


class CancelTheaterBookingView(APIView):
    permission_classes = [CanManageTheater]

    def post(self, request, pk):
        booking = TheaterBooking.objects.get(pk=pk)
        serializer = TheaterCancelSerializer(booking, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(TheaterBookingSerializer(booking).data)


class TheaterOptionsView(APIView):
    permission_classes = [CanViewTheater]

    def get(self, request):
        return Response({
            "procedures": ProcedureSerializer(Procedure.objects.filter(is_active=True), many=True).data,
            "rooms": OperatingRoomSerializer(OperatingRoom.objects.filter(is_active=True), many=True).data,
            "surgeons": StaffOptionSerializer(User.objects.filter(role__name="doctor", is_active=True), many=True).data,
            "nurses": StaffOptionSerializer(User.objects.filter(role__name="nurse", is_active=True), many=True).data,
        })


class TheaterSummaryView(APIView):
    permission_classes = [CanViewTheater]

    def get(self, request):
        counts = TheaterBooking.objects.values("status").annotate(total=Count("id"))
        by_status = {row["status"]: row["total"] for row in counts}
        return Response({
            "procedures": Procedure.objects.filter(is_active=True).count(),
            "rooms": OperatingRoom.objects.filter(is_active=True).count(),
            "scheduled": by_status.get(BookingStatus.SCHEDULED, 0),
            "in_progress": by_status.get(BookingStatus.IN_PROGRESS, 0),
            "completed": by_status.get(BookingStatus.COMPLETED, 0),
        })
