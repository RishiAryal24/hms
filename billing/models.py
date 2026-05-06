from decimal import Decimal

from django.db import models
from django.utils import timezone

from accounts.models import User
from core.models import TimeStampedModel
from patients.models import AdmissionRecord, Patient


class ChargeCategory(models.TextChoices):
    CONSULTATION = "consultation", "Consultation"
    IPD = "ipd", "IPD"
    LAB = "lab", "Lab"
    PHARMACY = "pharmacy", "Pharmacy"
    THEATER = "theater", "Theater"
    PROCEDURE = "procedure", "Procedure"
    OTHER = "other", "Other"


class InvoiceStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    ISSUED = "issued", "Issued"
    PARTIAL = "partial", "Partially Paid"
    PAID = "paid", "Paid"
    CANCELLED = "cancelled", "Cancelled"


class PaymentMethod(models.TextChoices):
    CASH = "cash", "Cash"
    CARD = "card", "Card"
    ONLINE = "online", "Online"
    INSURANCE = "insurance", "Insurance"
    BANK_TRANSFER = "bank_transfer", "Bank Transfer"
    OTHER = "other", "Other"


class ChargeItem(TimeStampedModel):
    code = models.CharField(max_length=30, unique=True)
    name = models.CharField(max_length=200)
    category = models.CharField(max_length=30, choices=ChargeCategory.choices, default=ChargeCategory.OTHER)
    default_price = models.DecimalField(max_digits=10, decimal_places=2)
    is_active = models.BooleanField(default=True)
    description = models.TextField(blank=True)

    class Meta:
        ordering = ["category", "name"]

    def __str__(self):
        return f"{self.code} - {self.name}"


class Invoice(TimeStampedModel):
    invoice_number = models.CharField(max_length=30, unique=True, editable=False)
    patient = models.ForeignKey(Patient, on_delete=models.PROTECT, related_name="invoices")
    admission = models.ForeignKey(AdmissionRecord, on_delete=models.SET_NULL, null=True, blank=True, related_name="invoices")
    status = models.CharField(max_length=20, choices=InvoiceStatus.choices, default=InvoiceStatus.DRAFT)
    issued_at = models.DateTimeField(null=True, blank=True)
    due_date = models.DateField(null=True, blank=True)
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    discount_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    paid_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    balance_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="created_invoices")

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.invoice_number or f"Invoice #{self.pk}"

    def save(self, *args, **kwargs):
        if not self.invoice_number:
            last = Invoice.objects.order_by("-id").first()
            next_id = (last.id + 1) if last else 1
            self.invoice_number = f"INV-{next_id:06d}"
        super().save(*args, **kwargs)

    def recalculate(self):
        subtotal = sum((line.line_total for line in self.lines.all()), Decimal("0.00"))
        paid = sum((payment.amount for payment in self.payments.all()), Decimal("0.00"))
        self.subtotal = subtotal
        self.total_amount = max(subtotal - self.discount_amount + self.tax_amount, Decimal("0.00"))
        self.paid_amount = paid
        self.balance_amount = max(self.total_amount - paid, Decimal("0.00"))

        if self.status != InvoiceStatus.CANCELLED:
            if self.paid_amount <= 0:
                self.status = InvoiceStatus.ISSUED if self.issued_at else InvoiceStatus.DRAFT
            elif self.balance_amount <= 0:
                self.status = InvoiceStatus.PAID
            else:
                self.status = InvoiceStatus.PARTIAL
        self.save(update_fields=[
            "subtotal", "total_amount", "paid_amount", "balance_amount", "status", "updated_at"
        ])

    def issue(self):
        if not self.issued_at:
            self.issued_at = timezone.now()
        if self.status == InvoiceStatus.DRAFT:
            self.status = InvoiceStatus.ISSUED
        self.save(update_fields=["issued_at", "status", "updated_at"])


class InvoiceLine(TimeStampedModel):
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name="lines")
    charge_item = models.ForeignKey(ChargeItem, on_delete=models.SET_NULL, null=True, blank=True, related_name="invoice_lines")
    description = models.CharField(max_length=255)
    category = models.CharField(max_length=30, choices=ChargeCategory.choices, default=ChargeCategory.OTHER)
    quantity = models.DecimalField(max_digits=10, decimal_places=2, default=1)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    line_total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    source_module = models.CharField(max_length=50, blank=True)
    source_id = models.CharField(max_length=50, blank=True)

    class Meta:
        ordering = ["created_at"]

    def save(self, *args, **kwargs):
        self.line_total = self.quantity * self.unit_price
        super().save(*args, **kwargs)
        self.invoice.recalculate()

    def delete(self, *args, **kwargs):
        invoice = self.invoice
        result = super().delete(*args, **kwargs)
        invoice.recalculate()
        return result


class Payment(TimeStampedModel):
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name="payments")
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    method = models.CharField(max_length=30, choices=PaymentMethod.choices, default=PaymentMethod.CASH)
    reference = models.CharField(max_length=100, blank=True)
    received_at = models.DateTimeField(default=timezone.now)
    received_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="received_payments")
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-received_at"]

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        self.invoice.recalculate()

    def delete(self, *args, **kwargs):
        invoice = self.invoice
        result = super().delete(*args, **kwargs)
        invoice.recalculate()
        return result
