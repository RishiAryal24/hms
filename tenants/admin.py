from django.contrib import admin
from django_tenants.utils import get_public_schema_name
from django.db import connection
from .models import Client, Domain


class DomainInline(admin.TabularInline):
    model = Domain
    extra = 1


@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    list_display = ('name', 'schema_name', 'created_on')
    search_fields = ('name', 'schema_name')
    inlines = [DomainInline]

    def has_module_perms(self, request):
        return connection.schema_name == get_public_schema_name()

    def has_add_permission(self, request):
        return connection.schema_name == get_public_schema_name()

    def has_change_permission(self, request, obj=None):
        return connection.schema_name == get_public_schema_name()

    def has_delete_permission(self, request, obj=None):
        return connection.schema_name == get_public_schema_name()

    def has_view_permission(self, request, obj=None):
        return connection.schema_name == get_public_schema_name()


@admin.register(Domain)
class DomainAdmin(admin.ModelAdmin):
    list_display = ('domain', 'tenant', 'is_primary')
    search_fields = ('domain',)

    def has_module_perms(self, request):
        return connection.schema_name == get_public_schema_name()

    def has_add_permission(self, request):
        return connection.schema_name == get_public_schema_name()

    def has_change_permission(self, request, obj=None):
        return connection.schema_name == get_public_schema_name()

    def has_delete_permission(self, request, obj=None):
        return connection.schema_name == get_public_schema_name()

    def has_view_permission(self, request, obj=None):
        return connection.schema_name == get_public_schema_name()