from django.urls import path

from . import views

urlpatterns = [
    path("summary/", views.BillingSummaryView.as_view(), name="billing-summary"),
    path("charges/", views.ChargeItemListCreateView.as_view(), name="charge-list"),
    path("charges/<int:pk>/", views.ChargeItemDetailView.as_view(), name="charge-detail"),
    path("invoices/", views.InvoiceListCreateView.as_view(), name="invoice-list"),
    path("invoices/<int:pk>/", views.InvoiceDetailView.as_view(), name="invoice-detail"),
    path("invoices/<int:pk>/issue/", views.IssueInvoiceView.as_view(), name="invoice-issue"),
    path("invoices/<int:pk>/cancel/", views.CancelInvoiceView.as_view(), name="invoice-cancel"),
    path("invoices/<int:invoice_pk>/lines/", views.InvoiceLineCreateView.as_view(), name="invoice-line-create"),
    path("invoices/<int:invoice_pk>/lines/<int:pk>/", views.InvoiceLineDetailView.as_view(), name="invoice-line-detail"),
    path("invoices/<int:invoice_pk>/payments/", views.PaymentListView.as_view(), name="payment-list"),
    path("invoices/<int:invoice_pk>/payments/create/", views.PaymentCreateView.as_view(), name="payment-create"),
]
