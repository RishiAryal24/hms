from django.shortcuts import render, redirect, get_object_or_404
from .models import Patient
from .forms import PatientForm
from django.utils import timezone
from .models import Assignment
from .forms import AssignmentFilterForm
from opd.models import Doctor

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

def assignment_list(request):
    today = timezone.now().date()
    form = AssignmentFilterForm(request.GET or None)
    if form.is_valid() and form.cleaned_data['date']:
        date_filter = form.cleaned_data['date']
    else:
        date_filter = today

    assignments = Assignment.objects.filter(assignment_date=date_filter)

    assignments_by_doctor = {}
    for assignment in assignments:
        if assignment.doctor not in assignments_by_doctor:
            assignments_by_doctor[assignment.doctor] = []
        assignments_by_doctor[assignment.doctor].append(assignment)

    return render(request, 'patients/assignment_list.html', {
        'assignments_by_doctor': assignments_by_doctor,
        'form': form,
        'date_filter': date_filter
    })
