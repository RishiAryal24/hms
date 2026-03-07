# ----------------------------------------------------------------------
# LOCATION: HMS/shared/permissions.py
# ACTION:   CREATE new folder HMS/shared/ then create this file inside it
#           Also create HMS/shared/__init__.py as a blank empty file
# ----------------------------------------------------------------------

from rest_framework.permissions import BasePermission


class IsTenantAdmin(BasePermission):
    """
    Allows access only to hospital admins (is_tenant_admin=True)
    or Django superusers.
    """
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            (request.user.is_tenant_admin or request.user.is_superuser)
        )


def role_required(*roles):
    """
    Returns a DRF permission class that allows access to users
    whose role.name matches one of the given roles.
    Hospital admins and superusers always pass through.

    Usage:
        permission_classes = [role_required('receptionist', 'doctor')]
    """
    class RolePermission(BasePermission):
        def has_permission(self, request, view):
            if not request.user or not request.user.is_authenticated:
                return False
            if request.user.is_tenant_admin or request.user.is_superuser:
                return True
            return getattr(request.user, 'role_name', None) in roles

    RolePermission.__name__ = f"RolePermission[{', '.join(roles)}]"
    return RolePermission