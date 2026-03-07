# tenants/models.py

from django_tenants.models import TenantMixin, DomainMixin
from django.db import models
from django.contrib.auth.models import AbstractUser


class SuperAdmin(AbstractUser):
    """
    Lives in the PUBLIC schema only.
    Completely separate from tenant hospital users.
    """
    groups = models.ManyToManyField(
        'auth.Group',
        blank=True,
        related_name='superadmin_set',      # ← avoids clash with accounts.User
        related_query_name='superadmin',
    )
    user_permissions = models.ManyToManyField(
        'auth.Permission',
        blank=True,
        related_name='superadmin_set',      # ← avoids clash with accounts.User
        related_query_name='superadmin',
    )

    class Meta:
        app_label = 'tenants'

    def __str__(self):
        return self.username


class Client(TenantMixin):
    name = models.CharField(max_length=100)
    created_on = models.DateField(auto_now_add=True)
    auto_create_schema = True

    def __str__(self):
        return self.name


class Domain(DomainMixin):
    pass