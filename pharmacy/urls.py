from django.urls import path

from . import views

urlpatterns = [
    path("summary/", views.PharmacySummaryView.as_view(), name="pharmacy-summary"),
    path("items/", views.PharmacyItemListCreateView.as_view(), name="pharmacy-item-list"),
    path("items/<int:pk>/", views.PharmacyItemDetailView.as_view(), name="pharmacy-item-detail"),
    path("movements/", views.StockMovementListCreateView.as_view(), name="stock-movement-list"),
]
