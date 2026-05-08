from django.db.models import Count
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, generics
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import User
from shared.permissions import IsTenantAdmin, role_required
from .models import DutyRoster, EmployeeProfile
from .serializers import DutyRosterSerializer, EmployeeProfileSerializer, HRStaffOptionSerializer


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
        status_counts = EmployeeProfile.objects.values("status").annotate(total=Count("id"))
        by_status = {row["status"]: row["total"] for row in status_counts}
        return Response({
            "employees": EmployeeProfile.objects.count(),
            "active": by_status.get("active", 0),
            "on_leave": by_status.get("on_leave", 0),
            "rosters": DutyRoster.objects.count(),
        })
