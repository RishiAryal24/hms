from rest_framework import serializers

from accounts.models import User
from accounts.serializers import UserSerializer
from .models import DutyRoster, EmployeeProfile


class EmployeeProfileSerializer(serializers.ModelSerializer):
    user_detail = UserSerializer(source="user", read_only=True)
    role_name = serializers.CharField(source="user.role_name", read_only=True)
    department = serializers.CharField(source="user.department", read_only=True)

    class Meta:
        model = EmployeeProfile
        fields = "__all__"
        read_only_fields = ["created_at", "updated_at"]

    def validate_user(self, value):
        if value.is_superuser:
            raise serializers.ValidationError("Superusers cannot be HR employees.")
        qs = EmployeeProfile.objects.filter(user=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("This staff user already has an employee profile.")
        return value


class DutyRosterSerializer(serializers.ModelSerializer):
    employee_detail = EmployeeProfileSerializer(source="employee", read_only=True)
    assigned_by_name = serializers.CharField(source="assigned_by.get_full_name", read_only=True)

    class Meta:
        model = DutyRoster
        fields = "__all__"
        read_only_fields = ["assigned_by", "created_at", "updated_at"]

    def validate(self, attrs):
        start_time = attrs.get("start_time")
        end_time = attrs.get("end_time")
        if start_time and end_time and start_time == end_time:
            raise serializers.ValidationError({"end_time": "End time must differ from start time."})
        return attrs


class HRStaffOptionSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source="get_full_name", read_only=True)
    role_name = serializers.CharField(read_only=True)
    role_display = serializers.CharField(source="role.get_name_display", read_only=True)

    class Meta:
        model = User
        fields = ["id", "username", "full_name", "role_name", "role_display", "department", "employee_id"]
