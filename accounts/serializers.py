# ----------------------------------------------------------------------
# LOCATION: HMS/accounts/serializers.py
# ACTION:   CREATE this file inside HMS/accounts/
# ----------------------------------------------------------------------

from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import User, Role


class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Role
        fields = ['id', 'name', 'get_name_display']


class UserSerializer(serializers.ModelSerializer):
    role_name         = serializers.CharField(read_only=True)
    role_display      = serializers.CharField(source='role.get_name_display', read_only=True)
    full_name         = serializers.CharField(source='get_full_name', read_only=True)

    class Meta:
        model  = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 'full_name',
            'role', 'role_name', 'role_display',
            'is_tenant_admin', 'phone', 'department', 'employee_id',
            'is_active', 'date_joined',
        ]
        read_only_fields = ['id', 'date_joined']


class HMSTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Custom JWT serializer.
    Adds user info and role into the token payload and login response.
    Blocks superusers from logging in via this endpoint.
    """

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        # Embed user info directly into the token payload
        token['username']        = user.username
        token['full_name']       = user.get_full_name()
        token['email']           = user.email
        token['role']            = user.role_name
        token['is_tenant_admin'] = user.is_tenant_admin
        return token

    def validate(self, attrs):
        data = super().validate(attrs)

        # Block superusers — they use Django admin
        if self.user.is_superuser:
            raise serializers.ValidationError(
                'Superusers must log in via the Django admin panel.'
            )

        # Block inactive users
        if not self.user.is_active:
            raise serializers.ValidationError(
                'This account has been deactivated. Contact your administrator.'
            )

        # Attach user info to the response body
        data['user'] = {
            'id':              self.user.id,
            'username':        self.user.username,
            'full_name':       self.user.get_full_name(),
            'email':           self.user.email,
            'role':            self.user.role_name,
            'role_display':    self.user.role.get_name_display() if self.user.role else None,
            'is_tenant_admin': self.user.is_tenant_admin,
            'department':      self.user.department,
            'employee_id':     self.user.employee_id,
        }
        return data


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True, write_only=True)
    new_password = serializers.CharField(required=True, write_only=True, min_length=8)
    confirm_password = serializers.CharField(required=True, write_only=True)

    def validate(self, data):
        if data['new_password'] != data['confirm_password']:
            raise serializers.ValidationError('New passwords do not match.')
        return data


class UserCreateSerializer(serializers.ModelSerializer):
    """Used by tenant admin to create new staff users."""
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model  = User
        fields = [
            'username', 'password', 'email',
            'first_name', 'last_name',
            'role', 'phone', 'department', 'employee_id',
            'is_tenant_admin',
        ]

    def create(self, validated_data):
        password = validated_data.pop('password')
        user     = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    """Used by tenant admin to update staff info."""
    class Meta:
        model  = User
        fields = [
            'email', 'first_name', 'last_name',
            'role', 'phone', 'department', 'employee_id',
            'is_active', 'is_tenant_admin',
        ]