from django.shortcuts import render, redirect, get_object_or_404
from .models import Patient
from .forms import PatientForm

def patient_list(request):
    patients = Patient.objects.all()
    return render(request, 'patients/patient_list.html', {'patients': patients})

def patient_detail(request, patient_id):
    patient = get_object_or_404(Patient, pk=patient_id)  # Use patient_id
    return render(request, 'patients/patient_detail.html', {'patient': patient})


def landing_page(request):
    return render(request, 'landing_page.html')


def patient_register(request):
    if request.method == 'POST':
        form = PatientForm(request.POST)
        if form.is_valid():
            form.save()
            return redirect('patient_list')
    else:
        form = PatientForm()
    return render(request, 'patients/patient_register.html', {'form': form})


