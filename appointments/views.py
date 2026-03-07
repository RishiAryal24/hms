# ----------------------------------------------------------------------
# LOCATION: HMS/appointments/views.py
# ACTION:   CREATE this file inside HMS/appointments/
# ----------------------------------------------------------------------

from rest_framework import generics, status, filters
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from django.shortcuts import get_object_or_404
import django.utils.timezone as tz

from shared.permissions import IsTenantAdmin, role_required
from .models import Appointment, DoctorSchedule, DoctorLeave, AppointmentQueue
from .serializers import (
    AppointmentListSerializer, AppointmentDetailSerializer,
    AppointmentCreateSerializer, AppointmentUpdateSerializer,
    DoctorScheduleSerializer, DoctorLeaveSerializer,
    AppointmentQueueSerializer,
)
from .filters import AppointmentFilter

# ---------------------------------------------------------------------------
# Permission aliases
# ---------------------------------------------------------------------------
CanBookAppointment   = role_required('receptionist')
CanViewAppointment   = role_required('receptionist', 'doctor', 'nurse')
CanWriteClinical     = role_required('doctor')
CanManageSchedule    = role_required('doctor')


# ========================
# Appointments — List & Book
# ========================

class AppointmentListView(generics.ListAPIView):
    """
    GET /api/appointments/
    Filter by doctor, date, status, patient.
    """
    serializer_class   = AppointmentListSerializer
    permission_classes = [CanViewAppointment]
    filter_backends    = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class    = AppointmentFilter
    search_fields      = ['patient__first_name', 'patient__last_name',
                          'patient__patient_id', 'doctor__first_name', 'doctor__last_name']
    ordering_fields    = ['appointment_date', 'appointment_time', 'token_number', 'created_at']
    ordering           = ['appointment_date', 'token_number']

    def get_queryset(self):
        return Appointment.objects.select_related(
            'patient', 'doctor', 'booked_by'
        ).all()


class AppointmentBookView(generics.CreateAPIView):
    """
    POST /api/appointments/book/
    RECEPTIONIST ONLY — Book a new OPD appointment.
    Auto-generates token number.
    Auto-creates queue entry.
    Validates doctor availability and leave.
    """
    serializer_class   = AppointmentCreateSerializer
    permission_classes = [CanBookAppointment]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        appointment = serializer.save()
        return Response({
            'message':      'Appointment booked successfully.',
            'token_number': appointment.token_number,
            'data':         AppointmentDetailSerializer(appointment, context={'request': request}).data,
        }, status=status.HTTP_201_CREATED)


# ========================
# Appointment — Detail, Update, Cancel
# ========================

class AppointmentDetailView(generics.RetrieveAPIView):
    """GET /api/appointments/<id>/"""
    serializer_class   = AppointmentDetailSerializer
    permission_classes = [CanViewAppointment]
    queryset           = Appointment.objects.select_related(
        'patient', 'doctor', 'booked_by', 'cancelled_by', 'follow_up_of'
    ).prefetch_related('follow_ups', 'queue_entry')


class AppointmentUpdateView(generics.UpdateAPIView):
    """
    PATCH /api/appointments/<id>/update/
    Receptionist updates scheduling info.
    Doctor updates clinical info (diagnosis, prescription, follow-up).
    """
    serializer_class   = AppointmentUpdateSerializer
    permission_classes = [CanViewAppointment]
    queryset           = Appointment.objects.all()
    http_method_names  = ['patch']


class AppointmentCancelView(APIView):
    """
    POST /api/appointments/<id>/cancel/
    Receptionist or Admin cancels an appointment.
    """
    permission_classes = [CanBookAppointment]

    def post(self, request, pk):
        appointment = get_object_or_404(Appointment, pk=pk)
        if appointment.status in ['completed', 'cancelled']:
            return Response(
                {'error': f'Appointment is already {appointment.status}.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        appointment.status              = 'cancelled'
        appointment.cancelled_by        = request.user
        appointment.cancellation_reason = request.data.get('reason', '')
        appointment.save()

        # Update queue entry
        if hasattr(appointment, 'queue_entry'):
            appointment.queue_entry.status = 'skipped'
            appointment.queue_entry.save()

        return Response({'message': 'Appointment cancelled.', 'token': appointment.token_number})


class AppointmentCompleteView(APIView):
    """
    POST /api/appointments/<id>/complete/
    DOCTOR ONLY — Mark appointment as completed with diagnosis.
    """
    permission_classes = [CanWriteClinical]

    def post(self, request, pk):
        appointment = get_object_or_404(
            Appointment, pk=pk, status='scheduled'
        )
        appointment.status       = 'completed'
        appointment.diagnosis    = request.data.get('diagnosis', '')
        appointment.prescription = request.data.get('prescription', '')
        appointment.requires_follow_up = request.data.get('requires_follow_up', False)
        appointment.follow_up_date     = request.data.get('follow_up_date', None)
        appointment.follow_up_notes    = request.data.get('follow_up_notes', '')
        appointment.save()

        # Update queue entry
        if hasattr(appointment, 'queue_entry'):
            appointment.queue_entry.status       = 'completed'
            appointment.queue_entry.completed_at = tz.now()
            appointment.queue_entry.save()

        return Response(AppointmentDetailSerializer(appointment).data)


# ========================
# Today's Schedule
# ========================

class TodayAppointmentsView(generics.ListAPIView):
    """
    GET /api/appointments/today/
    Returns all appointments for today, ordered by token number.
    Can filter by doctor using ?doctor=<id>
    """
    serializer_class   = AppointmentListSerializer
    permission_classes = [CanViewAppointment]

    def get_queryset(self):
        from datetime import date
        qs = Appointment.objects.filter(
            appointment_date=date.today()
        ).exclude(status='cancelled').select_related('patient', 'doctor', 'booked_by')

        doctor_id = self.request.query_params.get('doctor')
        if doctor_id:
            qs = qs.filter(doctor_id=doctor_id)
        return qs.order_by('token_number')


# ========================
# Doctor Availability
# ========================

class DoctorAvailabilityView(APIView):
    """
    GET /api/appointments/availability/?doctor=<id>&date=<YYYY-MM-DD>
    Returns schedule info and how many slots are still available.
    """
    permission_classes = [CanViewAppointment]

    def get(self, request):
        from datetime import datetime
        doctor_id = request.query_params.get('doctor')
        date_str  = request.query_params.get('date')

        if not doctor_id or not date_str:
            return Response({'error': 'doctor and date parameters are required.'}, status=400)

        try:
            date = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            return Response({'error': 'Invalid date format. Use YYYY-MM-DD.'}, status=400)

        day_name = date.strftime('%A').lower()
        schedule = DoctorSchedule.objects.filter(
            doctor_id=doctor_id, day_of_week=day_name, is_active=True
        ).first()

        if not schedule:
            return Response({'available': False, 'reason': 'Doctor not scheduled on this day.'})

        # Check leave
        on_leave = DoctorLeave.objects.filter(
            doctor_id=doctor_id,
            start_date__lte=date,
            end_date__gte=date,
            approved=True
        ).exists()
        if on_leave:
            return Response({'available': False, 'reason': 'Doctor is on leave.'})

        booked = Appointment.objects.filter(
            doctor_id=doctor_id,
            appointment_date=date,
        ).exclude(status='cancelled').count()

        remaining = schedule.max_patients - booked

        return Response({
            'available':       remaining > 0,
            'doctor_id':       doctor_id,
            'date':            date_str,
            'day':             schedule.get_day_of_week_display(),
            'start_time':      schedule.start_time,
            'end_time':        schedule.end_time,
            'slot_duration':   schedule.slot_duration,
            'max_patients':    schedule.max_patients,
            'booked':          booked,
            'remaining_slots': remaining,
        })


# ========================
# Doctor Schedule (Admin manages)
# ========================

class DoctorScheduleListCreateView(generics.ListCreateAPIView):
    serializer_class   = DoctorScheduleSerializer
    permission_classes = [IsTenantAdmin]
    queryset           = DoctorSchedule.objects.select_related('doctor').all()


class DoctorScheduleDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class   = DoctorScheduleSerializer
    permission_classes = [IsTenantAdmin]
    queryset           = DoctorSchedule.objects.all()


# ========================
# Doctor Leave (Admin manages)
# ========================

class DoctorLeaveListCreateView(generics.ListCreateAPIView):
    serializer_class   = DoctorLeaveSerializer
    permission_classes = [IsTenantAdmin]
    queryset           = DoctorLeave.objects.select_related('doctor').all()


class DoctorLeaveDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class   = DoctorLeaveSerializer
    permission_classes = [IsTenantAdmin]
    queryset           = DoctorLeave.objects.all()


# ========================
# Queue Management
# ========================

class QueueView(generics.ListAPIView):
    """
    GET /api/appointments/queue/?doctor=<id>
    Live waiting room queue for today.
    """
    serializer_class   = AppointmentQueueSerializer
    permission_classes = [CanViewAppointment]

    def get_queryset(self):
        from datetime import date
        qs = AppointmentQueue.objects.filter(
            appointment__appointment_date=date.today()
        ).select_related('appointment__patient', 'appointment__doctor')

        doctor_id = self.request.query_params.get('doctor')
        if doctor_id:
            qs = qs.filter(appointment__doctor_id=doctor_id)

        return qs.order_by('appointment__token_number')


class QueueUpdateView(APIView):
    """
    POST /api/appointments/queue/<id>/update/
    Update queue status — check in, call in, complete, skip.
    """
    permission_classes = [CanViewAppointment]

    def post(self, request, pk):
        queue_entry = get_object_or_404(AppointmentQueue, pk=pk)
        new_status  = request.data.get('status')

        valid = AppointmentQueue.QueueStatus.values
        if new_status not in valid:
            return Response({'error': f'Invalid status. Choose from: {valid}'}, status=400)

        now = tz.now()
        queue_entry.status = new_status
        if new_status == 'in_room'   and not queue_entry.called_in_at:
            queue_entry.called_in_at = now
        if new_status == 'waiting'   and not queue_entry.checked_in_at:
            queue_entry.checked_in_at = now
        if new_status == 'completed' and not queue_entry.completed_at:
            queue_entry.completed_at = now
        queue_entry.save()

        return Response(AppointmentQueueSerializer(queue_entry).data)