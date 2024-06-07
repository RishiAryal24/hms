# patients/forms.py
from django import forms
from .models import Patient

class PatientForm(forms.ModelForm):
    class Meta:
        model = Patient
        fields = '__all__'

class AssignmentFilterForm(forms.Form):
    date = forms.DateField(widget=forms.DateInput(attrs={'type': 'date'}), required=False)