# ----------------------------------------------------------------------
# LOCATION: HMS/accounts/models.py
# ACTION:   REPLACE the entire contents of this file
# ----------------------------------------------------------------------

from django.contrib.auth.models import AbstractUser, Permission
from django.db import models


class Role(models.Model):
    """
    Tenant-scoped roles assigned to hospital staff.
    """
    ROLE_CHOICES = [
        ('hospital_admin', 'Hospital Admin'),
        ('doctor',         'Doctor'),
        ('nurse',          'Nurse'),
        ('receptionist',   'Receptionist'),
        ('pharmacist',     'Pharmacist'),
        ('lab_technician', 'Lab Technician'),
        ('billing_staff',  'Billing Staff'),
    ]
    name        = models.CharField(max_length=50, choices=ROLE_CHOICES, unique=True)
    permissions = models.ManyToManyField(
        'auth.Permission',
        blank=True,
        related_name='role_set',
    )

    def __str__(self):
        return self.get_name_display()


class User(AbstractUser):
    """
    Tenant-scoped hospital staff user.
    Lives inside each hospital's PostgreSQL schema.
    """
    role = models.ForeignKey(
        Role,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='users'
    )
    is_tenant_admin = models.BooleanField(
        default=False,
        help_text='Designates this user as the hospital administrator.'
    )
    phone       = models.CharField(max_length=20, blank=True)
    department  = models.CharField(max_length=100, blank=True)
    employee_id = models.CharField(max_length=50, blank=True, null=True, unique=True)

    # Prevent clashes with auth.User reverse accessors
    groups = models.ManyToManyField(
        'auth.Group',
        blank=True,
        related_name='accounts_user_set',
        related_query_name='accounts_user',
    )
    user_permissions = models.ManyToManyField(
        'auth.Permission',
        blank=True,
        related_name='accounts_user_set',
        related_query_name='accounts_user',
    )

    def __str__(self):
        return f"{self.get_full_name()} ({self.email})"

    @property
    def role_name(self):
        return self.role.name if self.role else None