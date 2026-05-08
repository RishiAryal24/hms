# Generated manually for the Operation Theater module.

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("billing", "0001_initial"),
        ("patients", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="OperatingRoom",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("name", models.CharField(max_length=100, unique=True)),
                ("location", models.CharField(blank=True, max_length=150)),
                ("is_active", models.BooleanField(default=True)),
                ("notes", models.TextField(blank=True)),
            ],
            options={
                "ordering": ["name"],
            },
        ),
        migrations.CreateModel(
            name="Procedure",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("code", models.CharField(max_length=30, unique=True)),
                ("name", models.CharField(max_length=200)),
                ("procedure_type", models.CharField(choices=[("minor", "Minor"), ("major", "Major"), ("emergency", "Emergency"), ("elective", "Elective"), ("other", "Other")], default="minor", max_length=30)),
                ("default_price", models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ("estimated_minutes", models.PositiveIntegerField(default=60)),
                ("is_active", models.BooleanField(default=True)),
                ("description", models.TextField(blank=True)),
            ],
            options={
                "ordering": ["procedure_type", "name"],
            },
        ),
        migrations.CreateModel(
            name="TheaterBooking",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("booking_number", models.CharField(editable=False, max_length=30, unique=True)),
                ("scheduled_at", models.DateTimeField()),
                ("status", models.CharField(choices=[("scheduled", "Scheduled"), ("in_progress", "In Progress"), ("completed", "Completed"), ("cancelled", "Cancelled")], default="scheduled", max_length=30)),
                ("priority", models.CharField(choices=[("routine", "Routine"), ("urgent", "Urgent"), ("emergency", "Emergency")], default="routine", max_length=20)),
                ("anesthesia_type", models.CharField(choices=[("none", "None"), ("local", "Local"), ("spinal", "Spinal"), ("general", "General"), ("sedation", "Sedation"), ("other", "Other")], default="none", max_length=30)),
                ("indication", models.TextField(blank=True)),
                ("procedure_notes", models.TextField(blank=True)),
                ("outcome", models.TextField(blank=True)),
                ("complications", models.TextField(blank=True)),
                ("started_at", models.DateTimeField(blank=True, null=True)),
                ("completed_at", models.DateTimeField(blank=True, null=True)),
                ("admission", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="theater_bookings", to="patients.admissionrecord")),
                ("assistant", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="assistant_bookings", to=settings.AUTH_USER_MODEL)),
                ("booked_by", models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="booked_theater_cases", to=settings.AUTH_USER_MODEL)),
                ("completed_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="completed_theater_cases", to=settings.AUTH_USER_MODEL)),
                ("invoice_line", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="theater_bookings", to="billing.invoiceline")),
                ("nurse", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="theater_nurse_bookings", to=settings.AUTH_USER_MODEL)),
                ("operating_room", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="bookings", to="theater.operatingroom")),
                ("patient", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="theater_bookings", to="patients.patient")),
                ("procedure", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="bookings", to="theater.procedure")),
                ("surgeon", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="surgeon_bookings", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "ordering": ["-scheduled_at", "-created_at"],
            },
        ),
    ]
