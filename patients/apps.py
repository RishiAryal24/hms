# ----------------------------------------------------------------------
# LOCATION: HMS/patients/apps.py
# ACTION:   CREATE new folder HMS/patients/ then create this file inside it
#           Also create HMS/patients/__init__.py as a blank empty file
# ----------------------------------------------------------------------

from django.apps import AppConfig


class PatientsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'patients'