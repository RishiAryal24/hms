from django.db import models
from django.utils import timezone

from accounts.models import User
from core.models import TimeStampedModel


class EmploymentType(models.TextChoices):
    PERMANENT = "permanent", "Permanent"
    CONTRACT = "contract", "Contract"
    VISITING = "visiting", "Visiting"
    INTERN = "intern", "Intern"
    OTHER = "other", "Other"


class EmploymentStatus(models.TextChoices):
    ACTIVE = "active", "Active"
    ON_LEAVE = "on_leave", "On Leave"
    SUSPENDED = "suspended", "Suspended"
    RESIGNED = "resigned", "Resigned"


class ShiftType(models.TextChoices):
    MORNING = "morning", "Morning"
    EVENING = "evening", "Evening"
    NIGHT = "night", "Night"
    ON_CALL = "on_call", "On Call"


class DutyLocation(models.TextChoices):
    OPD = "opd", "OPD"
    IPD = "ipd", "IPD"
    LAB = "lab", "Lab"
    PHARMACY = "pharmacy", "Pharmacy"
    OT = "ot", "OT"
    RECEPTION = "reception", "Reception"
    BILLING = "billing", "Billing"
    ADMIN = "admin", "Admin"
    OTHER = "other", "Other"


class AttendanceStatus(models.TextChoices):
    PRESENT = "present", "Present"
    ABSENT = "absent", "Absent"
    LATE = "late", "Late"
    HALF_DAY = "half_day", "Half Day"


class LeaveType(models.TextChoices):
    SICK = "sick", "Sick"
    ANNUAL = "annual", "Annual"
    EMERGENCY = "emergency", "Emergency"
    UNPAID = "unpaid", "Unpaid"
    OTHER = "other", "Other"


class LeaveStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    APPROVED = "approved", "Approved"
    REJECTED = "rejected", "Rejected"


class EmployeeProfile(TimeStampedModel):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="hr_profile")
    employee_code = models.CharField(max_length=50, unique=True)
    employment_type = models.CharField(max_length=30, choices=EmploymentType.choices, default=EmploymentType.PERMANENT)
    status = models.CharField(max_length=30, choices=EmploymentStatus.choices, default=EmploymentStatus.ACTIVE)
    joining_date = models.DateField(null=True, blank=True)
    designation = models.CharField(max_length=120, blank=True)
    emergency_contact = models.CharField(max_length=120, blank=True)
    address = models.TextField(blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["user__first_name", "user__last_name", "employee_code"]

    def __str__(self):
        return f"{self.employee_code} - {self.user.get_full_name() or self.user.username}"


class DutyRoster(TimeStampedModel):
    employee = models.ForeignKey(EmployeeProfile, on_delete=models.CASCADE, related_name="duty_rosters")
    duty_date = models.DateField()
    shift = models.CharField(max_length=30, choices=ShiftType.choices, default=ShiftType.MORNING)
    location = models.CharField(max_length=30, choices=DutyLocation.choices, default=DutyLocation.OPD)
    department = models.CharField(max_length=100, blank=True)
    start_time = models.TimeField(null=True, blank=True)
    end_time = models.TimeField(null=True, blank=True)
    notes = models.TextField(blank=True)
    assigned_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="assigned_duty_rosters")

    class Meta:
        ordering = ["-duty_date", "shift", "employee__user__first_name"]
        unique_together = ("employee", "duty_date", "shift", "location")

    def __str__(self):
        return f"{self.employee} - {self.duty_date} {self.shift}"


class AttendanceRecord(TimeStampedModel):
    employee = models.ForeignKey(EmployeeProfile, on_delete=models.CASCADE, related_name="attendance_records")
    roster = models.ForeignKey(DutyRoster, on_delete=models.SET_NULL, null=True, blank=True, related_name="attendance_records")
    attendance_date = models.DateField(default=timezone.localdate)
    status = models.CharField(max_length=30, choices=AttendanceStatus.choices, default=AttendanceStatus.PRESENT)
    check_in = models.TimeField(null=True, blank=True)
    check_out = models.TimeField(null=True, blank=True)
    notes = models.TextField(blank=True)
    recorded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="recorded_attendance")

    class Meta:
        ordering = ["-attendance_date", "employee__user__first_name"]
        unique_together = ("employee", "attendance_date")

    def __str__(self):
        return f"{self.employee} - {self.attendance_date} {self.status}"


class LeaveRequest(TimeStampedModel):
    employee = models.ForeignKey(EmployeeProfile, on_delete=models.CASCADE, related_name="leave_requests")
    leave_type = models.CharField(max_length=30, choices=LeaveType.choices, default=LeaveType.SICK)
    start_date = models.DateField()
    end_date = models.DateField()
    status = models.CharField(max_length=30, choices=LeaveStatus.choices, default=LeaveStatus.PENDING)
    reason = models.TextField(blank=True)
    decision_notes = models.TextField(blank=True)
    requested_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="requested_leaves")
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name="approved_leaves")
    approved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.employee} - {self.leave_type} ({self.start_date} to {self.end_date})"
