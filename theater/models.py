from django.db import models
from django.utils import timezone

from accounts.models import User
from billing.models import InvoiceLine
from core.models import TimeStampedModel
from patients.models import AdmissionRecord, Patient


class ProcedureType(models.TextChoices):
    MINOR = "minor", "Minor"
    MAJOR = "major", "Major"
    EMERGENCY = "emergency", "Emergency"
    ELECTIVE = "elective", "Elective"
    OTHER = "other", "Other"


class BookingStatus(models.TextChoices):
    SCHEDULED = "scheduled", "Scheduled"
    IN_PROGRESS = "in_progress", "In Progress"
    COMPLETED = "completed", "Completed"
    CANCELLED = "cancelled", "Cancelled"


class AnesthesiaType(models.TextChoices):
    NONE = "none", "None"
    LOCAL = "local", "Local"
    SPINAL = "spinal", "Spinal"
    GENERAL = "general", "General"
    SEDATION = "sedation", "Sedation"
    OTHER = "other", "Other"


class Procedure(TimeStampedModel):
    code = models.CharField(max_length=30, unique=True)
    name = models.CharField(max_length=200)
    procedure_type = models.CharField(max_length=30, choices=ProcedureType.choices, default=ProcedureType.MINOR)
    default_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    estimated_minutes = models.PositiveIntegerField(default=60)
    is_active = models.BooleanField(default=True)
    description = models.TextField(blank=True)

    class Meta:
        ordering = ["procedure_type", "name"]

    def __str__(self):
        return f"{self.code} - {self.name}"


class OperatingRoom(TimeStampedModel):
    name = models.CharField(max_length=100, unique=True)
    location = models.CharField(max_length=150, blank=True)
    is_active = models.BooleanField(default=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class TheaterBooking(TimeStampedModel):
    booking_number = models.CharField(max_length=30, unique=True, editable=False)
    patient = models.ForeignKey(Patient, on_delete=models.PROTECT, related_name="theater_bookings")
    admission = models.ForeignKey(AdmissionRecord, on_delete=models.SET_NULL, null=True, blank=True, related_name="theater_bookings")
    procedure = models.ForeignKey(Procedure, on_delete=models.PROTECT, related_name="bookings")
    operating_room = models.ForeignKey(OperatingRoom, on_delete=models.SET_NULL, null=True, blank=True, related_name="bookings")
    scheduled_at = models.DateTimeField()
    status = models.CharField(max_length=30, choices=BookingStatus.choices, default=BookingStatus.SCHEDULED)
    priority = models.CharField(
        max_length=20,
        choices=[("routine", "Routine"), ("urgent", "Urgent"), ("emergency", "Emergency")],
        default="routine",
    )
    surgeon = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="surgeon_bookings")
    assistant = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="assistant_bookings")
    nurse = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="theater_nurse_bookings")
    anesthesia_type = models.CharField(max_length=30, choices=AnesthesiaType.choices, default=AnesthesiaType.NONE)
    indication = models.TextField(blank=True)
    procedure_notes = models.TextField(blank=True)
    outcome = models.TextField(blank=True)
    complications = models.TextField(blank=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    booked_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="booked_theater_cases")
    completed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="completed_theater_cases")
    invoice_line = models.ForeignKey(InvoiceLine, on_delete=models.SET_NULL, null=True, blank=True, related_name="theater_bookings")

    class Meta:
        ordering = ["-scheduled_at", "-created_at"]

    def __str__(self):
        return self.booking_number or f"OT booking #{self.pk}"

    def save(self, *args, **kwargs):
        if not self.booking_number:
            last = TheaterBooking.objects.order_by("-id").first()
            next_id = (last.id + 1) if last else 1
            self.booking_number = f"OT-{next_id:06d}"
        super().save(*args, **kwargs)

    def mark_in_progress(self, user=None):
        self.status = BookingStatus.IN_PROGRESS
        self.started_at = self.started_at or timezone.now()
        self.save(update_fields=["status", "started_at", "updated_at"])

    def mark_completed(self, user=None):
        self.status = BookingStatus.COMPLETED
        self.completed_at = timezone.now()
        if user and getattr(user, "is_authenticated", False):
            self.completed_by = user
        self.save(update_fields=["status", "completed_at", "completed_by", "updated_at"])
