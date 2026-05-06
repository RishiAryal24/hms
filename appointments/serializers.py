# ----------------------------------------------------------------------
# LOCATION: HMS/appointments/serializers.py
# ACTION:   CREATE this file inside HMS/appointments/
# ----------------------------------------------------------------------

from rest_framework import serializers
from .models import Appointment, DoctorSchedule, DoctorLeave, AppointmentQueue


class DoctorScheduleSerializer(serializers.ModelSerializer):
    doctor_name = serializers.CharField(source='doctor.get_full_name', read_only=True)

    class Meta:
        model  = DoctorSchedule
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']


class DoctorLeaveSerializer(serializers.ModelSerializer):
    doctor_name = serializers.CharField(source='doctor.get_full_name', read_only=True)

    class Meta:
        model  = DoctorLeave
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']


class AppointmentQueueSerializer(serializers.ModelSerializer):
    class Meta:
        model  = AppointmentQueue
        fields = '__all__'
        read_only_fields = ['appointment']


# -----------------------------------------------------------------------
# Appointment — List (lightweight)
# -----------------------------------------------------------------------

class AppointmentListSerializer(serializers.ModelSerializer):
    patient_name  = serializers.CharField(source='patient.get_full_name', read_only=True)
    patient_id    = serializers.CharField(source='patient.patient_id',    read_only=True)
    doctor_name   = serializers.CharField(source='doctor.get_full_name',  read_only=True)
    booked_by_name = serializers.CharField(source='booked_by.get_full_name', read_only=True)

    class Meta:
        model  = Appointment
        fields = [
            'id', 'patient_name', 'patient_id', 'doctor_name',
            'appointment_date', 'appointment_time', 'appointment_type',
            'status', 'token_number', 'department',
            'chief_complaint', 'consultation_fee', 'is_paid',
            'requires_follow_up', 'follow_up_date',
            'booked_by_name', 'created_at',
        ]


# -----------------------------------------------------------------------
# Appointment — Full Detail
# -----------------------------------------------------------------------

class AppointmentDetailSerializer(serializers.ModelSerializer):
    patient_name   = serializers.CharField(source='patient.get_full_name', read_only=True)
    patient_id_str = serializers.CharField(source='patient.patient_id',    read_only=True)
    doctor_name    = serializers.CharField(source='doctor.get_full_name',  read_only=True)
    booked_by_name = serializers.CharField(source='booked_by.get_full_name', read_only=True)
    follow_ups     = AppointmentListSerializer(many=True, read_only=True)
    queue_entry    = AppointmentQueueSerializer(read_only=True)

    class Meta:
        model  = Appointment
        fields = '__all__'
        read_only_fields = ['token_number', 'booked_by', 'cancelled_by', 'created_at', 'updated_at']


# -----------------------------------------------------------------------
# Appointment — Create (POST by Receptionist)
# -----------------------------------------------------------------------

class AppointmentCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Appointment
        fields = [
            'patient', 'doctor', 'appointment_date', 'appointment_time',
            'appointment_type', 'department', 'chief_complaint', 'notes',
            'consultation_fee', 'follow_up_of',
        ]
        extra_kwargs = {
            'patient':          {'required': True},
            'doctor':           {'required': True},
            'appointment_date': {'required': True},
            'appointment_time': {'required': True},
        }

    def validate(self, data):
        doctor = data.get('doctor')
        date   = data.get('appointment_date')

        # Check doctor is not on leave
        from .models import DoctorLeave
        on_leave = DoctorLeave.objects.filter(
            doctor=doctor,
            start_date__lte=date,
            end_date__gte=date,
            approved=True
        ).exists()
        if on_leave:
            raise serializers.ValidationError(
                f"Dr. {doctor.get_full_name()} is on leave on {date}."
            )

        # Check doctor schedule for that day
        day_name = date.strftime('%A').lower()
        schedule = DoctorSchedule.objects.filter(
            doctor=doctor, day_of_week=day_name, is_active=True
        ).first()
        if not schedule:
            raise serializers.ValidationError(
                f"Dr. {doctor.get_full_name()} is not available on {date.strftime('%A')}."
            )

        # Check max patients not exceeded
        from .models import Appointment
        booked_count = Appointment.objects.filter(
            doctor=doctor,
            appointment_date=date,
        ).exclude(status='cancelled').count()
        if booked_count >= schedule.max_patients:
            raise serializers.ValidationError(
                f"Dr. {doctor.get_full_name()} is fully booked on {date}. Max {schedule.max_patients} patients."
            )

        return data

    def create(self, validated_data):
        request     = self.context['request']
        doctor = validated_data.get('doctor')
        profile = getattr(doctor, 'doctor_profile', None)
        if profile:
            if not validated_data.get('consultation_fee'):
                validated_data['consultation_fee'] = profile.consultation_fee
            if not validated_data.get('department'):
                validated_data['department'] = profile.department

        appointment = Appointment.objects.create(
            booked_by=request.user,
            **validated_data
        )
        # Auto-create queue entry
        AppointmentQueue.objects.create(appointment=appointment)

        if appointment.consultation_fee:
            from billing.models import ChargeCategory
            from billing.services import add_billable_line

            doctor_name = appointment.doctor.get_full_name() or appointment.doctor.username
            add_billable_line(
                patient=appointment.patient,
                created_by=request.user,
                description=f"OPD consultation - Dr. {doctor_name}",
                category=ChargeCategory.CONSULTATION,
                unit_price=appointment.consultation_fee,
                source_module="appointments",
                source_id=appointment.id,
            )
        return appointment


# -----------------------------------------------------------------------
# Appointment — Update (PATCH by Receptionist or Doctor)
# -----------------------------------------------------------------------

class AppointmentUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Appointment
        fields = [
            'appointment_date', 'appointment_time', 'appointment_type',
            'department', 'chief_complaint', 'notes',
            'diagnosis', 'prescription',
            'requires_follow_up', 'follow_up_date', 'follow_up_notes',
            'consultation_fee', 'is_paid', 'payment_notes',
        ]
