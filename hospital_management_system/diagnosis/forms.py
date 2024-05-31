from django import forms
from .models import Diagnosis

class DiagnosisForm(forms.ModelForm):
    class Meta:
        model = Diagnosis
        fields = ['patient', 'doctor', 'symptoms', 'diagnosis', 'prescription']

