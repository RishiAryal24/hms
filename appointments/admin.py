# ----------------------------------------------------------------------
# LOCATION: HMS/appointments/admin.py
# ACTION:   CREATE this file inside HMS/appointments/
# ----------------------------------------------------------------------

from django import forms
from django.contrib import admin
from django.db import connection
from accounts.models import User
from .models import Appointment, DoctorSchedule, DoctorLeave, AppointmentQueue


def tenant_users():
    if connection.schema_name == 'public':
        return User.objects.all()
    return User.objects.filter(is_superuser=False)


def tenant_doctors():
    return tenant_users().filter(role__name='doctor')


class AppointmentAdminForm(forms.ModelForm):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['patient'].queryset   = __import__('patients.models', fromlist=['Patient']).Patient.objects.all()
        self.fields['doctor'].queryset    = tenant_doctors()
        self.fields['booked_by'].queryset = tenant_users()
        if 'cancelled_by' in self.fields:
            self.fields['cancelled_by'].queryset = tenant_users()

    class Meta:
        model  = Appointment
        fields = '__all__'


class AppointmentQueueInline(admin.StackedInline):
    model  = AppointmentQueue
    extra  = 0
    fields = ['status', 'checked_in_at', 'called_in_at', 'completed_at', 'waiting_room']


@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    form          = AppointmentAdminForm
    list_display  = ['token_number', 'patient', 'doctor', 'appointment_date',
                     'appointment_time', 'appointment_type', 'status', 'is_paid']
    list_filter   = ['status', 'appointment_type', 'appointment_date', 'is_paid']
    search_fields = ['patient__first_name', 'patient__last_name',
                     'patient__patient_id', 'doctor__first_name']
    readonly_fields = ['token_number', 'created_at', 'updated_at']
    inlines       = [AppointmentQueueInline]

    fieldsets = (
        ('Appointment', {
            'fields': ('patient', 'doctor', 'appointment_date', 'appointment_time',
                       'appointment_type', 'status', 'token_number', 'department', 'chief_complaint')
        }),
        ('Clinical', {
            'fields': ('notes', 'diagnosis', 'prescription'),
            'classes': ('collapse',)
        }),
        ('Follow Up', {
            'fields': ('requires_follow_up', 'follow_up_date', 'follow_up_notes', 'follow_up_of'),
            'classes': ('collapse',)
        }),
        ('Billing', {
            'fields': ('consultation_fee', 'is_paid', 'payment_notes'),
            'classes': ('collapse',)
        }),
        ('Staff', {
            'fields': ('booked_by', 'cancelled_by', 'cancellation_reason'),
            'classes': ('collapse',)
        }),
    )


class DoctorScheduleAdminForm(forms.ModelForm):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['doctor'].queryset = tenant_doctors()

    class Meta:
        model  = DoctorSchedule
        fields = '__all__'


@admin.register(DoctorSchedule)
class DoctorScheduleAdmin(admin.ModelAdmin):
    form         = DoctorScheduleAdminForm
    list_display = ['doctor', 'day_of_week', 'start_time', 'end_time',
                    'slot_duration', 'max_patients', 'is_active']
    list_filter  = ['day_of_week', 'is_active']


class DoctorLeaveAdminForm(forms.ModelForm):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['doctor'].queryset = tenant_doctors()

    class Meta:
        model  = DoctorLeave
        fields = '__all__'


@admin.register(DoctorLeave)
class DoctorLeaveAdmin(admin.ModelAdmin):
    form         = DoctorLeaveAdminForm
    list_display = ['doctor', 'start_date', 'end_date', 'reason', 'approved']
    list_filter  = ['approved']


@admin.register(AppointmentQueue)
class AppointmentQueueAdmin(admin.ModelAdmin):
    list_display = ['appointment', 'status', 'checked_in_at', 'called_in_at', 'completed_at']
    list_filter  = ['status']