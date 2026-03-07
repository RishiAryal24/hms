# ----------------------------------------------------------------------
# LOCATION: HMS/patients/views.py
# ACTION:   CREATE this file inside HMS/patients/
# ----------------------------------------------------------------------

from rest_framework import generics, status, filters
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
from django_filters.rest_framework import DjangoFilterBackend
from django.shortcuts import get_object_or_404

from shared.permissions import IsTenantAdmin, role_required
from .models import (
    Patient, EmergencyContact, PatientInsurance,
    MedicalHistory, Allergy, CurrentMedication,
    AdmissionRecord, VitalSign, PatientDocument, PatientNote
)
from .serializers import (
    PatientListSerializer, PatientDetailSerializer,
    PatientCreateSerializer, PatientUpdateSerializer,
    EmergencyContactSerializer, PatientInsuranceSerializer,
    MedicalHistorySerializer, AllergySerializer, CurrentMedicationSerializer,
    AdmissionRecordSerializer, VitalSignSerializer,
    PatientDocumentSerializer, PatientNoteSerializer
)
from .filters import PatientFilter

# ---------------------------------------------------------------------------
# Permission aliases
# ---------------------------------------------------------------------------
CanRegisterPatient = role_required('receptionist')
CanViewPatient     = role_required('receptionist', 'doctor', 'nurse',
                                   'pharmacist', 'lab_technician', 'billing_staff')
CanWriteClinical   = role_required('doctor')
CanRecordVitals    = role_required('doctor', 'nurse')
CanManageInsurance = role_required('receptionist', 'billing_staff')


# ========================
# Patient — List & Register
# ========================

class PatientListView(generics.ListAPIView):
    """
    GET /api/patients/
    All clinical staff can search and list patients.
    """
    serializer_class   = PatientListSerializer
    permission_classes = [CanViewPatient]
    filter_backends    = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class    = PatientFilter
    search_fields      = ['first_name', 'last_name', 'patient_id', 'phone', 'email']
    ordering_fields    = ['created_at', 'last_name', 'status']
    ordering           = ['-created_at']

    def get_queryset(self):
        return Patient.objects.select_related('registered_by', 'primary_doctor').all()


class PatientRegisterView(generics.CreateAPIView):
    """
    POST /api/patients/register/
    RECEPTIONIST ONLY — Register a new patient.
    Auto-generates patient_id (HMS-00001).
    Supports inline emergency_contacts and insurance_records.
    """
    serializer_class   = PatientCreateSerializer
    permission_classes = [CanRegisterPatient]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        patient = serializer.save()
        return Response({
            'message':    'Patient registered successfully.',
            'patient_id': patient.patient_id,
            'name':       patient.get_full_name(),
            'data':       PatientDetailSerializer(patient, context={'request': request}).data,
        }, status=status.HTTP_201_CREATED)


# ========================
# Patient — Detail, Update, Deactivate
# ========================

class PatientDetailView(generics.RetrieveAPIView):
    """
    GET /api/patients/<id>/
    Full nested record. All clinical staff.
    """
    serializer_class   = PatientDetailSerializer
    permission_classes = [CanViewPatient]

    def get_queryset(self):
        return Patient.objects.prefetch_related(
            'emergency_contacts', 'insurance_records', 'medical_history',
            'allergies', 'current_medications', 'admissions',
            'vital_signs', 'documents', 'notes'
        ).select_related('registered_by', 'primary_doctor')


class PatientUpdateView(generics.UpdateAPIView):
    """
    PUT/PATCH /api/patients/<id>/update/
    RECEPTIONIST ONLY — Update demographics & contact info only.
    """
    serializer_class   = PatientUpdateSerializer
    permission_classes = [CanRegisterPatient]
    queryset           = Patient.objects.all()
    http_method_names  = ['put', 'patch']

    def update(self, request, *args, **kwargs):
        partial    = kwargs.pop('partial', False)
        instance   = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        patient = serializer.save()
        return Response({
            'message': 'Patient record updated.',
            'data':    PatientListSerializer(patient).data,
        })


class PatientDeactivateView(APIView):
    """
    POST /api/patients/<id>/deactivate/
    ADMIN ONLY — Soft-delete a patient.
    """
    permission_classes = [IsTenantAdmin]

    def post(self, request, pk):
        patient        = get_object_or_404(Patient, pk=pk)
        patient.status = 'inactive'
        patient.save()
        return Response({'message': f'Patient {patient.patient_id} has been deactivated.'})


# ========================
# Emergency Contacts  (Receptionist)
# ========================

class EmergencyContactListCreateView(generics.ListCreateAPIView):
    serializer_class   = EmergencyContactSerializer
    permission_classes = [CanRegisterPatient]

    def get_queryset(self):
        return EmergencyContact.objects.filter(patient_id=self.kwargs['patient_pk'])

    def perform_create(self, serializer):
        patient = get_object_or_404(Patient, pk=self.kwargs['patient_pk'])
        serializer.save(patient=patient)


class EmergencyContactDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class   = EmergencyContactSerializer
    permission_classes = [CanRegisterPatient]

    def get_queryset(self):
        return EmergencyContact.objects.filter(patient_id=self.kwargs['patient_pk'])


# ========================
# Insurance  (Receptionist + Billing Staff)
# ========================

class InsuranceListCreateView(generics.ListCreateAPIView):
    serializer_class   = PatientInsuranceSerializer
    permission_classes = [CanManageInsurance]

    def get_queryset(self):
        return PatientInsurance.objects.filter(patient_id=self.kwargs['patient_pk'])

    def perform_create(self, serializer):
        patient = get_object_or_404(Patient, pk=self.kwargs['patient_pk'])
        serializer.save(patient=patient)


class InsuranceDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class   = PatientInsuranceSerializer
    permission_classes = [CanManageInsurance]

    def get_queryset(self):
        return PatientInsurance.objects.filter(patient_id=self.kwargs['patient_pk'])


# ========================
# Medical History  (Doctors only)
# ========================

class MedicalHistoryView(generics.RetrieveUpdateAPIView):
    serializer_class   = MedicalHistorySerializer
    permission_classes = [CanWriteClinical]

    def get_object(self):
        patient = get_object_or_404(Patient, pk=self.kwargs['patient_pk'])
        obj, _  = MedicalHistory.objects.get_or_create(patient=patient)
        return obj


# ========================
# Allergies  (Doctors only)
# ========================

class AllergyListCreateView(generics.ListCreateAPIView):
    serializer_class   = AllergySerializer
    permission_classes = [CanWriteClinical]

    def get_queryset(self):
        return Allergy.objects.filter(patient_id=self.kwargs['patient_pk'])

    def perform_create(self, serializer):
        patient = get_object_or_404(Patient, pk=self.kwargs['patient_pk'])
        serializer.save(patient=patient, recorded_by=self.request.user)


class AllergyDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class   = AllergySerializer
    permission_classes = [CanWriteClinical]

    def get_queryset(self):
        return Allergy.objects.filter(patient_id=self.kwargs['patient_pk'])


# ========================
# Current Medications  (Doctors only)
# ========================

class MedicationListCreateView(generics.ListCreateAPIView):
    serializer_class   = CurrentMedicationSerializer
    permission_classes = [CanWriteClinical]

    def get_queryset(self):
        return CurrentMedication.objects.filter(patient_id=self.kwargs['patient_pk'])

    def perform_create(self, serializer):
        patient = get_object_or_404(Patient, pk=self.kwargs['patient_pk'])
        serializer.save(patient=patient)


class MedicationDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class   = CurrentMedicationSerializer
    permission_classes = [CanWriteClinical]

    def get_queryset(self):
        return CurrentMedication.objects.filter(patient_id=self.kwargs['patient_pk'])


# ========================
# Admissions  (Receptionist admits / Doctor discharges)
# ========================

class AdmissionListCreateView(generics.ListCreateAPIView):
    serializer_class = AdmissionRecordSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [CanRegisterPatient()]
        return [CanViewPatient()]

    def get_queryset(self):
        return AdmissionRecord.objects.filter(
            patient_id=self.kwargs['patient_pk']
        ).select_related('admitting_doctor', 'admitted_by').prefetch_related('vitals')

    def perform_create(self, serializer):
        patient = get_object_or_404(Patient, pk=self.kwargs['patient_pk'])
        serializer.save(patient=patient, admitted_by=self.request.user)


class AdmissionDetailView(generics.RetrieveUpdateAPIView):
    serializer_class   = AdmissionRecordSerializer
    permission_classes = [CanViewPatient]

    def get_queryset(self):
        return AdmissionRecord.objects.filter(patient_id=self.kwargs['patient_pk'])


class DischargePatientView(APIView):
    """
    POST /api/patients/<id>/admissions/<id>/discharge/
    DOCTOR ONLY — Close admission with diagnosis and discharge summary.
    """
    permission_classes = [CanWriteClinical]

    def post(self, request, patient_pk, pk):
        admission = get_object_or_404(
            AdmissionRecord, pk=pk, patient_id=patient_pk, status='admitted'
        )
        import django.utils.timezone as tz
        admission.status                 = 'discharged'
        admission.discharge_date         = tz.now()
        admission.diagnosis_on_discharge = request.data.get('diagnosis_on_discharge', '')
        admission.discharge_summary      = request.data.get('discharge_summary', '')
        admission.save()
        return Response(AdmissionRecordSerializer(admission).data)


# ========================
# Vital Signs  (Nurses + Doctors record / all staff view)
# ========================

class VitalSignListCreateView(generics.ListCreateAPIView):
    serializer_class = VitalSignSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [CanRecordVitals()]
        return [CanViewPatient()]

    def get_queryset(self):
        return VitalSign.objects.filter(patient_id=self.kwargs['patient_pk'])

    def perform_create(self, serializer):
        patient = get_object_or_404(Patient, pk=self.kwargs['patient_pk'])
        serializer.save(patient=patient, recorded_by=self.request.user)


class VitalSignDetailView(generics.RetrieveAPIView):
    serializer_class   = VitalSignSerializer
    permission_classes = [CanViewPatient]

    def get_queryset(self):
        return VitalSign.objects.filter(patient_id=self.kwargs['patient_pk'])


# ========================
# Documents  (Receptionist uploads / all staff view)
# ========================

class PatientDocumentListCreateView(generics.ListCreateAPIView):
    serializer_class = PatientDocumentSerializer
    parser_classes   = [MultiPartParser, FormParser]

    def get_permissions(self):
        if self.request.method == 'POST':
            return [CanRegisterPatient()]
        return [CanViewPatient()]

    def get_queryset(self):
        return PatientDocument.objects.filter(patient_id=self.kwargs['patient_pk'])

    def perform_create(self, serializer):
        patient = get_object_or_404(Patient, pk=self.kwargs['patient_pk'])
        serializer.save(patient=patient, uploaded_by=self.request.user)


class PatientDocumentDetailView(generics.RetrieveDestroyAPIView):
    serializer_class   = PatientDocumentSerializer
    permission_classes = [CanViewPatient]

    def get_queryset(self):
        return PatientDocument.objects.filter(patient_id=self.kwargs['patient_pk'])


# ========================
# Notes  (All staff write / confidential visible to doctors only)
# ========================

class PatientNoteListCreateView(generics.ListCreateAPIView):
    serializer_class   = PatientNoteSerializer
    permission_classes = [CanViewPatient]

    def get_queryset(self):
        qs   = PatientNote.objects.filter(patient_id=self.kwargs['patient_pk'])
        user = self.request.user
        if not (user.is_tenant_admin or getattr(user, 'role_name', None) == 'doctor'):
            qs = qs.filter(is_confidential=False)
        return qs

    def perform_create(self, serializer):
        patient = get_object_or_404(Patient, pk=self.kwargs['patient_pk'])
        serializer.save(patient=patient, created_by=self.request.user)


class PatientNoteDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class   = PatientNoteSerializer
    permission_classes = [CanViewPatient]

    def get_queryset(self):
        return PatientNote.objects.filter(patient_id=self.kwargs['patient_pk'])


# ========================
# Patient Summary
# ========================

class PatientSummaryView(APIView):
    """
    GET /api/patients/<id>/summary/
    Quick clinical snapshot — latest vitals, allergies, active meds, active admission.
    """
    permission_classes = [CanViewPatient]

    def get(self, request, patient_pk):
        patient          = get_object_or_404(Patient, pk=patient_pk)
        latest_vitals    = patient.vital_signs.first()
        active_admission = patient.admissions.filter(status='admitted').first()

        return Response({
            'patient':             PatientListSerializer(patient).data,
            'latest_vitals':       VitalSignSerializer(latest_vitals).data if latest_vitals else None,
            'allergies':           AllergySerializer(patient.allergies.all(), many=True).data,
            'current_medications': CurrentMedicationSerializer(
                patient.current_medications.filter(is_ongoing=True), many=True
            ).data,
            'active_admission':    AdmissionRecordSerializer(active_admission).data if active_admission else None,
        })