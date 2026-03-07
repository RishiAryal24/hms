# ----------------------------------------------------------------------
# LOCATION: HMS/accounts/views.py
# ACTION:   CREATE this file inside HMS/accounts/
# ----------------------------------------------------------------------

from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken

from shared.permissions import IsTenantAdmin
from .models import User, Role
from .serializers import (
    HMSTokenObtainPairSerializer,
    UserSerializer, UserCreateSerializer, UserUpdateSerializer,
    RoleSerializer, ChangePasswordSerializer,
)


# ========================
# Login / Logout / Refresh
# ========================

class LoginView(TokenObtainPairView):
    """
    POST /api/auth/login/
    Body: { "username": "...", "password": "..." }

    Returns:
    {
        "access":  "<short-lived token>",
        "refresh": "<long-lived token>",
        "user": { id, username, full_name, role, is_tenant_admin, ... }
    }
    """
    serializer_class = HMSTokenObtainPairSerializer


class RefreshTokenView(TokenRefreshView):
    """
    POST /api/auth/refresh/
    Body: { "refresh": "<refresh token>" }
    Returns a new access token.
    """
    pass


class LogoutView(APIView):
    """
    POST /api/auth/logout/
    Blacklists the refresh token so it cannot be reused.
    Body: { "refresh": "<refresh token>" }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            if not refresh_token:
                return Response(
                    {'error': 'Refresh token is required.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({'message': 'Logged out successfully.'})
        except Exception:
            return Response(
                {'error': 'Invalid or expired token.'},
                status=status.HTTP_400_BAD_REQUEST
            )


# ========================
# Current User
# ========================

class MeView(APIView):
    """
    GET  /api/auth/me/       — Get current logged-in user info
    PATCH /api/auth/me/      — Update own profile (name, phone, email)
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)

    def patch(self, request):
        serializer = UserSerializer(
            request.user, data=request.data, partial=True
        )
        # Only allow updating safe fields — not role or admin status
        allowed = ['first_name', 'last_name', 'email', 'phone']
        filtered_data = {k: v for k, v in request.data.items() if k in allowed}
        serializer = UserSerializer(request.user, data=filtered_data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class ChangePasswordView(APIView):
    """
    POST /api/auth/change-password/
    Any logged-in user can change their own password.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user
        if not user.check_password(serializer.validated_data['old_password']):
            return Response(
                {'error': 'Old password is incorrect.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user.set_password(serializer.validated_data['new_password'])
        user.save()
        return Response({'message': 'Password changed successfully. Please log in again.'})


# ========================
# Staff Management (Tenant Admin only)
# ========================

class StaffListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/auth/staff/        — List all staff in this hospital
    POST /api/auth/staff/        — Create a new staff user
    TENANT ADMIN ONLY
    """
    permission_classes = [IsTenantAdmin]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return UserCreateSerializer
        return UserSerializer

    def get_queryset(self):
        qs = User.objects.filter(is_superuser=False).select_related('role')
        role = self.request.query_params.get('role')
        if role:
            qs = qs.filter(role__name=role)
        return qs

    def create(self, request, *args, **kwargs):
        serializer = UserCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response({
            'message': f'Staff user {user.username} created successfully.',
            'data':    UserSerializer(user).data,
        }, status=status.HTTP_201_CREATED)


class StaffDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET    /api/auth/staff/<id>/   — Get staff details
    PATCH  /api/auth/staff/<id>/   — Update staff info
    DELETE /api/auth/staff/<id>/   — Deactivate staff (soft delete)
    TENANT ADMIN ONLY
    """
    permission_classes = [IsTenantAdmin]
    queryset           = User.objects.filter(is_superuser=False).select_related('role')

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return UserUpdateSerializer
        return UserSerializer

    def destroy(self, request, *args, **kwargs):
        # Soft delete — deactivate instead of deleting
        user            = self.get_object()
        user.is_active  = False
        user.save()
        return Response({'message': f'Staff user {user.username} has been deactivated.'})


class ResetStaffPasswordView(APIView):
    """
    POST /api/auth/staff/<id>/reset-password/
    TENANT ADMIN ONLY — Reset a staff member's password.
    Body: { "new_password": "..." }
    """
    permission_classes = [IsTenantAdmin]

    def post(self, request, pk):
        from django.shortcuts import get_object_or_404
        user         = get_object_or_404(User, pk=pk, is_superuser=False)
        new_password = request.data.get('new_password')
        if not new_password or len(new_password) < 8:
            return Response(
                {'error': 'Password must be at least 8 characters.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        user.set_password(new_password)
        user.save()
        return Response({'message': f'Password for {user.username} has been reset.'})


# ========================
# Roles (read-only for staff, manage for admin)
# ========================

class RoleListView(generics.ListAPIView):
    """
    GET /api/auth/roles/
    All authenticated users can see available roles.
    """
    permission_classes = [IsAuthenticated]
    serializer_class   = RoleSerializer
    queryset           = Role.objects.all()