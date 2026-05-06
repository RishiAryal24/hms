from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, generics
from rest_framework.response import Response
from rest_framework.views import APIView

from shared.permissions import IsTenantAdmin, role_required
from .models import DoctorProfile, NurseProfile
from .serializers import ClinicalStaffOptionsSerializer, DoctorProfileSerializer, NurseProfileSerializer


CanViewClinicalProfiles = role_required("receptionist", "doctor", "nurse", "billing_staff")


class DoctorProfileListCreateView(generics.ListCreateAPIView):
    serializer_class = DoctorProfileSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["specialty", "department", "is_available"]
    search_fields = ["user__first_name", "user__last_name", "license_number", "specialty", "department"]
    ordering_fields = ["specialty", "department", "consultation_fee", "years_experience"]

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsTenantAdmin()]
        return [CanViewClinicalProfiles()]

    def get_queryset(self):
        return DoctorProfile.objects.select_related("user", "user__role").all()


class DoctorProfileDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = DoctorProfileSerializer
    permission_classes = [IsTenantAdmin]
    queryset = DoctorProfile.objects.select_related("user", "user__role").all()


class NurseProfileListCreateView(generics.ListCreateAPIView):
    serializer_class = NurseProfileSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["ward", "department", "shift", "is_charge_nurse", "is_available"]
    search_fields = ["user__first_name", "user__last_name", "registration_number", "ward", "department"]
    ordering_fields = ["ward", "department", "shift"]

    def get_permissions(self):
        if self.request.method == "POST":
            return [IsTenantAdmin()]
        return [CanViewClinicalProfiles()]

    def get_queryset(self):
        return NurseProfile.objects.select_related("user", "user__role").all()


class NurseProfileDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = NurseProfileSerializer
    permission_classes = [IsTenantAdmin]
    queryset = NurseProfile.objects.select_related("user", "user__role").all()


class ClinicalStaffOptionsView(APIView):
    permission_classes = [IsTenantAdmin]

    def get(self, request):
        return Response(ClinicalStaffOptionsSerializer({}).data)
