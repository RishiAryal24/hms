# Generated manually for the HR module.

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="EmployeeProfile",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("employee_code", models.CharField(max_length=50, unique=True)),
                ("employment_type", models.CharField(choices=[("permanent", "Permanent"), ("contract", "Contract"), ("visiting", "Visiting"), ("intern", "Intern"), ("other", "Other")], default="permanent", max_length=30)),
                ("status", models.CharField(choices=[("active", "Active"), ("on_leave", "On Leave"), ("suspended", "Suspended"), ("resigned", "Resigned")], default="active", max_length=30)),
                ("joining_date", models.DateField(blank=True, null=True)),
                ("designation", models.CharField(blank=True, max_length=120)),
                ("emergency_contact", models.CharField(blank=True, max_length=120)),
                ("address", models.TextField(blank=True)),
                ("notes", models.TextField(blank=True)),
                ("user", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="hr_profile", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "ordering": ["user__first_name", "user__last_name", "employee_code"],
            },
        ),
        migrations.CreateModel(
            name="DutyRoster",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("duty_date", models.DateField()),
                ("shift", models.CharField(choices=[("morning", "Morning"), ("evening", "Evening"), ("night", "Night"), ("on_call", "On Call")], default="morning", max_length=30)),
                ("location", models.CharField(choices=[("opd", "OPD"), ("ipd", "IPD"), ("lab", "Lab"), ("pharmacy", "Pharmacy"), ("ot", "OT"), ("reception", "Reception"), ("billing", "Billing"), ("admin", "Admin"), ("other", "Other")], default="opd", max_length=30)),
                ("department", models.CharField(blank=True, max_length=100)),
                ("start_time", models.TimeField(blank=True, null=True)),
                ("end_time", models.TimeField(blank=True, null=True)),
                ("notes", models.TextField(blank=True)),
                ("assigned_by", models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="assigned_duty_rosters", to=settings.AUTH_USER_MODEL)),
                ("employee", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="duty_rosters", to="hr.employeeprofile")),
            ],
            options={
                "ordering": ["-duty_date", "shift", "employee__user__first_name"],
                "unique_together": {("employee", "duty_date", "shift", "location")},
            },
        ),
    ]
