from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from shared.permissions import IsTenantAdmin, role_required
from .models import LabOrder, LabOrderItem, LabTest
from .serializers import (
    LabOrderCreateSerializer,
    LabOrderItemSerializer,
    LabOrderSerializer,
    LabResultSerializer,
    LabTestSerializer,
)


CanOrderLab = role_required("doctor", "receptionist", "nurse")
CanViewLab = role_required("doctor", "nurse", "receptionist", "lab_technician", "billing_staff")
CanProcessLab = role_required("lab_technician")


class LabTestListCreateView(generics.ListCreateAPIView):
    serializer_class = LabTestSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["category", "sample_type", "is_active"]
    search_fields = ["code", "name", "category", "sample_type"]
    ordering_fields = ["name", "category", "price", "turnaround_hours"]

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsTenantAdmin()]
        return [CanViewLab()]

    def get_queryset(self):
        return LabTest.objects.all()


class LabTestDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = LabTestSerializer
    permission_classes = [IsTenantAdmin]
    queryset = LabTest.objects.all()


class LabOrderListCreateView(generics.ListCreateAPIView):
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["status", "priority", "patient", "admission"]
    search_fields = ["order_number", "patient__patient_id", "patient__first_name", "patient__last_name"]
    ordering_fields = ["created_at", "completed_at", "priority"]

    def get_permissions(self):
        if self.request.method == "POST":
            return [CanOrderLab()]
        return [CanViewLab()]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return LabOrderCreateSerializer
        return LabOrderSerializer

    def get_queryset(self):
        return LabOrder.objects.select_related(
            "patient", "admission", "ordered_by", "collected_by"
        ).prefetch_related("items", "items__test", "items__invoice_line", "items__invoice_line__invoice")

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        order = serializer.save()
        return Response(LabOrderSerializer(order).data, status=status.HTTP_201_CREATED)


class LabOrderDetailView(generics.RetrieveAPIView):
    serializer_class = LabOrderSerializer
    permission_classes = [CanViewLab]
    queryset = LabOrder.objects.select_related(
        "patient", "admission", "ordered_by", "collected_by"
    ).prefetch_related("items", "items__test", "items__invoice_line", "items__invoice_line__invoice")


class CollectSampleView(APIView):
    permission_classes = [CanProcessLab]

    def post(self, request, pk):
        order = LabOrder.objects.get(pk=pk)
        order.status = "sample_collected"
        order.collected_at = timezone.now()
        order.collected_by = request.user
        order.save(update_fields=["status", "collected_at", "collected_by", "updated_at"])
        order.items.exclude(status="completed").update(status="sample_collected", updated_at=timezone.now())
        return Response(LabOrderSerializer(order).data)


class LabOrderItemListView(generics.ListAPIView):
    serializer_class = LabOrderItemSerializer
    permission_classes = [CanViewLab]

    def get_queryset(self):
        return LabOrderItem.objects.filter(order_id=self.kwargs["order_pk"]).select_related(
            "test", "resulted_by", "invoice_line", "invoice_line__invoice"
        )


class EnterResultView(generics.UpdateAPIView):
    serializer_class = LabResultSerializer
    permission_classes = [CanProcessLab]
    http_method_names = ["patch"]

    def get_queryset(self):
        return LabOrderItem.objects.filter(order_id=self.kwargs["order_pk"]).select_related("order")

    def update(self, request, *args, **kwargs):
        response = super().update(request, *args, **kwargs)
        item = self.get_object()
        return Response(LabOrderItemSerializer(item).data)


class LabSummaryView(APIView):
    permission_classes = [CanViewLab]

    def get(self, request):
        return Response({
            "tests": LabTest.objects.filter(is_active=True).count(),
            "ordered": LabOrder.objects.filter(status="ordered").count(),
            "processing": LabOrder.objects.filter(status__in=["sample_collected", "processing"]).count(),
            "completed": LabOrder.objects.filter(status="completed").count(),
        })
