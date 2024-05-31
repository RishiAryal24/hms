# opd/models.py
from django.db import models
from patients.models import Patient  # Assuming 'patients' is your patient app

class Doctor(models.Model):
    doctor_id = models.AutoField(primary_key=True)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    specialty = models.CharField(max_length=100)

    def __str__(self):
        return f"Dr. {self.first_name} {self.last_name} ({self.specialty})"

class Appointment(models.Model):
    appointment_id = models.AutoField(primary_key=True)
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE)
    doctor = models.ForeignKey(Doctor, on_delete=models.CASCADE)
    appointment_date = models.DateField()
    appointment_time = models.TimeField()
    reason = models.TextField()

    def __str__(self):
        return f"Appointment with Dr. {self.doctor.last_name} on {self.appointment_date} at {self.appointment_time}"

