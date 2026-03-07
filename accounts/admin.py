# ----------------------------------------------------------------------
# LOCATION: HMS/accounts/admin.py
# ACTION:   REPLACE the entire contents of this file
# ----------------------------------------------------------------------

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.db import connection
from .models import User, Role


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display    = ['username', 'email', 'get_full_name', 'role', 'is_tenant_admin', 'is_active']
    list_filter     = ['role', 'is_tenant_admin', 'is_active']
    search_fields   = ['username', 'email', 'first_name', 'last_name', 'employee_id']
    fieldsets       = BaseUserAdmin.fieldsets + (
        ('HMS Info', {
            'fields': ('role', 'is_tenant_admin', 'phone', 'department', 'employee_id')
        }),
    )

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        # Only show users belonging to the current tenant schema
        if connection.schema_name == 'public':
            return qs
        return qs.filter(is_superuser=False)


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display      = ['name']
    filter_horizontal = ['permissions']