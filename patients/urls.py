# ----------------------------------------------------------------------
# LOCATION: HMS/patients/urls.py
# ACTION:   CREATE this file inside HMS/patients/
# ----------------------------------------------------------------------

from django.urls import path
from . import views

urlpatterns = [

    # List & Register
    path('',          views.PatientListView.as_view(),     name='patient-list'),
    path('register/', views.PatientRegisterView.as_view(), name='patient-register'),

    # Record management
    path('<int:pk>/',             views.PatientDetailView.as_view(),    name='patient-detail'),
    path('<int:pk>/update/',      views.PatientUpdateView.as_view(),    name='patient-update'),
    path('<int:pk>/deactivate/',  views.PatientDeactivateView.as_view(),name='patient-deactivate'),
    path('<int:patient_pk>/summary/', views.PatientSummaryView.as_view(), name='patient-summary'),

    # Emergency Contacts  (Receptionist)
    path('<int:patient_pk>/emergency-contacts/',
         views.EmergencyContactListCreateView.as_view(), name='emergency-contact-list'),
    path('<int:patient_pk>/emergency-contacts/<int:pk>/',
         views.EmergencyContactDetailView.as_view(),     name='emergency-contact-detail'),

    # Insurance  (Receptionist + Billing Staff)
    path('<int:patient_pk>/insurance/',
         views.InsuranceListCreateView.as_view(), name='insurance-list'),
    path('<int:patient_pk>/insurance/<int:pk>/',
         views.InsuranceDetailView.as_view(),     name='insurance-detail'),

    # Medical History  (Doctors only)
    path('<int:patient_pk>/medical-history/',
         views.MedicalHistoryView.as_view(), name='medical-history'),

    # Allergies  (Doctors only)
    path('<int:patient_pk>/allergies/',
         views.AllergyListCreateView.as_view(), name='allergy-list'),
    path('<int:patient_pk>/allergies/<int:pk>/',
         views.AllergyDetailView.as_view(),     name='allergy-detail'),

    # Medications  (Doctors only)
    path('<int:patient_pk>/medications/',
         views.MedicationListCreateView.as_view(), name='medication-list'),
    path('<int:patient_pk>/medications/<int:pk>/',
         views.MedicationDetailView.as_view(),     name='medication-detail'),

    # Admissions  (Receptionist admits / Doctor discharges)
    path('<int:patient_pk>/admissions/',
         views.AdmissionListCreateView.as_view(), name='admission-list'),
    path('<int:patient_pk>/admissions/<int:pk>/',
         views.AdmissionDetailView.as_view(),     name='admission-detail'),
    path('<int:patient_pk>/admissions/<int:pk>/discharge/',
         views.DischargePatientView.as_view(),    name='discharge-patient'),

    # Vital Signs  (Nurses + Doctors record / all staff view)
    path('<int:patient_pk>/vitals/',
         views.VitalSignListCreateView.as_view(), name='vital-list'),
    path('<int:patient_pk>/vitals/<int:pk>/',
         views.VitalSignDetailView.as_view(),     name='vital-detail'),

    # Documents  (Receptionist uploads / all staff view)
    path('<int:patient_pk>/documents/',
         views.PatientDocumentListCreateView.as_view(), name='document-list'),
    path('<int:patient_pk>/documents/<int:pk>/',
         views.PatientDocumentDetailView.as_view(),     name='document-detail'),

    # Notes  (All staff write / confidential = doctors only)
    path('<int:patient_pk>/notes/',
         views.PatientNoteListCreateView.as_view(), name='note-list'),
    path('<int:patient_pk>/notes/<int:pk>/',
         views.PatientNoteDetailView.as_view(),     name='note-detail'),
]