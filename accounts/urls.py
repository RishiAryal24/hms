# ----------------------------------------------------------------------
# LOCATION: HMS/accounts/urls.py
# ACTION:   CREATE this file inside HMS/accounts/
# ----------------------------------------------------------------------

from django.urls import path
from . import views

urlpatterns = [

    # Auth
    path('login/',           views.LoginView.as_view(),         name='login'),
    path('refresh/',         views.RefreshTokenView.as_view(),  name='token-refresh'),
    path('logout/',          views.LogoutView.as_view(),        name='logout'),

    # Current user
    path('me/',              views.MeView.as_view(),            name='me'),
    path('change-password/', views.ChangePasswordView.as_view(),name='change-password'),

    # Staff management (Tenant Admin only)
    path('staff/',           views.StaffListCreateView.as_view(),  name='staff-list'),
    path('staff/<int:pk>/',  views.StaffDetailView.as_view(),      name='staff-detail'),
    path('staff/<int:pk>/reset-password/',
         views.ResetStaffPasswordView.as_view(), name='staff-reset-password'),

    # Roles
    path('roles/',           views.RoleListView.as_view(),      name='role-list'),
]