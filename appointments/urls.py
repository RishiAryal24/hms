# ----------------------------------------------------------------------
# LOCATION: HMS/appointments/urls.py
# ACTION:   CREATE this file inside HMS/appointments/
# ----------------------------------------------------------------------

from django.urls import path
from . import views

urlpatterns = [

    # List & Book
    path('',      views.AppointmentListView.as_view(), name='appointment-list'),
    path('book/', views.AppointmentBookView.as_view(), name='appointment-book'),

    # Today's schedule
    path('today/', views.TodayAppointmentsView.as_view(), name='appointment-today'),

    # Doctor availability check
    path('availability/', views.DoctorAvailabilityView.as_view(), name='doctor-availability'),

    # Detail, update, cancel, complete
    path('<int:pk>/',          views.AppointmentDetailView.as_view(),   name='appointment-detail'),
    path('<int:pk>/update/',   views.AppointmentUpdateView.as_view(),   name='appointment-update'),
    path('<int:pk>/cancel/',   views.AppointmentCancelView.as_view(),   name='appointment-cancel'),
    path('<int:pk>/complete/', views.AppointmentCompleteView.as_view(), name='appointment-complete'),

    # Queue management
    path('queue/',             views.QueueView.as_view(),       name='queue-list'),
    path('queue/<int:pk>/update/', views.QueueUpdateView.as_view(), name='queue-update'),

    # Doctor schedules (Admin only)
    path('schedules/',         views.DoctorScheduleListCreateView.as_view(), name='schedule-list'),
    path('schedules/<int:pk>/', views.DoctorScheduleDetailView.as_view(),   name='schedule-detail'),

    # Doctor leave (Admin only)
    path('leaves/',            views.DoctorLeaveListCreateView.as_view(), name='leave-list'),
    path('leaves/<int:pk>/',   views.DoctorLeaveDetailView.as_view(),    name='leave-detail'),
]