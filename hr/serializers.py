from rest_framework import serializers

from accounts.models import User
from accounts.serializers import UserSerializer
from .models import AttendanceRecord, DutyRoster, EmployeeProfile, LeaveRequest


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


class AttendanceRecordSerializer(serializers.ModelSerializer):
    employee_detail = EmployeeProfileSerializer(source="employee", read_only=True)
    roster_detail = DutyRosterSerializer(source="roster", read_only=True)
    recorded_by_name = serializers.CharField(source="recorded_by.get_full_name", read_only=True)

    class Meta:
        model = AttendanceRecord
        fields = "__all__"
        read_only_fields = ["recorded_by", "created_at", "updated_at"]

    def validate(self, attrs):
        roster = attrs.get("roster")
        employee = attrs.get("employee")
        if roster and employee and roster.employee_id != employee.id:
            raise serializers.ValidationError({"roster": "Roster must belong to selected employee."})
        return attrs


class LeaveRequestSerializer(serializers.ModelSerializer):
    employee_detail = EmployeeProfileSerializer(source="employee", read_only=True)
    requested_by_name = serializers.CharField(source="requested_by.get_full_name", read_only=True)
    approved_by_name = serializers.CharField(source="approved_by.get_full_name", read_only=True)

    class Meta:
        model = LeaveRequest
        fields = "__all__"
        read_only_fields = ["requested_by", "approved_by", "approved_at", "created_at", "updated_at"]

    def validate(self, attrs):
        start_date = attrs.get("start_date", getattr(self.instance, "start_date", None))
        end_date = attrs.get("end_date", getattr(self.instance, "end_date", None))
        if start_date and end_date and end_date < start_date:
            raise serializers.ValidationError({"end_date": "End date cannot be before start date."})
        return attrs


class HRStaffOptionSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source="get_full_name", read_only=True)
    role_name = serializers.CharField(read_only=True)
    role_display = serializers.CharField(source="role.get_name_display", read_only=True)

    class Meta:
        model = User
        fields = ["id", "username", "full_name", "role_name", "role_display", "department", "employee_id"]
