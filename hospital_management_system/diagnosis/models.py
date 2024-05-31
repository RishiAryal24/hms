from django.db import models
from patients.models import Patient
from opd.models import Doctor

class Diagnosis(models.Model):
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE)
    doctor = models.ForeignKey(Doctor, on_delete=models.CASCADE)
    symptoms = models.TextField(default='No symptoms provided')
    diagnosis = models.TextField(default='No diagnosis provided')
    prescription = models.TextField(default='No prescription provided')
    date = models.DateField(auto_now_add=True)

    def __str__(self):
        return f"Diagnosis for {self.patient} by {self.doctor} on {self.date}"


