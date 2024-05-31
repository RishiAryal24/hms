from django import forms
from .models import Admission

class AdmissionForm(forms.ModelForm):
    class Meta:
        model = Admission
        fields = ['patient', 'doctor', 'admission_date', 'discharge_date', 'status']

class DischargeForm(forms.ModelForm):
    class Meta:
        model = Admission
        fields = ['discharge_date', 'discharge_summary']
        widgets = {
            'discharge_date': forms.DateInput(attrs={'type': 'date'}),
            'discharge_summary': forms.Textarea(attrs={'rows': 4}),
        }
