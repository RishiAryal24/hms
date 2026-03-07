# ----------------------------------------------------------------------
# LOCATION: HMS/appointments/apps.py
# ACTION:   CREATE this file inside HMS/appointments/
# ----------------------------------------------------------------------

from django.apps import AppConfig


class AppointmentsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'appointments'