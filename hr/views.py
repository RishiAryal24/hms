from django.db.models import Count
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, generics
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import User
from shared.permissions import IsTenantAdmin, role_required
from .models import AttendanceRecord, DutyRoster, EmployeeProfile, LeaveRequest
from .serializers import AttendanceRecordSerializer, DutyRosterSerializer, EmployeeProfileSerializer, HRStaffOptionSerializer, LeaveRequestSerializer


CanViewHR = role_required("receptionist", "billing_staff")


class EmployeeProfileListCreateView(generics.ListCreateAPIView):
    serializer_class = EmployeeProfileSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["employment_type", "status", "user__role__name", "user__department"]
    search_fields = ["employee_code", "designation", "user__first_name", "user__last_name", "user__username"]
    ordering_fields = ["employee_code", "joining_date", "created_at"]

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsTenantAdmin()]
        return [CanViewHR()]

    def get_queryset(self):
        return EmployeeProfile.objects.select_related("user", "user__role")


class EmployeeProfileDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = EmployeeProfileSerializer
    permission_classes = [IsTenantAdmin]
    queryset = EmployeeProfile.objects.select_related("user", "user__role")


class DutyRosterListCreateView(generics.ListCreateAPIView):
    serializer_class = DutyRosterSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["employee", "duty_date", "shift", "location", "department"]
    search_fields = ["employee__employee_code", "employee__user__first_name", "employee__user__last_name", "department"]
    ordering_fields = ["duty_date", "shift", "location", "created_at"]

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsTenantAdmin()]
        return [CanViewHR()]

    def get_queryset(self):
        return DutyRoster.objects.select_related("employee", "employee__user", "employee__user__role", "assigned_by")

    def perform_create(self, serializer):
        serializer.save(assigned_by=self.request.user)


class DutyRosterDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = DutyRosterSerializer
    permission_classes = [IsTenantAdmin]
    queryset = DutyRoster.objects.select_related("employee", "employee__user", "employee__user__role", "assigned_by")


class AttendanceRecordListCreateView(generics.ListCreateAPIView):
    serializer_class = AttendanceRecordSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["employee", "roster", "attendance_date", "status"]
    search_fields = ["employee__employee_code", "employee__user__first_name", "employee__user__last_name", "notes"]
    ordering_fields = ["attendance_date", "status", "created_at"]

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsTenantAdmin()]
        return [CanViewHR()]

    def get_queryset(self):
        return AttendanceRecord.objects.select_related(
            "employee", "employee__user", "employee__user__role", "roster", "recorded_by",
        )

    def perform_create(self, serializer):
        serializer.save(recorded_by=self.request.user)


class AttendanceRecordDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = AttendanceRecordSerializer
    permission_classes = [IsTenantAdmin]
    queryset = AttendanceRecord.objects.select_related(
        "employee", "employee__user", "employee__user__role", "roster", "recorded_by",
    )


class LeaveRequestListCreateView(generics.ListCreateAPIView):
    serializer_class = LeaveRequestSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["employee", "leave_type", "status", "start_date", "end_date"]
    search_fields = ["employee__employee_code", "employee__user__first_name", "employee__user__last_name", "reason"]
    ordering_fields = ["start_date", "end_date", "created_at"]

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsTenantAdmin()]
        return [CanViewHR()]

    def get_queryset(self):
        return LeaveRequest.objects.select_related(
            "employee", "employee__user", "employee__user__role", "requested_by", "approved_by",
        )

    def perform_create(self, serializer):
        serializer.save(requested_by=self.request.user)


class LeaveRequestDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = LeaveRequestSerializer
    permission_classes = [IsTenantAdmin]
    queryset = LeaveRequest.objects.select_related(
        "employee", "employee__user", "employee__user__role", "requested_by", "approved_by",
    )

    def perform_update(self, serializer):
        old_status = self.get_object().status
        instance = serializer.save()
        if instance.status in ["approved", "rejected"] and instance.status != old_status:
            instance.approved_by = self.request.user
            instance.approved_at = timezone.now()
            instance.save(update_fields=["approved_by", "approved_at", "updated_at"])


class HROptionsView(APIView):
    permission_classes = [CanViewHR]

    def get(self, request):
        profiled_user_ids = EmployeeProfile.objects.values_list("user_id", flat=True)
        staff = User.objects.filter(is_superuser=False, is_active=True).select_related("role").exclude(id__in=profiled_user_ids)
        return Response({
            "staff": HRStaffOptionSerializer(staff, many=True).data,
        })


class HRSummaryView(APIView):
    permission_classes = [CanViewHR]

    def get(self, request):
        today = timezone.localdate()
        status_counts = EmployeeProfile.objects.values("status").annotate(total=Count("id"))
        by_status = {row["status"]: row["total"] for row in status_counts}
        return Response({
            "employees": EmployeeProfile.objects.count(),
            "active": by_status.get("active", 0),
            "on_leave": by_status.get("on_leave", 0),
            "rosters": DutyRoster.objects.count(),
            "present_today": AttendanceRecord.objects.filter(attendance_date=today, status__in=["present", "late", "half_day"]).count(),
            "absent_today": AttendanceRecord.objects.filter(attendance_date=today, status="absent").count(),
            "pending_leave": LeaveRequest.objects.filter(status="pending").count(),
        })
