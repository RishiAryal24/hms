from django.db import models
from patients.models import Patient  # Assuming you have a patient app
from opd.models import Doctor       # Assuming you have a doctor model in the opd app

class Admission(models.Model):
    STATUS_CHOICES = [
        ('admitted', 'Admitted'),
        ('discharged', 'Discharged'),
    ]

    patient = models.ForeignKey(Patient, on_delete=models.CASCADE)
    doctor = models.ForeignKey(Doctor, on_delete=models.CASCADE)
    admission_date = models.DateField()
    discharge_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='admitted')
    discharge_summary = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"Admission for {self.patient} by {self.doctor} on {self.admission_date}"

