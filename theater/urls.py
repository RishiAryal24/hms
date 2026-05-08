from django.urls import path

from . import views

urlpatterns = [
    path("summary/", views.TheaterSummaryView.as_view(), name="theater-summary"),
    path("options/", views.TheaterOptionsView.as_view(), name="theater-options"),
    path("procedures/", views.ProcedureListCreateView.as_view(), name="procedure-list"),
    path("procedures/<int:pk>/", views.ProcedureDetailView.as_view(), name="procedure-detail"),
    path("rooms/", views.OperatingRoomListCreateView.as_view(), name="operating-room-list"),
    path("rooms/<int:pk>/", views.OperatingRoomDetailView.as_view(), name="operating-room-detail"),
    path("bookings/", views.TheaterBookingListCreateView.as_view(), name="theater-booking-list"),
    path("bookings/<int:pk>/", views.TheaterBookingDetailView.as_view(), name="theater-booking-detail"),
    path("bookings/<int:pk>/start/", views.StartTheaterBookingView.as_view(), name="theater-booking-start"),
    path("bookings/<int:pk>/complete/", views.CompleteTheaterBookingView.as_view(), name="theater-booking-complete"),
    path("bookings/<int:pk>/cancel/", views.CancelTheaterBookingView.as_view(), name="theater-booking-cancel"),
]
