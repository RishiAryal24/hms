from django.db import models
from django.core.validators import MinValueValidator

from accounts.models import User
from core.models import TimeStampedModel


class DoctorProfile(TimeStampedModel):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="doctor_profile")
    specialty = models.CharField(max_length=120)
    department = models.CharField(max_length=120, blank=True)
    license_number = models.CharField(max_length=80, unique=True)
    qualification = models.CharField(max_length=255, blank=True)
    years_experience = models.PositiveIntegerField(default=0)
    consultation_fee = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)],
    )
    is_available = models.BooleanField(default=True)
    room_number = models.CharField(max_length=50, blank=True)
    signature_text = models.CharField(max_length=150, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["user__first_name", "user__last_name", "specialty"]

    def __str__(self):
        return f"Dr. {self.user.get_full_name() or self.user.username} - {self.specialty}"


class NurseProfile(TimeStampedModel):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="nurse_profile")
    registration_number = models.CharField(max_length=80, unique=True)
    ward = models.CharField(max_length=120, blank=True)
    department = models.CharField(max_length=120, blank=True)
    qualification = models.CharField(max_length=255, blank=True)
    shift = models.CharField(
        max_length=30,
        choices=[
            ("morning", "Morning"),
            ("evening", "Evening"),
            ("night", "Night"),
            ("rotating", "Rotating"),
        ],
        default="rotating",
    )
    is_charge_nurse = models.BooleanField(default=False)
    is_available = models.BooleanField(default=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["ward", "user__first_name", "user__last_name"]

    def __str__(self):
        return f"{self.user.get_full_name() or self.user.username} - {self.ward or 'Nurse'}"
