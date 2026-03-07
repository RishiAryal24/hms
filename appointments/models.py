# ----------------------------------------------------------------------
# LOCATION: HMS/appointments/models.py
# ACTION:   CREATE new folder HMS/appointments/ then create this file
#           Also create HMS/appointments/__init__.py as a blank empty file
# ----------------------------------------------------------------------

from django.db import models
from django.core.validators import MinValueValidator
from core.models import TimeStampedModel
from accounts.models import User
from patients.models import Patient


# ========================
# Choices
# ========================

class AppointmentStatus(models.TextChoices):
    SCHEDULED = 'scheduled', 'Scheduled'
    COMPLETED = 'completed', 'Completed'
    CANCELLED = 'cancelled', 'Cancelled'
    NO_SHOW   = 'no_show',   'No Show'

class AppointmentType(models.TextChoices):
    NEW_PATIENT  = 'new_patient',  'New Patient'
    FOLLOW_UP    = 'follow_up',    'Follow Up'
    WALK_IN      = 'walk_in',      'Walk In'
    REFERRAL     = 'referral',     'Referral'

class DayOfWeek(models.TextChoices):
    MONDAY    = 'monday',    'Monday'
    TUESDAY   = 'tuesday',   'Tuesday'
    WEDNESDAY = 'wednesday', 'Wednesday'
    THURSDAY  = 'thursday',  'Thursday'
    FRIDAY    = 'friday',    'Friday'
    SATURDAY  = 'saturday',  'Saturday'
    SUNDAY    = 'sunday',    'Sunday'


# ========================
# Doctor Schedule
# ========================

class DoctorSchedule(TimeStampedModel):
    """
    Defines weekly availability for a doctor.
    One record per day the doctor is available.
    Used to validate appointment slots.
    """
    doctor         = models.ForeignKey(
        User, on_delete=models.CASCADE,
        related_name='schedules',
        limit_choices_to={'role__name': 'doctor'}
    )
    day_of_week    = models.CharField(max_length=10, choices=DayOfWeek.choices)
    start_time     = models.TimeField()
    end_time       = models.TimeField()
    slot_duration  = models.PositiveIntegerField(
        default=15,
        help_text='Duration of each appointment slot in minutes.'
    )
    max_patients   = models.PositiveIntegerField(
        default=20,
        help_text='Maximum patients allowed per day.'
    )
    is_active      = models.BooleanField(default=True)
    department     = models.CharField(max_length=100, blank=True)
    notes          = models.TextField(blank=True)

    class Meta:
        unique_together = ['doctor', 'day_of_week']
        ordering        = ['day_of_week', 'start_time']

    def __str__(self):
        return f"Dr. {self.doctor.get_full_name()} — {self.get_day_of_week_display()} {self.start_time}–{self.end_time}"


# ========================
# Doctor Leave
# ========================

class DoctorLeave(TimeStampedModel):
    """
    Marks a doctor as unavailable for a specific date range.
    Appointments cannot be booked on leave dates.
    """
    doctor     = models.ForeignKey(
        User, on_delete=models.CASCADE,
        related_name='leaves',
        limit_choices_to={'role__name': 'doctor'}
    )
    start_date = models.DateField()
    end_date   = models.DateField()
    reason     = models.CharField(max_length=255, blank=True)
    approved   = models.BooleanField(default=True)

    class Meta:
        ordering = ['-start_date']

    def __str__(self):
        return f"Dr. {self.doctor.get_full_name()} leave: {self.start_date} to {self.end_date}"


# ========================
# Appointment
# ========================

class Appointment(TimeStampedModel):
    """
    OPD appointment booked by receptionist for a patient.
    Auto-generates token number per doctor per day.
    """
    # Core
    patient            = models.ForeignKey(Patient, on_delete=models.CASCADE,
                                           related_name='appointments')
    doctor             = models.ForeignKey(
        User, on_delete=models.CASCADE,
        related_name='appointments',
        limit_choices_to={'role__name': 'doctor'}
    )
    appointment_date   = models.DateField()
    appointment_time   = models.TimeField()
    appointment_type   = models.CharField(max_length=20, choices=AppointmentType.choices,
                                          default=AppointmentType.WALK_IN)
    status             = models.CharField(max_length=20, choices=AppointmentStatus.choices,
                                          default=AppointmentStatus.SCHEDULED)

    # Token / Queue
    token_number       = models.PositiveIntegerField(editable=False)
    department         = models.CharField(max_length=100, blank=True)

    # Clinical
    chief_complaint    = models.TextField(blank=True)
    notes              = models.TextField(blank=True)
    diagnosis          = models.TextField(blank=True)
    prescription       = models.TextField(blank=True)

    # Follow-up
    requires_follow_up = models.BooleanField(default=False)
    follow_up_date     = models.DateField(null=True, blank=True)
    follow_up_notes    = models.TextField(blank=True)
    follow_up_of       = models.ForeignKey(
        'self', on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='follow_ups',
        help_text='Link to the original appointment this is a follow-up of.'
    )

    # Billing
    consultation_fee   = models.DecimalField(max_digits=10, decimal_places=2,
                                             null=True, blank=True,
                                             validators=[MinValueValidator(0)])
    is_paid            = models.BooleanField(default=False)
    payment_notes      = models.TextField(blank=True)

    # Staff
    booked_by          = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True,
        related_name='booked_appointments',
        help_text='Receptionist who booked this appointment.'
    )
    cancelled_by       = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='cancelled_appointments'
    )
    cancellation_reason = models.TextField(blank=True)

    class Meta:
        ordering        = ['appointment_date', 'token_number']
        unique_together = ['doctor', 'appointment_date', 'token_number']

    def __str__(self):
        return f"Token {self.token_number} — {self.patient.get_full_name()} with Dr. {self.doctor.get_full_name()} on {self.appointment_date}"

    def save(self, *args, **kwargs):
        # Auto-generate token number per doctor per day
        if not self.token_number:
            last = Appointment.objects.filter(
                doctor=self.doctor,
                appointment_date=self.appointment_date
            ).order_by('-token_number').first()
            self.token_number = (last.token_number + 1) if last else 1
        super().save(*args, **kwargs)


# ========================
# Appointment Queue
# ========================

class AppointmentQueue(models.Model):
    """
    Live queue tracking for the OPD waiting room.
    Updated in real time as patients are called in.
    """
    class QueueStatus(models.TextChoices):
        WAITING    = 'waiting',    'Waiting'
        IN_ROOM    = 'in_room',    'In Room'
        COMPLETED  = 'completed',  'Completed'
        SKIPPED    = 'skipped',    'Skipped'

    appointment  = models.OneToOneField(Appointment, on_delete=models.CASCADE,
                                        related_name='queue_entry')
    status       = models.CharField(max_length=20, choices=QueueStatus.choices,
                                    default=QueueStatus.WAITING)
    checked_in_at  = models.DateTimeField(null=True, blank=True)
    called_in_at   = models.DateTimeField(null=True, blank=True)
    completed_at   = models.DateTimeField(null=True, blank=True)
    waiting_room   = models.CharField(max_length=100, blank=True)

    class Meta:
        ordering = ['appointment__token_number']

    def __str__(self):
        return f"Queue: Token {self.appointment.token_number} — {self.status}"