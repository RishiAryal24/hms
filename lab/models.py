from django.db import models
from django.utils import timezone

from accounts.models import User
from billing.models import InvoiceLine
from core.models import TimeStampedModel
from patients.models import AdmissionRecord, Patient


class LabTestCategory(models.TextChoices):
    HEMATOLOGY = "hematology", "Hematology"
    BIOCHEMISTRY = "biochemistry", "Biochemistry"
    MICROBIOLOGY = "microbiology", "Microbiology"
    SEROLOGY = "serology", "Serology"
    RADIOLOGY = "radiology", "Radiology"
    PATHOLOGY = "pathology", "Pathology"
    OTHER = "other", "Other"


class LabOrderStatus(models.TextChoices):
    ORDERED = "ordered", "Ordered"
    SAMPLE_COLLECTED = "sample_collected", "Sample Collected"
    PROCESSING = "processing", "Processing"
    COMPLETED = "completed", "Completed"
    CANCELLED = "cancelled", "Cancelled"


class LabTest(TimeStampedModel):
    code = models.CharField(max_length=30, unique=True)
    name = models.CharField(max_length=200)
    category = models.CharField(max_length=30, choices=LabTestCategory.choices, default=LabTestCategory.OTHER)
    sample_type = models.CharField(max_length=100, blank=True)
    normal_range = models.CharField(max_length=120, blank=True)
    unit = models.CharField(max_length=40, blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    turnaround_hours = models.PositiveIntegerField(default=24)
    is_active = models.BooleanField(default=True)
    description = models.TextField(blank=True)

    class Meta:
        ordering = ["category", "name"]

    def __str__(self):
        return f"{self.code} - {self.name}"


class LabOrder(TimeStampedModel):
    patient = models.ForeignKey(Patient, on_delete=models.PROTECT, related_name="lab_orders")
    admission = models.ForeignKey(AdmissionRecord, on_delete=models.SET_NULL, null=True, blank=True, related_name="lab_orders")
    order_number = models.CharField(max_length=30, unique=True, editable=False)
    status = models.CharField(max_length=30, choices=LabOrderStatus.choices, default=LabOrderStatus.ORDERED)
    priority = models.CharField(
        max_length=20,
        choices=[("routine", "Routine"), ("urgent", "Urgent"), ("stat", "STAT")],
        default="routine",
    )
    clinical_notes = models.TextField(blank=True)
    ordered_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="ordered_lab_tests")
    collected_at = models.DateTimeField(null=True, blank=True)
    collected_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="collected_lab_samples")
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.order_number or f"Lab order #{self.pk}"

    def save(self, *args, **kwargs):
        if not self.order_number:
            last = LabOrder.objects.order_by("-id").first()
            next_id = (last.id + 1) if last else 1
            self.order_number = f"LAB-{next_id:06d}"
        super().save(*args, **kwargs)

    def refresh_status(self):
        items = list(self.items.all())
        if items and all(item.status == "completed" for item in items):
            self.status = LabOrderStatus.COMPLETED
            self.completed_at = timezone.now()
        elif self.collected_at:
            self.status = LabOrderStatus.PROCESSING
        self.save(update_fields=["status", "completed_at", "updated_at"])


class LabOrderItem(TimeStampedModel):
    order = models.ForeignKey(LabOrder, on_delete=models.CASCADE, related_name="items")
    test = models.ForeignKey(LabTest, on_delete=models.PROTECT, related_name="order_items")
    status = models.CharField(max_length=30, choices=LabOrderStatus.choices, default=LabOrderStatus.ORDERED)
    result_value = models.CharField(max_length=255, blank=True)
    result_notes = models.TextField(blank=True)
    is_abnormal = models.BooleanField(default=False)
    resulted_at = models.DateTimeField(null=True, blank=True)
    resulted_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="entered_lab_results")
    invoice_line = models.ForeignKey(InvoiceLine, on_delete=models.SET_NULL, null=True, blank=True, related_name="lab_order_items")

    class Meta:
        ordering = ["test__category", "test__name"]
        unique_together = ("order", "test")

    def __str__(self):
        return f"{self.order.order_number} - {self.test.name}"
