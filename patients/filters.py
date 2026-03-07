# ----------------------------------------------------------------------
# LOCATION: HMS/patients/filters.py
# ACTION:   CREATE this file inside HMS/patients/
# ----------------------------------------------------------------------

import django_filters
from .models import Patient


class PatientFilter(django_filters.FilterSet):
    registered_from = django_filters.DateFilter(field_name='created_at', lookup_expr='gte')
    registered_to   = django_filters.DateFilter(field_name='created_at', lookup_expr='lte')
    age_min         = django_filters.NumberFilter(method='filter_age_min')
    age_max         = django_filters.NumberFilter(method='filter_age_max')

    class Meta:
        model  = Patient
        fields = {
            'status':         ['exact'],
            'gender':         ['exact'],
            'blood_group':    ['exact'],
            'is_vip':         ['exact'],
            'primary_doctor': ['exact'],
            'city':           ['exact', 'icontains'],
        }

    def filter_age_min(self, queryset, name, value):
        from datetime import date, timedelta
        cutoff = date.today() - timedelta(days=int(value) * 365)
        return queryset.filter(date_of_birth__lte=cutoff)

    def filter_age_max(self, queryset, name, value):
        from datetime import date, timedelta
        cutoff = date.today() - timedelta(days=int(value) * 365)
        return queryset.filter(date_of_birth__gte=cutoff)