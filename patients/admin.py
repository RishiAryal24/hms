# ----------------------------------------------------------------------
# LOCATION: HMS/patients/admin.py
# ACTION:   REPLACE the entire contents of this file
# ----------------------------------------------------------------------

from django import forms
from django.contrib import admin
from django.db import connection
from accounts.models import User
from .models import (
    Patient, EmergencyContact, PatientInsurance,
    MedicalHistory, Allergy, CurrentMedication,
    AdmissionRecord, VitalSign, PatientDocument, PatientNote
)


def tenant_users():
    """Return only non-superuser users belonging to the current tenant schema."""
    if connection.schema_name == 'public':
        return User.objects.all()
    return User.objects.filter(is_superuser=False)


def tenant_doctors():
    return tenant_users().filter(role__name='doctor')


class PatientAdminForm(forms.ModelForm):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['registered_by'].queryset  = tenant_users()
        self.fields['primary_doctor'].queryset = tenant_doctors()

    class Meta:
        model  = Patient
        fields = '__all__'


class EmergencyContactInline(admin.TabularInline):
    model = EmergencyContact
    extra = 1


class InsuranceInline(admin.TabularInline):
    model = PatientInsurance
    extra = 0


class AllergyInline(admin.TabularInline):
    model = Allergy
    extra = 0


class MedicationInline(admin.TabularInline):
    model = CurrentMedication
    extra = 0


@admin.register(Patient)
class PatientAdmin(admin.ModelAdmin):
    form            = PatientAdminForm
    list_display    = ['patient_id', 'get_full_name', 'gender', 'age',
                       'blood_group', 'phone', 'status', 'is_vip', 'created_at']
    list_filter     = ['status', 'gender', 'blood_group', 'is_vip']
    search_fields   = ['first_name', 'last_name', 'patient_id', 'phone', 'email']
    readonly_fields = ['patient_id', 'created_at', 'updated_at']
    inlines         = [EmergencyContactInline, InsuranceInline, AllergyInline, MedicationInline]

    fieldsets = (
        ('Identity', {
            'fields': ('patient_id', 'first_name', 'middle_name', 'last_name',
                       'date_of_birth', 'gender', 'blood_group', 'marital_status',
                       'nationality', 'occupation', 'profile_picture')
        }),
        ('Contact', {
            'fields': ('phone', 'alternate_phone', 'email')
        }),
        ('Address', {
            'fields': ('address_line1', 'address_line2', 'city', 'state', 'postal_code', 'country')
        }),
        ('Status', {
            'fields': ('status', 'is_vip', 'primary_doctor')
        }),
        ('Audit', {
            'fields': ('registered_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


class AdmissionAdminForm(forms.ModelForm):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['admitting_doctor'].queryset = tenant_doctors()
        self.fields['admitted_by'].queryset      = tenant_users()

    class Meta:
        model  = AdmissionRecord
        fields = '__all__'


@admin.register(AdmissionRecord)
class AdmissionRecordAdmin(admin.ModelAdmin):
    form            = AdmissionAdminForm
    list_display    = ['admission_number', 'patient', 'admission_type',
                       'status', 'admission_date', 'length_of_stay']
    list_filter     = ['admission_type', 'status']
    search_fields   = ['admission_number', 'patient__patient_id', 'patient__first_name']
    readonly_fields = ['admission_number', 'created_at', 'updated_at']


class VitalSignAdminForm(forms.ModelForm):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['recorded_by'].queryset = tenant_users()

    class Meta:
        model  = VitalSign
        fields = '__all__'


@admin.register(VitalSign)
class VitalSignAdmin(admin.ModelAdmin):
    form          = VitalSignAdminForm
    list_display  = ['patient', 'temperature_celsius', 'pulse_rate',
                     'blood_pressure', 'oxygen_saturation', 'created_at']
    search_fields = ['patient__patient_id', 'patient__first_name']


admin.site.register(MedicalHistory)
admin.site.register(Allergy)
admin.site.register(CurrentMedication)
admin.site.register(PatientDocument)
admin.site.register(PatientNote)