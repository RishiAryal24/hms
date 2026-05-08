from django.db import models
from django.utils import timezone

from accounts.models import User
from billing.models import InvoiceLine
from core.models import TimeStampedModel
from patients.models import AdmissionRecord, Patient


class ItemCategory(models.TextChoices):
    MEDICINE = "medicine", "Medicine"
    CONSUMABLE = "consumable", "Consumable"
    EQUIPMENT = "equipment", "Equipment"
    OTHER = "other", "Other"


class MovementType(models.TextChoices):
    STOCK_IN = "stock_in", "Stock In"
    DISPENSE = "dispense", "Dispense"
    ADJUSTMENT = "adjustment", "Adjustment"


class PharmacyItem(TimeStampedModel):
    code = models.CharField(max_length=30, unique=True)
    name = models.CharField(max_length=200)
    category = models.CharField(max_length=30, choices=ItemCategory.choices, default=ItemCategory.MEDICINE)
    generic_name = models.CharField(max_length=200, blank=True)
    strength = models.CharField(max_length=100, blank=True)
    unit = models.CharField(max_length=40, default="pcs")
    supplier = models.CharField(max_length=200, blank=True)
    batch_number = models.CharField(max_length=80, blank=True)
    expiry_date = models.DateField(null=True, blank=True)
    purchase_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    selling_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    stock_quantity = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    reorder_level = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    is_active = models.BooleanField(default=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["name", "strength"]

    def __str__(self):
        return f"{self.code} - {self.name}"

    @property
    def is_low_stock(self):
        return self.stock_quantity <= self.reorder_level

    @property
    def is_expired(self):
        return bool(self.expiry_date and self.expiry_date < timezone.localdate())


class StockMovement(TimeStampedModel):
    item = models.ForeignKey(PharmacyItem, on_delete=models.PROTECT, related_name="movements")
    movement_type = models.CharField(max_length=30, choices=MovementType.choices)
    quantity = models.DecimalField(max_digits=12, decimal_places=2)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    patient = models.ForeignKey(Patient, on_delete=models.SET_NULL, null=True, blank=True, related_name="pharmacy_movements")
    admission = models.ForeignKey(AdmissionRecord, on_delete=models.SET_NULL, null=True, blank=True, related_name="pharmacy_movements")
    reference = models.CharField(max_length=120, blank=True)
    notes = models.TextField(blank=True)
    performed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="pharmacy_movements")
    invoice_line = models.ForeignKey(InvoiceLine, on_delete=models.SET_NULL, null=True, blank=True, related_name="pharmacy_movements")

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.item.name} {self.movement_type} {self.quantity}"

    @property
    def line_total(self):
        return self.quantity * self.unit_price
