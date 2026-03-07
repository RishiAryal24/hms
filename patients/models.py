# ----------------------------------------------------------------------
# LOCATION: HMS/patients/models.py
# ACTION:   CREATE this file inside HMS/patients/
# ----------------------------------------------------------------------

from django.db import models
from django.core.validators import RegexValidator, MinValueValidator, MaxValueValidator
from core.models import TimeStampedModel
from accounts.models import User


# ========================
# Choices
# ========================

class Gender(models.TextChoices):
    MALE              = 'male',              'Male'
    FEMALE            = 'female',            'Female'
    OTHER             = 'other',             'Other'
    PREFER_NOT_TO_SAY = 'prefer_not_to_say', 'Prefer Not to Say'


class BloodGroup(models.TextChoices):
    A_POS   = 'A+',      'A+'
    A_NEG   = 'A-',      'A-'
    B_POS   = 'B+',      'B+'
    B_NEG   = 'B-',      'B-'
    AB_POS  = 'AB+',     'AB+'
    AB_NEG  = 'AB-',     'AB-'
    O_POS   = 'O+',      'O+'
    O_NEG   = 'O-',      'O-'
    UNKNOWN = 'unknown', 'Unknown'


class MaritalStatus(models.TextChoices):
    SINGLE    = 'single',    'Single'
    MARRIED   = 'married',   'Married'
    DIVORCED  = 'divorced',  'Divorced'
    WIDOWED   = 'widowed',   'Widowed'
    SEPARATED = 'separated', 'Separated'


class PatientStatus(models.TextChoices):
    ACTIVE      = 'active',      'Active'
    INACTIVE    = 'inactive',    'Inactive'
    DECEASED    = 'deceased',    'Deceased'
    TRANSFERRED = 'transferred', 'Transferred'


class AdmissionType(models.TextChoices):
    OUTPATIENT = 'outpatient', 'Outpatient (OPD)'
    INPATIENT  = 'inpatient',  'Inpatient (IPD)'
    EMERGENCY  = 'emergency',  'Emergency'
    DAY_CARE   = 'day_care',   'Day Care'


class AdmissionStatus(models.TextChoices):
    ADMITTED    = 'admitted',    'Admitted'
    DISCHARGED  = 'discharged',  'Discharged'
    TRANSFERRED = 'transferred', 'Transferred'
    ABSCONDED   = 'absconded',   'Absconded'


class AllergyType(models.TextChoices):
    DRUG          = 'drug',          'Drug'
    FOOD          = 'food',          'Food'
    ENVIRONMENTAL = 'environmental', 'Environmental'
    OTHER         = 'other',         'Other'


class AllergySeverity(models.TextChoices):
    MILD             = 'mild',             'Mild'
    MODERATE         = 'moderate',         'Moderate'
    SEVERE           = 'severe',           'Severe'
    LIFE_THREATENING = 'life_threatening', 'Life Threatening'


class DocumentType(models.TextChoices):
    NATIONAL_ID       = 'national_id',       'National ID'
    PASSPORT          = 'passport',          'Passport'
    DRIVERS_LICENSE   = 'drivers_license',   "Driver's License"
    INSURANCE_CARD    = 'insurance_card',    'Insurance Card'
    BIRTH_CERTIFICATE = 'birth_certificate', 'Birth Certificate'
    OTHER             = 'other',             'Other'


# ========================
# Patient
# ========================

class Patient(TimeStampedModel):
    """
    Core patient record.
    Created by receptionist at front desk.
    """
    phone_regex = RegexValidator(
        regex=r'^\+?1?\d{9,15}$',
        message="Phone number must be in format: '+999999999'. Up to 15 digits."
    )

    # Identity
    patient_id      = models.CharField(max_length=20, unique=True, editable=False)
    first_name      = models.CharField(max_length=100)
    middle_name     = models.CharField(max_length=100, blank=True)
    last_name       = models.CharField(max_length=100)
    date_of_birth   = models.DateField()
    gender          = models.CharField(max_length=20, choices=Gender.choices)
    blood_group     = models.CharField(max_length=10, choices=BloodGroup.choices,
                                       default=BloodGroup.UNKNOWN)
    marital_status  = models.CharField(max_length=20, choices=MaritalStatus.choices, blank=True)
    nationality     = models.CharField(max_length=100, blank=True)
    religion        = models.CharField(max_length=100, blank=True)
    occupation      = models.CharField(max_length=150, blank=True)
    profile_picture = models.ImageField(upload_to='patients/profiles/', null=True, blank=True)

    # Contact
    phone           = models.CharField(validators=[phone_regex], max_length=17)
    alternate_phone = models.CharField(validators=[phone_regex], max_length=17, blank=True)
    email           = models.EmailField(blank=True)

    # Address
    address_line1 = models.CharField(max_length=255)
    address_line2 = models.CharField(max_length=255, blank=True)
    city          = models.CharField(max_length=100)
    state         = models.CharField(max_length=100)
    postal_code   = models.CharField(max_length=20)
    country       = models.CharField(max_length=100, default='Nepal')

    # Status
    status = models.CharField(max_length=20, choices=PatientStatus.choices,
                               default=PatientStatus.ACTIVE)
    is_vip = models.BooleanField(default=False)

    # Assignment
    registered_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True,
        related_name='registered_patients',
        help_text='Receptionist who registered this patient.'
    )
    primary_doctor = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='primary_patients',
        limit_choices_to={'role__name': 'doctor'}
    )

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Patient'
        verbose_name_plural = 'Patients'

    def __str__(self):
        return f"{self.patient_id} — {self.get_full_name()}"

    def get_full_name(self):
        return ' '.join(p for p in [self.first_name, self.middle_name, self.last_name] if p)

    @property
    def age(self):
        from datetime import date
        today = date.today()
        dob   = self.date_of_birth
        return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))

    def save(self, *args, **kwargs):
        if not self.patient_id:
            last    = Patient.objects.order_by('-id').first()
            next_id = (last.id + 1) if last else 1
            self.patient_id = f"HMS-{next_id:05d}"
        super().save(*args, **kwargs)


# ========================
# Emergency Contact
# ========================

class EmergencyContact(models.Model):
    """Registered by receptionist alongside the patient."""
    patient         = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='emergency_contacts')
    name            = models.CharField(max_length=200)
    relationship    = models.CharField(max_length=100)
    phone           = models.CharField(max_length=17)
    alternate_phone = models.CharField(max_length=17, blank=True)
    email           = models.EmailField(blank=True)
    address         = models.TextField(blank=True)
    is_primary      = models.BooleanField(default=False)

    class Meta:
        ordering = ['-is_primary']

    def __str__(self):
        return f"{self.name} ({self.relationship}) — {self.patient.patient_id}"

    def save(self, *args, **kwargs):
        if self.is_primary:
            EmergencyContact.objects.filter(
                patient=self.patient, is_primary=True
            ).exclude(pk=self.pk).update(is_primary=False)
        super().save(*args, **kwargs)


# ========================
# Insurance
# ========================

class PatientInsurance(TimeStampedModel):
    """Managed by receptionist and billing staff."""
    patient                 = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='insurance_records')
    provider_name           = models.CharField(max_length=200)
    policy_number           = models.CharField(max_length=100)
    group_number            = models.CharField(max_length=100, blank=True)
    policy_holder_name      = models.CharField(max_length=200)
    policy_holder_dob       = models.DateField(null=True, blank=True)
    relationship_to_patient = models.CharField(max_length=100, default='Self')
    coverage_type           = models.CharField(max_length=100, blank=True)
    coverage_start          = models.DateField(null=True, blank=True)
    coverage_end            = models.DateField(null=True, blank=True)
    copay_amount            = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    is_primary              = models.BooleanField(default=True)
    is_active               = models.BooleanField(default=True)

    class Meta:
        ordering = ['-is_primary', '-is_active']

    def __str__(self):
        return f"{self.provider_name} — {self.policy_number}"


# ========================
# Medical History
# ========================

class MedicalHistory(TimeStampedModel):
    """One per patient. Auto-created on registration. Updated by doctor."""
    patient = models.OneToOneField(Patient, on_delete=models.CASCADE, related_name='medical_history')

    chronic_conditions = models.TextField(blank=True)
    past_surgeries     = models.TextField(blank=True)
    family_history     = models.TextField(blank=True)

    smoking_status = models.CharField(
        max_length=20,
        choices=[('never', 'Never'), ('former', 'Former Smoker'), ('current', 'Current Smoker')],
        default='never'
    )
    alcohol_use = models.CharField(
        max_length=20,
        choices=[('none', 'None'), ('occasional', 'Occasional'), ('moderate', 'Moderate'), ('heavy', 'Heavy')],
        default='none'
    )
    exercise_frequency = models.CharField(
        max_length=20,
        choices=[('sedentary', 'Sedentary'), ('light', 'Light'), ('moderate', 'Moderate'), ('active', 'Active')],
        default='sedentary'
    )
    diet_type = models.CharField(max_length=100, blank=True)
    height_cm = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True,
                                    validators=[MinValueValidator(30), MaxValueValidator(300)])
    weight_kg = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True,
                                    validators=[MinValueValidator(1), MaxValueValidator(700)])
    notes = models.TextField(blank=True)

    @property
    def bmi(self):
        if self.height_cm and self.weight_kg and self.height_cm > 0:
            h = float(self.height_cm) / 100
            return round(float(self.weight_kg) / (h ** 2), 1)
        return None

    def __str__(self):
        return f"Medical History — {self.patient.patient_id}"


# ========================
# Allergy
# ========================

class Allergy(TimeStampedModel):
    """Recorded by doctor."""
    patient      = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='allergies')
    allergy_type = models.CharField(max_length=20, choices=AllergyType.choices)
    allergen     = models.CharField(max_length=200)
    reaction     = models.CharField(max_length=255)
    severity     = models.CharField(max_length=20, choices=AllergySeverity.choices)
    notes        = models.TextField(blank=True)
    recorded_by  = models.ForeignKey(User, on_delete=models.SET_NULL, null=True,
                                     related_name='recorded_allergies')

    class Meta:
        verbose_name_plural = 'Allergies'
        ordering = ['-severity']

    def __str__(self):
        return f"{self.allergen} ({self.severity}) — {self.patient.patient_id}"


# ========================
# Current Medication
# ========================

class CurrentMedication(TimeStampedModel):
    """Prescribed by doctor."""
    patient         = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='current_medications')
    medication_name = models.CharField(max_length=200)
    dosage          = models.CharField(max_length=100)
    frequency       = models.CharField(max_length=100)
    route           = models.CharField(
        max_length=50,
        choices=[
            ('oral', 'Oral'), ('intravenous', 'Intravenous'),
            ('intramuscular', 'Intramuscular'), ('subcutaneous', 'Subcutaneous'),
            ('topical', 'Topical'), ('inhalation', 'Inhalation'), ('other', 'Other'),
        ],
        default='oral'
    )
    prescribed_by = models.CharField(max_length=200, blank=True)
    start_date    = models.DateField(null=True, blank=True)
    end_date      = models.DateField(null=True, blank=True)
    is_ongoing    = models.BooleanField(default=True)
    notes         = models.TextField(blank=True)

    class Meta:
        ordering = ['-is_ongoing', '-created_at']

    def __str__(self):
        return f"{self.medication_name} {self.dosage} — {self.patient.patient_id}"


# ========================
# Admission Record
# ========================

class AdmissionRecord(TimeStampedModel):
    """
    Created by receptionist (admit).
    Closed by doctor (discharge).
    """
    patient          = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='admissions')
    admission_number = models.CharField(max_length=30, unique=True, editable=False)
    admission_type   = models.CharField(max_length=20, choices=AdmissionType.choices)
    status           = models.CharField(max_length=20, choices=AdmissionStatus.choices,
                                        default=AdmissionStatus.ADMITTED)
    admission_date   = models.DateTimeField()
    discharge_date   = models.DateTimeField(null=True, blank=True)

    admitting_doctor = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True,
        related_name='admissions_as_doctor',
        limit_choices_to={'role__name': 'doctor'}
    )
    ward       = models.CharField(max_length=100, blank=True)
    bed_number = models.CharField(max_length=20, blank=True)
    department = models.CharField(max_length=100, blank=True)

    chief_complaint        = models.TextField()
    diagnosis_on_admission = models.TextField(blank=True)
    diagnosis_on_discharge = models.TextField(blank=True)
    discharge_summary      = models.TextField(blank=True)

    referred_by   = models.CharField(max_length=200, blank=True)
    referred_from = models.CharField(max_length=200, blank=True)
    admitted_by   = models.ForeignKey(User, on_delete=models.SET_NULL, null=True,
                                      related_name='admissions_as_staff')

    class Meta:
        ordering = ['-admission_date']

    def __str__(self):
        return f"{self.admission_number} — {self.patient.patient_id}"

    @property
    def length_of_stay(self):
        import django.utils.timezone as tz
        end = self.discharge_date or tz.now()
        return (end - self.admission_date).days

    def save(self, *args, **kwargs):
        if not self.admission_number:
            last    = AdmissionRecord.objects.order_by('-id').first()
            next_id = (last.id + 1) if last else 1
            self.admission_number = f"ADM-{next_id:06d}"
        super().save(*args, **kwargs)


# ========================
# Vital Signs
# ========================

class VitalSign(TimeStampedModel):
    """Recorded by nurse or doctor."""
    patient   = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='vital_signs')
    admission = models.ForeignKey(AdmissionRecord, on_delete=models.SET_NULL,
                                  null=True, blank=True, related_name='vitals')

    temperature_celsius = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True,
                                              validators=[MinValueValidator(25.0), MaxValueValidator(45.0)])
    pulse_rate          = models.PositiveIntegerField(null=True, blank=True,
                                                      validators=[MinValueValidator(20), MaxValueValidator(300)])
    respiratory_rate    = models.PositiveIntegerField(null=True, blank=True,
                                                      validators=[MinValueValidator(5), MaxValueValidator(60)])
    systolic_bp         = models.PositiveIntegerField(null=True, blank=True,
                                                      validators=[MinValueValidator(50), MaxValueValidator(300)])
    diastolic_bp        = models.PositiveIntegerField(null=True, blank=True,
                                                      validators=[MinValueValidator(20), MaxValueValidator(200)])
    oxygen_saturation   = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True,
                                              validators=[MinValueValidator(0), MaxValueValidator(100)])
    blood_glucose       = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    weight_kg           = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    height_cm           = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    pain_score          = models.PositiveIntegerField(null=True, blank=True,
                                                      validators=[MinValueValidator(0), MaxValueValidator(10)])
    notes       = models.TextField(blank=True)
    recorded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True,
                                    related_name='recorded_vitals')

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Vitals @ {self.created_at:%Y-%m-%d %H:%M} — {self.patient.patient_id}"

    @property
    def blood_pressure(self):
        if self.systolic_bp and self.diastolic_bp:
            return f"{self.systolic_bp}/{self.diastolic_bp} mmHg"
        return None

    @property
    def bmi(self):
        if self.height_cm and self.weight_kg and self.height_cm > 0:
            h = float(self.height_cm) / 100
            return round(float(self.weight_kg) / (h ** 2), 1)
        return None


# ========================
# Patient Document
# ========================

class PatientDocument(TimeStampedModel):
    """Uploaded by receptionist."""
    patient       = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='documents')
    document_type = models.CharField(max_length=30, choices=DocumentType.choices)
    title         = models.CharField(max_length=255)
    file          = models.FileField(upload_to='patients/documents/%Y/%m/')
    description   = models.TextField(blank=True)
    uploaded_by   = models.ForeignKey(User, on_delete=models.SET_NULL, null=True,
                                      related_name='uploaded_documents')

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} ({self.document_type}) — {self.patient.patient_id}"


# ========================
# Patient Note
# ========================

class PatientNote(TimeStampedModel):
    """Written by any clinical staff. Confidential notes visible to doctors only."""
    NOTE_TYPES = [
        ('clinical',       'Clinical'),
        ('nursing',        'Nursing'),
        ('administrative', 'Administrative'),
        ('follow_up',      'Follow Up'),
        ('discharge',      'Discharge'),
    ]
    patient         = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='notes')
    admission       = models.ForeignKey(AdmissionRecord, on_delete=models.SET_NULL,
                                        null=True, blank=True, related_name='notes')
    note_type       = models.CharField(max_length=20, choices=NOTE_TYPES, default='clinical')
    content         = models.TextField()
    is_confidential = models.BooleanField(default=False)
    created_by      = models.ForeignKey(User, on_delete=models.SET_NULL, null=True,
                                        related_name='patient_notes')

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.note_type.title()} note — {self.patient.patient_id}"