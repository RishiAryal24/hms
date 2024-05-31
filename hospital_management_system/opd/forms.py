# opd/forms.py
from django import forms
from .models import Appointment

class AppointmentForm(forms.ModelForm):
    class Meta:
        model = Appointment
        fields = ['patient', 'doctor', 'appointment_date', 'appointment_time', 'reason']
