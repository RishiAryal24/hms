from rest_framework import serializers

from accounts.models import User
from accounts.serializers import UserSerializer
from .models import DoctorProfile, NurseProfile


class DoctorProfileSerializer(serializers.ModelSerializer):
    user_detail = UserSerializer(source="user", read_only=True)
    full_name = serializers.CharField(source="user.get_full_name", read_only=True)
    username = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = DoctorProfile
        fields = "__all__"
        read_only_fields = ["created_at", "updated_at"]

    def validate_user(self, user):
        if user.role_name != "doctor":
            raise serializers.ValidationError("Selected user must have the doctor role.")
        return user


class NurseProfileSerializer(serializers.ModelSerializer):
    user_detail = UserSerializer(source="user", read_only=True)
    full_name = serializers.CharField(source="user.get_full_name", read_only=True)
    username = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = NurseProfile
        fields = "__all__"
        read_only_fields = ["created_at", "updated_at"]

    def validate_user(self, user):
        if user.role_name != "nurse":
            raise serializers.ValidationError("Selected user must have the nurse role.")
        return user


class ClinicalStaffOptionsSerializer(serializers.Serializer):
    doctors = serializers.SerializerMethodField()
    nurses = serializers.SerializerMethodField()

    def get_doctors(self, obj):
        users = User.objects.filter(role__name="doctor", is_active=True).order_by("first_name", "last_name")
        return UserSerializer(users, many=True).data

    def get_nurses(self, obj):
        users = User.objects.filter(role__name="nurse", is_active=True).order_by("first_name", "last_name")
        return UserSerializer(users, many=True).data
