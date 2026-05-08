from django.urls import path

from . import views

urlpatterns = [
    path("wards/", views.WardListCreateView.as_view(), name="ipd-ward-list"),
    path("wards/<int:pk>/", views.WardDetailView.as_view(), name="ipd-ward-detail"),
    path("rooms/", views.RoomListCreateView.as_view(), name="ipd-room-list"),
    path("rooms/<int:pk>/", views.RoomDetailView.as_view(), name="ipd-room-detail"),
    path("beds/", views.BedListCreateView.as_view(), name="ipd-bed-list"),
    path("beds/<int:pk>/", views.BedDetailView.as_view(), name="ipd-bed-detail"),
    path("admissions/", views.ActiveAdmissionListView.as_view(), name="ipd-active-admissions"),
    path("assignments/", views.BedAssignmentListCreateView.as_view(), name="ipd-bed-assignment-list"),
    path("assignments/<int:pk>/release/", views.ReleaseBedView.as_view(), name="ipd-bed-release"),
    path("transfers/", views.BedTransferListView.as_view(), name="ipd-transfer-list"),
    path("transfers/create/", views.BedTransferView.as_view(), name="ipd-transfer-create"),
    path("admissions/<int:admission_pk>/nursing-rounds/", views.NursingRoundListCreateView.as_view(), name="ipd-nursing-rounds"),
    path("admissions/<int:admission_pk>/doctor-rounds/", views.DoctorRoundListCreateView.as_view(), name="ipd-doctor-rounds"),
    path("admissions/<int:admission_pk>/vitals/", views.IPDVitalSignListCreateView.as_view(), name="ipd-vitals"),
    path("admissions/<int:admission_pk>/orders/", views.DoctorOrderListCreateView.as_view(), name="ipd-orders"),
    path("admissions/<int:admission_pk>/orders/<int:pk>/complete/", views.CompleteDoctorOrderView.as_view(), name="ipd-order-complete"),
    path("admissions/<int:admission_pk>/discharge-clearance/", views.DischargeClearanceDetailView.as_view(), name="ipd-discharge-clearance"),
    path("admissions/<int:admission_pk>/discharge-clearance/clinical/", views.ClinicalDischargeClearanceView.as_view(), name="ipd-discharge-clinical"),
    path("admissions/<int:admission_pk>/discharge-clearance/nursing/", views.NursingDischargeClearanceView.as_view(), name="ipd-discharge-nursing"),
    path("admissions/<int:admission_pk>/discharge-clearance/billing/", views.BillingDischargeClearanceView.as_view(), name="ipd-discharge-billing"),
    path("admissions/<int:admission_pk>/discharge-clearance/pharmacy/", views.PharmacyDischargeClearanceView.as_view(), name="ipd-discharge-pharmacy"),
    path("admissions/<int:admission_pk>/discharge/", views.DischargeAdmissionView.as_view(), name="ipd-discharge"),
]
