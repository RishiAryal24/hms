from django.db.models import Sum
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, generics
from rest_framework.response import Response
from rest_framework.views import APIView

from shared.permissions import IsTenantAdmin, role_required
from .models import PharmacyItem, StockMovement
from .serializers import PharmacyItemSerializer, StockMovementSerializer


CanManageInventory = role_required("pharmacist")
CanViewInventory = role_required("pharmacist", "billing_staff", "doctor", "nurse", "receptionist")


class PharmacyItemListCreateView(generics.ListCreateAPIView):
    serializer_class = PharmacyItemSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["category", "is_active"]
    search_fields = ["code", "name", "generic_name", "batch_number"]
    ordering_fields = ["name", "stock_quantity", "selling_price", "expiry_date"]

    def get_permissions(self):
        if self.request.method == "POST":
            return [CanManageInventory()]
        return [CanViewInventory()]

    def get_queryset(self):
        return PharmacyItem.objects.all()


class PharmacyItemDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = PharmacyItemSerializer

    def get_permissions(self):
        if self.request.method in ["PUT", "PATCH", "DELETE"]:
            return [CanManageInventory()]
        return [CanViewInventory()]

    def get_queryset(self):
        return PharmacyItem.objects.all()


class StockMovementListCreateView(generics.ListCreateAPIView):
    serializer_class = StockMovementSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["movement_type", "item", "patient", "admission"]
    search_fields = ["item__name", "item__code", "patient__patient_id", "patient__first_name", "patient__last_name", "reference"]
    ordering_fields = ["created_at", "quantity", "unit_price"]

    def get_permissions(self):
        if self.request.method == "POST":
            return [CanManageInventory()]
        return [CanViewInventory()]

    def get_queryset(self):
        return StockMovement.objects.select_related(
            "item", "patient", "admission", "performed_by", "invoice_line", "invoice_line__invoice"
        )


class PharmacySummaryView(APIView):
    permission_classes = [CanViewInventory]

    def get(self, request):
        today = timezone.localdate()
        items = PharmacyItem.objects.filter(is_active=True)
        return Response({
            "items": items.count(),
            "low_stock": sum(1 for item in items if item.is_low_stock),
            "expired": sum(1 for item in items if item.is_expired),
            "stock_value": items.aggregate(total=Sum("stock_quantity"))["total"] or 0,
            "dispensed_today": StockMovement.objects.filter(
                movement_type="dispense",
                created_at__date=today,
            ).count(),
        })
