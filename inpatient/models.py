from django.db import models
from django.utils import timezone

from accounts.models import User
from core.models import TimeStampedModel
from patients.models import AdmissionRecord, Patient


class WardType(models.TextChoices):
    GENERAL = "general", "General"
    PRIVATE = "private", "Private"
    ICU = "icu", "ICU"
    NICU = "nicu", "NICU"
    MATERNITY = "maternity", "Maternity"
    EMERGENCY = "emergency", "Emergency"


class BedStatus(models.TextChoices):
    AVAILABLE = "available", "Available"
    OCCUPIED = "occupied", "Occupied"
    RESERVED = "reserved", "Reserved"
    CLEANING = "cleaning", "Cleaning"
    MAINTENANCE = "maintenance", "Maintenance"


class AssignmentStatus(models.TextChoices):
    ACTIVE = "active", "Active"
    RELEASED = "released", "Released"
    TRANSFERRED = "transferred", "Transferred"


class Ward(TimeStampedModel):
    name = models.CharField(max_length=100, unique=True)
    ward_type = models.CharField(max_length=20, choices=WardType.choices, default=WardType.GENERAL)
    department = models.CharField(max_length=100, blank=True)
    floor = models.CharField(max_length=50, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Room(TimeStampedModel):
    ward = models.ForeignKey(Ward, on_delete=models.CASCADE, related_name="rooms")
    room_number = models.CharField(max_length=30)
    room_type = models.CharField(max_length=50, blank=True)
    daily_rate = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["ward__name", "room_number"]
        unique_together = ("ward", "room_number")

    def __str__(self):
        return f"{self.ward.name} / {self.room_number}"


class Bed(TimeStampedModel):
    ward = models.ForeignKey(Ward, on_delete=models.CASCADE, related_name="beds")
    room = models.ForeignKey(Room, on_delete=models.SET_NULL, null=True, blank=True, related_name="beds")
    bed_number = models.CharField(max_length=30)
    status = models.CharField(max_length=20, choices=BedStatus.choices, default=BedStatus.AVAILABLE)
    daily_rate = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["ward__name", "bed_number"]
        unique_together = ("ward", "bed_number")

    def __str__(self):
        return f"{self.ward.name} - {self.bed_number}"

    @property
    def effective_daily_rate(self):
        if self.daily_rate is not None:
            return self.daily_rate
        if self.room_id:
            return self.room.daily_rate
        return 0


class BedAssignment(TimeStampedModel):
    admission = models.ForeignKey(AdmissionRecord, on_delete=models.CASCADE, related_name="bed_assignments")
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name="bed_assignments")
    bed = models.ForeignKey(Bed, on_delete=models.PROTECT, related_name="assignments")
    status = models.CharField(max_length=20, choices=AssignmentStatus.choices, default=AssignmentStatus.ACTIVE)
    assigned_at = models.DateTimeField(default=timezone.now)
    released_at = models.DateTimeField(null=True, blank=True)
    assigned_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="bed_assignments")
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-assigned_at"]
        indexes = [
            models.Index(fields=["status", "assigned_at"]),
        ]

    def __str__(self):
        return f"{self.admission.admission_number} -> {self.bed}"

    def save(self, *args, **kwargs):
        if self.status == AssignmentStatus.ACTIVE:
            BedAssignment.objects.filter(
                admission=self.admission,
                status=AssignmentStatus.ACTIVE,
            ).exclude(pk=self.pk).update(status=AssignmentStatus.TRANSFERRED, released_at=timezone.now())
            self.bed.status = BedStatus.OCCUPIED
            self.bed.save(update_fields=["status", "updated_at"])
            self.admission.ward = self.bed.ward.name
            self.admission.bed_number = self.bed.bed_number
            self.admission.save(update_fields=["ward", "bed_number", "updated_at"])
        super().save(*args, **kwargs)

    def release(self):
        self.status = AssignmentStatus.RELEASED
        self.released_at = timezone.now()
        self.save(update_fields=["status", "released_at", "updated_at"])
        self.bed.status = BedStatus.CLEANING
        self.bed.save(update_fields=["status", "updated_at"])


class BedTransfer(TimeStampedModel):
    admission = models.ForeignKey(AdmissionRecord, on_delete=models.CASCADE, related_name="bed_transfers")
    from_bed = models.ForeignKey(Bed, on_delete=models.PROTECT, related_name="transfers_from")
    to_bed = models.ForeignKey(Bed, on_delete=models.PROTECT, related_name="transfers_to")
    transferred_at = models.DateTimeField(default=timezone.now)
    reason = models.TextField(blank=True)
    transferred_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="bed_transfers")

    class Meta:
        ordering = ["-transferred_at"]

    def __str__(self):
        return f"{self.admission.admission_number}: {self.from_bed} -> {self.to_bed}"


class NursingRound(TimeStampedModel):
    admission = models.ForeignKey(AdmissionRecord, on_delete=models.CASCADE, related_name="nursing_rounds")
    nurse = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="nursing_rounds")
    round_time = models.DateTimeField(default=timezone.now)
    condition = models.CharField(max_length=150, blank=True)
    intake_output = models.TextField(blank=True)
    pain_score = models.PositiveIntegerField(null=True, blank=True)
    notes = models.TextField()

    class Meta:
        ordering = ["-round_time"]

    def __str__(self):
        return f"Nursing round {self.admission.admission_number} @ {self.round_time:%Y-%m-%d %H:%M}"


class DoctorRound(TimeStampedModel):
    admission = models.ForeignKey(AdmissionRecord, on_delete=models.CASCADE, related_name="doctor_rounds")
    doctor = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name="ipd_doctor_rounds",
        limit_choices_to={"role__name": "doctor"},
    )
    round_time = models.DateTimeField(default=timezone.now)
    condition = models.CharField(max_length=150, blank=True)
    diagnosis = models.TextField(blank=True)
    treatment_plan = models.TextField(blank=True)
    notes = models.TextField()
    visit_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    invoice_line = models.ForeignKey(
        "billing.InvoiceLine",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="doctor_rounds",
    )

    class Meta:
        ordering = ["-round_time"]

    def __str__(self):
        return f"Doctor round {self.admission.admission_number} @ {self.round_time:%Y-%m-%d %H:%M}"


class DoctorOrder(TimeStampedModel):
    class OrderType(models.TextChoices):
        MEDICATION = "medication", "Medication"
        INVESTIGATION = "investigation", "Investigation"
        NURSING = "nursing", "Nursing"
        DIET = "diet", "Diet"
        ACTIVITY = "activity", "Activity"
        OTHER = "other", "Other"

    class Priority(models.TextChoices):
        ROUTINE = "routine", "Routine"
        URGENT = "urgent", "Urgent"
        STAT = "stat", "STAT"

    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"

    admission = models.ForeignKey(AdmissionRecord, on_delete=models.CASCADE, related_name="doctor_orders")
    doctor = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name="ipd_doctor_orders",
        limit_choices_to={"role__name": "doctor"},
    )
    order_type = models.CharField(max_length=30, choices=OrderType.choices, default=OrderType.MEDICATION)
    priority = models.CharField(max_length=20, choices=Priority.choices, default=Priority.ROUTINE)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    title = models.CharField(max_length=200)
    instructions = models.TextField()
    ordered_at = models.DateTimeField(default=timezone.now)
    completed_at = models.DateTimeField(null=True, blank=True)
    completed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="completed_ipd_orders",
    )

    class Meta:
        ordering = ["status", "-ordered_at"]

    def __str__(self):
        return f"{self.get_order_type_display()} order - {self.admission.admission_number}"
