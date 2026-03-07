# ----------------------------------------------------------------------
# LOCATION: HMS/appointments/filters.py
# ACTION:   CREATE this file inside HMS/appointments/
# ----------------------------------------------------------------------

import django_filters
from .models import Appointment


class AppointmentFilter(django_filters.FilterSet):
    date_from = django_filters.DateFilter(field_name='appointment_date', lookup_expr='gte')
    date_to   = django_filters.DateFilter(field_name='appointment_date', lookup_expr='lte')

    class Meta:
        model  = Appointment
        fields = {
            'status':           ['exact'],
            'appointment_type': ['exact'],
            'doctor':           ['exact'],
            'patient':          ['exact'],
            'appointment_date': ['exact'],
            'is_paid':          ['exact'],
            'requires_follow_up': ['exact'],
            'department':       ['exact', 'icontains'],
        }