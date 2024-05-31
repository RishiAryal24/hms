# opd/views.py
from django.shortcuts import render, get_object_or_404, redirect
from .models import Appointment, Doctor
from .forms import AppointmentForm

def appointment_list(request):
    appointments = Appointment.objects.all()
    return render(request, 'opd/appointment_list.html', {'appointments': appointments})

def appointment_detail(request, appointment_id):
    appointment = get_object_or_404(Appointment, pk=appointment_id)
    return render(request, 'opd/appointment_detail.html', {'appointment': appointment})

def appointment_create(request):
    if request.method == 'POST':
        form = AppointmentForm(request.POST)
        if form.is_valid():
            form.save()
            return redirect('appointment_list')
    else:
        form = AppointmentForm()
    return render(request, 'opd/appointment_form.html', {'form': form})

