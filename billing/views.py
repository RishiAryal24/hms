from django.db.models import Sum
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, generics
from rest_framework.exceptions import NotFound
from rest_framework.response import Response
from rest_framework.views import APIView

from shared.permissions import IsTenantAdmin, role_required
from patients.models import Patient
from .models import ChargeItem, Invoice, InvoiceLine, Payment
from .serializers import (
    ChargeItemSerializer,
    InvoiceCreateSerializer,
    InvoiceLineSerializer,
    InvoiceSerializer,
    PaymentSerializer,
    PatientStatementSerializer,
)


CanBill = role_required("billing_staff", "receptionist")
CanViewBilling = role_required("billing_staff", "receptionist", "doctor", "nurse")


class ChargeItemListCreateView(generics.ListCreateAPIView):
    serializer_class = ChargeItemSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["category", "is_active"]
    search_fields = ["code", "name", "description"]
    ordering_fields = ["name", "category", "default_price"]

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsTenantAdmin()]
        return [CanViewBilling()]

    def get_queryset(self):
        return ChargeItem.objects.all()


class ChargeItemDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ChargeItemSerializer
    permission_classes = [IsTenantAdmin]
    queryset = ChargeItem.objects.all()


class InvoiceListCreateView(generics.ListCreateAPIView):
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["status", "patient", "admission"]
    search_fields = ["invoice_number", "patient__patient_id", "patient__first_name", "patient__last_name"]
    ordering_fields = ["created_at", "issued_at", "total_amount", "balance_amount"]

    def get_permissions(self):
        if self.request.method == "POST":
            return [CanBill()]
        return [CanViewBilling()]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return InvoiceCreateSerializer
        return InvoiceSerializer

    def get_queryset(self):
        return Invoice.objects.select_related("patient", "admission", "created_by").prefetch_related("lines", "payments")


class InvoiceDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = InvoiceSerializer
    permission_classes = [CanViewBilling]
    queryset = Invoice.objects.select_related("patient", "admission", "created_by").prefetch_related("lines", "payments")


class InvoiceLineCreateView(generics.CreateAPIView):
    serializer_class = InvoiceLineSerializer
    permission_classes = [CanBill]

    def perform_create(self, serializer):
        invoice = Invoice.objects.get(pk=self.kwargs["invoice_pk"])
        serializer.save(invoice=invoice)


class InvoiceLineDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = InvoiceLineSerializer
    permission_classes = [CanBill]

    def get_queryset(self):
        return InvoiceLine.objects.filter(invoice_id=self.kwargs["invoice_pk"])


class PaymentCreateView(generics.CreateAPIView):
    serializer_class = PaymentSerializer
    permission_classes = [CanBill]

    def get_invoice(self):
        if hasattr(self, "_invoice"):
            return self._invoice
        try:
            self._invoice = Invoice.objects.get(pk=self.kwargs["invoice_pk"])
        except Invoice.DoesNotExist as exc:
            raise NotFound("Invoice not found.") from exc
        return self._invoice

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["invoice"] = self.get_invoice()
        return context

    def perform_create(self, serializer):
        serializer.save(invoice=self.get_invoice(), received_by=self.request.user)


class PaymentListView(generics.ListAPIView):
    serializer_class = PaymentSerializer
    permission_classes = [CanViewBilling]

    def get_queryset(self):
        return Payment.objects.filter(invoice_id=self.kwargs["invoice_pk"]).select_related("received_by")


class IssueInvoiceView(APIView):
    permission_classes = [CanBill]

    def post(self, request, pk):
        invoice = Invoice.objects.get(pk=pk)
        invoice.issue()
        invoice.recalculate()
        return Response(InvoiceSerializer(invoice).data)


class CancelInvoiceView(APIView):
    permission_classes = [CanBill]

    def post(self, request, pk):
        invoice = Invoice.objects.get(pk=pk)
        invoice.status = "cancelled"
        invoice.save(update_fields=["status", "updated_at"])
        return Response(InvoiceSerializer(invoice).data)


class BillingSummaryView(APIView):
    permission_classes = [CanViewBilling]

    def get(self, request):
        invoices = Invoice.objects.exclude(status="cancelled")
        totals = invoices.aggregate(
            total_billed=Sum("total_amount"),
            total_paid=Sum("paid_amount"),
            total_balance=Sum("balance_amount"),
        )
        return Response({
            "total_billed": totals["total_billed"] or 0,
            "total_paid": totals["total_paid"] or 0,
            "total_balance": totals["total_balance"] or 0,
            "draft_count": invoices.filter(status="draft").count(),
            "unpaid_count": invoices.exclude(status="paid").count(),
        })


class PatientStatementView(APIView):
    permission_classes = [CanViewBilling]

    def get(self, request, patient_pk):
        patient = Patient.objects.get(pk=patient_pk)
        return Response(PatientStatementSerializer(patient).data)
