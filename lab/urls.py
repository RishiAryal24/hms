from django.urls import path

from . import views

urlpatterns = [
    path("summary/", views.LabSummaryView.as_view(), name="lab-summary"),
    path("tests/", views.LabTestListCreateView.as_view(), name="lab-test-list"),
    path("tests/<int:pk>/", views.LabTestDetailView.as_view(), name="lab-test-detail"),
    path("orders/", views.LabOrderListCreateView.as_view(), name="lab-order-list"),
    path("orders/<int:pk>/", views.LabOrderDetailView.as_view(), name="lab-order-detail"),
    path("orders/<int:pk>/collect/", views.CollectSampleView.as_view(), name="lab-order-collect"),
    path("orders/<int:order_pk>/items/", views.LabOrderItemListView.as_view(), name="lab-order-items"),
    path("orders/<int:order_pk>/items/<int:pk>/result/", views.EnterResultView.as_view(), name="lab-result-entry"),
]
