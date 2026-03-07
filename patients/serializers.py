# ----------------------------------------------------------------------
# LOCATION: HMS/patients/serializers.py
# ACTION:   CREATE this file inside HMS/patients/
# ----------------------------------------------------------------------

from rest_framework import serializers
from .models import (
    Patient, EmergencyContact, PatientInsurance,
    MedicalHistory, Allergy, CurrentMedication,
    AdmissionRecord, VitalSign, PatientDocument, PatientNote
)


class EmergencyContactSerializer(serializers.ModelSerializer):
    class Meta:
        model  = EmergencyContact
        fields = '__all__'
        read_only_fields = ['patient']


class PatientInsuranceSerializer(serializers.ModelSerializer):
    class Meta:
        model  = PatientInsurance
        fields = '__all__'
        read_only_fields = ['patient', 'created_at', 'updated_at']


class AllergySerializer(serializers.ModelSerializer):
    recorded_by_name = serializers.CharField(source='recorded_by.get_full_name', read_only=True)

    class Meta:
        model  = Allergy
        fields = '__all__'
        read_only_fields = ['patient', 'recorded_by', 'created_at', 'updated_at']


class CurrentMedicationSerializer(serializers.ModelSerializer):
    class Meta:
        model  = CurrentMedication
        fields = '__all__'
        read_only_fields = ['patient', 'created_at', 'updated_at']


class MedicalHistorySerializer(serializers.ModelSerializer):
    bmi = serializers.FloatField(read_only=True)

    class Meta:
        model  = MedicalHistory
        fields = '__all__'
        read_only_fields = ['patient', 'created_at', 'updated_at']


class VitalSignSerializer(serializers.ModelSerializer):
    blood_pressure   = serializers.CharField(read_only=True)
    bmi              = serializers.FloatField(read_only=True)
    recorded_by_name = serializers.CharField(source='recorded_by.get_full_name', read_only=True)

    class Meta:
        model  = VitalSign
        fields = '__all__'
        read_only_fields = ['patient', 'recorded_by', 'created_at', 'updated_at']


class PatientDocumentSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.CharField(source='uploaded_by.get_full_name', read_only=True)

    class Meta:
        model  = PatientDocument
        fields = '__all__'
        read_only_fields = ['patient', 'uploaded_by', 'created_at', 'updated_at']


class PatientNoteSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)

    class Meta:
        model  = PatientNote
        fields = '__all__'
        read_only_fields = ['patient', 'created_by', 'created_at', 'updated_at']


class AdmissionRecordSerializer(serializers.ModelSerializer):
    length_of_stay        = serializers.IntegerField(read_only=True)
    admitting_doctor_name = serializers.CharField(source='admitting_doctor.get_full_name', read_only=True)
    vitals                = VitalSignSerializer(many=True, read_only=True)

    class Meta:
        model  = AdmissionRecord
        fields = '__all__'
        read_only_fields = ['patient', 'admission_number', 'admitted_by', 'created_at', 'updated_at']


# -----------------------------------------------------------------------
# Patient — List  (lightweight)
# -----------------------------------------------------------------------

class PatientListSerializer(serializers.ModelSerializer):
    age                 = serializers.IntegerField(read_only=True)
    full_name           = serializers.CharField(source='get_full_name', read_only=True)
    primary_doctor_name = serializers.CharField(source='primary_doctor.get_full_name', read_only=True)
    registered_by_name  = serializers.CharField(source='registered_by.get_full_name', read_only=True)

    class Meta:
        model  = Patient
        fields = [
            'id', 'patient_id', 'full_name', 'first_name', 'last_name',
            'date_of_birth', 'age', 'gender', 'blood_group',
            'phone', 'email', 'city', 'status', 'is_vip',
            'primary_doctor_name', 'registered_by_name', 'created_at',
        ]


# -----------------------------------------------------------------------
# Patient — Full Detail  (nested, read-only)
# -----------------------------------------------------------------------

class PatientDetailSerializer(serializers.ModelSerializer):
    age                 = serializers.IntegerField(read_only=True)
    full_name           = serializers.CharField(source='get_full_name', read_only=True)
    emergency_contacts  = EmergencyContactSerializer(many=True, read_only=True)
    insurance_records   = PatientInsuranceSerializer(many=True, read_only=True)
    medical_history     = MedicalHistorySerializer(read_only=True)
    allergies           = AllergySerializer(many=True, read_only=True)
    current_medications = CurrentMedicationSerializer(many=True, read_only=True)
    admissions          = AdmissionRecordSerializer(many=True, read_only=True)
    vital_signs         = VitalSignSerializer(many=True, read_only=True)
    documents           = PatientDocumentSerializer(many=True, read_only=True)
    notes               = serializers.SerializerMethodField()
    registered_by_name  = serializers.CharField(source='registered_by.get_full_name', read_only=True)
    primary_doctor_name = serializers.CharField(source='primary_doctor.get_full_name', read_only=True)

    class Meta:
        model  = Patient
        fields = '__all__'
        read_only_fields = ['patient_id', 'registered_by', 'created_at', 'updated_at']

    def get_notes(self, obj):
        request = self.context.get('request')
        qs = obj.notes.all()
        if request and not (
            request.user.is_tenant_admin or
            getattr(request.user, 'role_name', None) == 'doctor'
        ):
            qs = qs.filter(is_confidential=False)
        return PatientNoteSerializer(qs, many=True).data


# -----------------------------------------------------------------------
# Patient — Register  (POST by Receptionist)
# -----------------------------------------------------------------------

class PatientCreateSerializer(serializers.ModelSerializer):
    """
    Used by receptionists to register a new patient.
    Supports inline emergency_contacts and insurance_records.
    Auto-assigns registered_by from the request user.
    Auto-creates a blank MedicalHistory record.
    """
    emergency_contacts = EmergencyContactSerializer(many=True, required=False)
    insurance_records  = PatientInsuranceSerializer(many=True, required=False)

    class Meta:
        model   = Patient
        exclude = ['patient_id', 'registered_by', 'created_at', 'updated_at']
        extra_kwargs = {
            'first_name':    {'required': True},
            'last_name':     {'required': True},
            'date_of_birth': {'required': True},
            'gender':        {'required': True},
            'phone':         {'required': True},
            'address_line1': {'required': True},
            'city':          {'required': True},
            'state':         {'required': True},
            'postal_code':   {'required': True},
        }

    def create(self, validated_data):
        emergency_contacts_data = validated_data.pop('emergency_contacts', [])
        insurance_data          = validated_data.pop('insurance_records', [])
        request                 = self.context['request']

        patient = Patient.objects.create(registered_by=request.user, **validated_data)

        for ec in emergency_contacts_data:
            EmergencyContact.objects.create(patient=patient, **ec)

        for ins in insurance_data:
            PatientInsurance.objects.create(patient=patient, **ins)

        MedicalHistory.objects.get_or_create(patient=patient)

        return patient


# -----------------------------------------------------------------------
# Patient — Update Demographics  (PATCH/PUT by Receptionist)
# Clinical fields intentionally excluded.
# -----------------------------------------------------------------------

class PatientUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Patient
        fields = [
            'first_name', 'middle_name', 'last_name',
            'date_of_birth', 'gender', 'marital_status',
            'nationality', 'religion', 'occupation', 'profile_picture',
            'phone', 'alternate_phone', 'email',
            'address_line1', 'address_line2', 'city', 'state',
            'postal_code', 'country', 'primary_doctor',
        ]