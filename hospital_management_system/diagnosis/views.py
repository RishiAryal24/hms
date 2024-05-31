from django.shortcuts import render, get_object_or_404, redirect
from .models import Diagnosis
from .forms import DiagnosisForm

def diagnosis_list(request):
    diagnoses = Diagnosis.objects.all()
    return render(request, 'diagnosis/diagnosis_list.html', {'diagnoses': diagnoses})

def diagnosis_detail(request, pk):
    diagnosis = get_object_or_404(Diagnosis, pk=pk)
    return render(request, 'diagnosis/diagnosis_detail.html', {'diagnosis': diagnosis})

def diagnosis_create(request):
    if request.method == "POST":
        form = DiagnosisForm(request.POST)
        if form.is_valid():
            form.save()
            return redirect('diagnosis_list')
    else:
        form = DiagnosisForm()
    return render(request, 'diagnosis/diagnosis_form.html', {'form': form})

def diagnosis_update(request, pk):
    diagnosis = get_object_or_404(Diagnosis, pk=pk)
    if request.method == "POST":
        form = DiagnosisForm(request.POST, instance=diagnosis)
        if form.is_valid():
            form.save()
            return redirect('diagnosis_detail', pk=pk)
    else:
        form = DiagnosisForm(instance=diagnosis)
    return render(request, 'diagnosis/diagnosis_form.html', {'form': form})

def diagnosis_delete(request, pk):
    diagnosis = get_object_or_404(Diagnosis, pk=pk)
    if request.method == "POST":
        diagnosis.delete()
        return redirect('diagnosis_list')
    return render(request, 'diagnosis/diagnosis_confirm_delete.html', {'diagnosis': diagnosis})




