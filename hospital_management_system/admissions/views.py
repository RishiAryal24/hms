from django.shortcuts import render, get_object_or_404, redirect
from .models import Admission
from .forms import AdmissionForm, DischargeForm

def admission_list(request):
    admissions = Admission.objects.filter(status='admitted')
    return render(request, 'admissions/admission_list.html', {'admissions': admissions})

def discharge_list(request):
    discharges = Admission.objects.filter(status='discharged')
    return render(request, 'admissions/discharge_list.html', {'discharges': discharges})

def admission_detail(request, pk):
    admission = get_object_or_404(Admission, pk=pk)
    return render(request, 'admissions/admission_detail.html', {'admission': admission})

def admission_create(request):
    if request.method == "POST":
        form = AdmissionForm(request.POST)
        if form.is_valid():
            form.save()
            return redirect('admission_list')
    else:
        form = AdmissionForm()
    return render(request, 'admissions/admission_form.html', {'form': form})

def admission_update(request, pk):
    admission = get_object_or_404(Admission, pk=pk)
    if request.method == "POST":
        form = AdmissionForm(request.POST, instance=admission)
        if form.is_valid():
            form.save()
            return redirect('admission_detail', pk=pk)
    else:
        form = AdmissionForm(instance=admission)
    return render(request, 'admissions/admission_form.html', {'form': form})

def admission_delete(request, pk):
    admission = get_object_or_404(Admission, pk=pk)
    if request.method == "POST":
        admission.delete()
        return redirect('admission_list')
    return render(request, 'admissions/admission_confirm_delete.html', {'admission': admission})

def discharge_patient(request, pk):
    admission = get_object_or_404(Admission, pk=pk)
    if request.method == "POST":
        form = DischargeForm(request.POST, instance=admission)
        if form.is_valid():
            admission = form.save(commit=False)
            admission.status = 'discharged'
            admission.save()
            return redirect('admission_detail', pk=pk)
    else:
        form = DischargeForm(instance=admission)
    return render(request, 'admissions/discharge_form.html', {'form': form, 'admission': admission})

