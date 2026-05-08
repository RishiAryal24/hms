import { useEffect, useMemo, useState } from "react";
import { getDoctorProfiles } from "../../api/clinical";
import { createLabOrder, getLabTests } from "../../api/lab";
import { addReferral } from "../../api/patients";
import {
  assignBed,
  clearBillingDischarge,
  clearClinicalDischarge,
  clearNursingDischarge,
  clearPharmacyDischarge,
  createBed,
  completeDoctorOrder,
  createDoctorRound,
  createDoctorOrder,
  createIPDVital,
  createNursingRound,
  createWard,
  dischargeAdmission,
  getActiveAdmissions,
  getBeds,
  getDoctorRounds,
  getDoctorOrders,
  getDischargeClearance,
  getIPDVitals,
  getNursingRounds,
  getWards,
} from "../../api/inpatient";
import { Alert, Badge, Btn, Card, Empty, Field, Modal, Spinner, Tabs } from "../../components/ui";
import useAuthStore from "../../store/authStore";

const WARD_TYPES = [
  { value: "general", label: "General" },
  { value: "private", label: "Private" },
  { value: "icu", label: "ICU" },
  { value: "nicu", label: "NICU" },
  { value: "maternity", label: "Maternity" },
  { value: "emergency", label: "Emergency" },
];

const STATUS_COLOR = {
  available: "var(--green)",
  occupied: "var(--red)",
  reserved: "var(--amber)",
  cleaning: "var(--blue)",
  maintenance: "var(--text-mute)",
};

const emptyWard = { name: "", ward_type: "general", department: "", floor: "", is_active: true };
const emptyBed = { ward: "", bed_number: "", status: "available", daily_rate: "", notes: "" };
const emptyAssign = { admission: "", bed: "", notes: "" };
const emptyDoctorRound = { admission: "", doctor: "", condition: "", diagnosis: "", treatment_plan: "", notes: "", visit_fee: "" };
const emptyNursingRound = { admission: "", condition: "", intake_output: "", pain_score: "", notes: "" };
const emptyVital = {
  admission: "",
  temperature_celsius: "",
  pulse_rate: "",
  respiratory_rate: "",
  systolic_bp: "",
  diastolic_bp: "",
  oxygen_saturation: "",
  blood_glucose: "",
  pain_score: "",
  notes: "",
};
const emptyOrder = { admission: "", order_type: "medication", priority: "routine", title: "", instructions: "" };
const emptyLabFromOrder = { source_order: "", patient: "", admission: "", priority: "routine", clinical_notes: "", tests: [] };
const emptyReferral = {
  patient: "",
  admission: "",
  patientName: "",
  referral_type: "external",
  referred_to_facility: "",
  referred_to_department: "",
  referred_to_doctor: "",
  reason: "",
  provisional_diagnosis: "",
  treatment_given: "",
  investigations_summary: "",
  current_condition: "",
  transport_advice: "",
  notes: "",
  mark_admission_transferred: false,
};
const emptyDischarge = {
  admission: "",
  patientName: "",
  final_diagnosis: "",
  discharge_summary: "",
  treatment_given: "",
  condition_at_discharge: "",
  discharge_medications: "",
  follow_up_advice: "",
  clinical_notes: "",
  vitals_stable: false,
  iv_removed: false,
  catheter_removed: false,
  instructions_explained: false,
  nursing_notes: "",
  generate_bed_charges: true,
  billing_notes: "",
  pharmacy_notes: "",
  clinical_cleared: false,
  nursing_cleared: false,
  billing_cleared: false,
  pharmacy_cleared: false,
};

const ORDER_TYPES = [
  { value: "medication", label: "Medication" },
  { value: "investigation", label: "Investigation" },
  { value: "nursing", label: "Nursing" },
  { value: "diet", label: "Diet" },
  { value: "activity", label: "Activity" },
  { value: "other", label: "Other" },
];

const PRIORITIES = [
  { value: "routine", label: "Routine" },
  { value: "urgent", label: "Urgent" },
  { value: "stat", label: "STAT" },
];

export default function IPD() {
  const { user } = useAuthStore();
  const [tab, setTab] = useState("beds");
  const [wards, setWards] = useState([]);
  const [beds, setBeds] = useState([]);
  const [admissions, setAdmissions] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [labTests, setLabTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [wardModal, setWardModal] = useState(false);
  const [bedModal, setBedModal] = useState(false);
  const [assignModal, setAssignModal] = useState(false);
  const [roundModal, setRoundModal] = useState(false);
  const [nursingModal, setNursingModal] = useState(false);
  const [vitalModal, setVitalModal] = useState(false);
  const [orderModal, setOrderModal] = useState(false);
  const [labOrderModal, setLabOrderModal] = useState(false);
  const [historyModal, setHistoryModal] = useState(false);
  const [referralModal, setReferralModal] = useState(false);
  const [dischargeModal, setDischargeModal] = useState(false);
  const [wardForm, setWardForm] = useState(emptyWard);
  const [bedForm, setBedForm] = useState(emptyBed);
  const [assignForm, setAssignForm] = useState(emptyAssign);
  const [roundForm, setRoundForm] = useState(emptyDoctorRound);
  const [nursingForm, setNursingForm] = useState(emptyNursingRound);
  const [vitalForm, setVitalForm] = useState(emptyVital);
  const [orderForm, setOrderForm] = useState(emptyOrder);
  const [labOrderForm, setLabOrderForm] = useState(emptyLabFromOrder);
  const [referralForm, setReferralForm] = useState(emptyReferral);
  const [dischargeForm, setDischargeForm] = useState(emptyDischarge);
  const [roundHistory, setRoundHistory] = useState({ admission: null, doctors: [], nursing: [], vitals: [], orders: [] });
  const [saving, setSaving] = useState(false);
  const canConfigureBeds = !!(user?.is_tenant_admin || user?.is_superuser);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [wardRes, bedRes, admissionRes, doctorRes, labTestRes] = await Promise.all([
        getWards(),
        getBeds(),
        getActiveAdmissions(),
        getDoctorProfiles({ is_available: true }),
        getLabTests({ is_active: true }),
      ]);
      setWards(wardRes.data.results || wardRes.data);
      setBeds(bedRes.data.results || bedRes.data);
      setAdmissions(admissionRes.data.results || admissionRes.data);
      setDoctors(doctorRes.data.results || doctorRes.data);
      setLabTests(labTestRes.data.results || labTestRes.data);
    } catch {
      setError("Unable to load IPD data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const wardOptions = wards.map((ward) => ({ value: ward.id, label: ward.name }));
  const availableBedOptions = beds
    .filter((bed) => bed.status === "available")
    .map((bed) => ({ value: bed.id, label: `${bed.ward_name} - ${bed.bed_number}` }));
  const unassignedAdmissions = admissions.filter((admission) => !admission.active_bed);
  const admissionOptions = unassignedAdmissions.map((admission) => ({
    value: admission.id,
    label: `${admission.admission_number} - ${admission.patient_detail?.full_name || "Patient"}`,
  }));
  const doctorOptions = doctors.map((doctor) => ({
    value: doctor.user,
    label: `${doctor.full_name || doctor.username} - ${doctor.specialty}`,
  }));
  const labTestOptions = labTests.map((test) => ({
    value: test.id,
    label: `${test.code} - ${test.name} / Rs. ${test.price}`,
  }));

  const stats = useMemo(() => ({
    total: beds.length,
    available: beds.filter((bed) => bed.status === "available").length,
    occupied: beds.filter((bed) => bed.status === "occupied").length,
    activeAdmissions: admissions.length,
  }), [beds, admissions]);

  const handleWard = (event) => setWardForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const handleBed = (event) => setBedForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const handleAssign = (event) => setAssignForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const handleNursing = (event) => setNursingForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const handleVital = (event) => setVitalForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const handleOrder = (event) => setOrderForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const handleLabOrder = (event) => {
    if (event.target.name === "tests") {
      const values = Array.from(event.target.selectedOptions).map((option) => option.value);
      setLabOrderForm((current) => ({ ...current, tests: values }));
      return;
    }
    setLabOrderForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };
  const handleReferral = (event) => {
    const { name, value, type, checked } = event.target;
    setReferralForm((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
  };
  const handleDischarge = (event) => {
    const { name, value, type, checked } = event.target;
    setDischargeForm((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
  };
  const handleRound = (event) => {
    const next = { ...roundForm, [event.target.name]: event.target.value };
    if (event.target.name === "doctor") {
      const profile = doctors.find((doctor) => String(doctor.user) === String(event.target.value));
      if (profile) next.visit_fee = profile.consultation_fee || "";
    }
    setRoundForm(next);
  };

  const saveWard = async () => {
    setSaving(true);
    setError("");
    try {
      await createWard(wardForm);
      setWardModal(false);
      setWardForm(emptyWard);
      setSuccess("Ward created.");
      load();
    } catch (err) {
      setError(formatError(err));
    } finally {
      setSaving(false);
    }
  };

  const saveBed = async () => {
    setSaving(true);
    setError("");
    try {
      const payload = { ...bedForm, daily_rate: bedForm.daily_rate || null };
      await createBed(payload);
      setBedModal(false);
      setBedForm(emptyBed);
      setSuccess("Bed created.");
      load();
    } catch (err) {
      setError(formatError(err));
    } finally {
      setSaving(false);
    }
  };

  const saveAssignment = async () => {
    setSaving(true);
    setError("");
    try {
      await assignBed(assignForm);
      setAssignModal(false);
      setAssignForm(emptyAssign);
      setSuccess("Bed assigned.");
      load();
    } catch (err) {
      setError(formatError(err));
    } finally {
      setSaving(false);
    }
  };

  const openRoundModal = (admission) => {
    const profile = doctors.find((doctor) => String(doctor.user) === String(admission.admitting_doctor));
    setRoundForm({
      ...emptyDoctorRound,
      admission: admission.id,
      doctor: profile?.user || "",
      visit_fee: profile?.consultation_fee || "",
    });
    setRoundModal(true);
  };

  const saveDoctorRound = async () => {
    setSaving(true);
    setError("");
    try {
      const payload = { ...roundForm, visit_fee: roundForm.visit_fee || "0" };
      await createDoctorRound(roundForm.admission, payload);
      setRoundModal(false);
      setRoundForm(emptyDoctorRound);
      setSuccess("Doctor round recorded and billing charge added.");
      load();
    } catch (err) {
      setError(formatError(err));
    } finally {
      setSaving(false);
    }
  };

  const openNursingModal = (admission) => {
    setNursingForm({ ...emptyNursingRound, admission: admission.id });
    setNursingModal(true);
  };

  const saveNursingRound = async () => {
    setSaving(true);
    setError("");
    try {
      await createNursingRound(nursingForm.admission, nursingForm);
      setNursingModal(false);
      setNursingForm(emptyNursingRound);
      setSuccess("Nursing round recorded.");
      load();
    } catch (err) {
      setError(formatError(err));
    } finally {
      setSaving(false);
    }
  };

  const openVitalModal = (admission) => {
    setVitalForm({ ...emptyVital, admission: admission.id });
    setVitalModal(true);
  };

  const saveVital = async () => {
    setSaving(true);
    setError("");
    try {
      const payload = Object.fromEntries(
        Object.entries(vitalForm).filter(([key, value]) => key === "admission" || value !== ""),
      );
      await createIPDVital(vitalForm.admission, payload);
      setVitalModal(false);
      setVitalForm(emptyVital);
      setSuccess("Vitals recorded.");
      load();
    } catch (err) {
      setError(formatError(err));
    } finally {
      setSaving(false);
    }
  };

  const openOrderModal = (admission) => {
    setOrderForm({ ...emptyOrder, admission: admission.id });
    setOrderModal(true);
  };

  const saveOrder = async () => {
    setSaving(true);
    setError("");
    try {
      await createDoctorOrder(orderForm.admission, orderForm);
      setOrderModal(false);
      setOrderForm(emptyOrder);
      setSuccess("Doctor order created.");
      load();
    } catch (err) {
      setError(formatError(err));
    } finally {
      setSaving(false);
    }
  };

  const openHistoryModal = async (admission) => {
    setHistoryModal(true);
    setRoundHistory({ admission, doctors: [], nursing: [], vitals: [], orders: [] });
    try {
      const [doctorRes, nursingRes, vitalRes, orderRes] = await Promise.all([
        getDoctorRounds(admission.id),
        getNursingRounds(admission.id),
        getIPDVitals(admission.id),
        getDoctorOrders(admission.id),
      ]);
      setRoundHistory({
        admission,
        doctors: doctorRes.data.results || doctorRes.data,
        nursing: nursingRes.data.results || nursingRes.data,
        vitals: vitalRes.data.results || vitalRes.data,
        orders: orderRes.data.results || orderRes.data,
      });
    } catch {
      setError("Unable to load round history.");
    }
  };

  const markOrderComplete = async (order) => {
    if (!roundHistory.admission) return;
    try {
      await completeDoctorOrder(roundHistory.admission.id, order.id);
      openHistoryModal(roundHistory.admission);
    } catch {
      setError("Unable to complete order.");
    }
  };

  const openLabOrderModal = (order) => {
    if (!roundHistory.admission) return;
    setLabOrderForm({
      ...emptyLabFromOrder,
      source_order: order.id,
      patient: roundHistory.admission.patient,
      admission: roundHistory.admission.id,
      priority: order.priority || "routine",
      clinical_notes: `${order.title}: ${order.instructions}`,
    });
    setLabOrderModal(true);
  };

  const saveLabOrderFromDoctorOrder = async () => {
    setSaving(true);
    setError("");
    try {
      await createLabOrder(labOrderForm);
      setLabOrderModal(false);
      setLabOrderForm(emptyLabFromOrder);
      setSuccess("Lab order created from investigation order.");
      if (roundHistory.admission) openHistoryModal(roundHistory.admission);
    } catch (err) {
      setError(formatError(err));
    } finally {
      setSaving(false);
    }
  };

  const openReferralModal = (admission) => {
    setReferralForm({
      ...emptyReferral,
      patient: admission.patient,
      admission: admission.id,
      patientName: admission.patient_detail?.full_name || admission.admission_number,
      provisional_diagnosis: admission.diagnosis_on_admission || "",
      current_condition: admission.latest_vital ? `Latest vitals: BP ${admission.latest_vital.blood_pressure || "-"}, SpO2 ${admission.latest_vital.oxygen_saturation || "-"}` : "",
      mark_admission_transferred: false,
    });
    setReferralModal(true);
  };

  const saveReferral = async () => {
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...referralForm,
        referred_at: new Date().toISOString(),
      };
      const res = await addReferral(referralForm.patient, payload);
      setReferralModal(false);
      setReferralForm(emptyReferral);
      setSuccess("Referral recorded.");
      printReferral(res.data);
      load();
    } catch (err) {
      setError(formatError(err));
    } finally {
      setSaving(false);
    }
  };

  const openDischargeModal = async (admission) => {
    setDischargeModal(true);
    setDischargeForm({
      ...emptyDischarge,
      admission: admission.id,
      patientName: admission.patient_detail?.full_name || admission.admission_number,
      ...(admission.discharge_clearance || {}),
    });
    try {
      const clearanceRes = await getDischargeClearance(admission.id);
      setDischargeForm((current) => ({
        ...current,
        ...clearanceRes.data,
        admission: admission.id,
        patientName: admission.patient_detail?.full_name || admission.admission_number,
      }));
    } catch {
      setError("Unable to load discharge clearance.");
    }
  };

  const saveDischargeStep = async (step) => {
    setSaving(true);
    setError("");
    try {
      const stepMap = {
        clinical: clearClinicalDischarge,
        nursing: clearNursingDischarge,
        billing: clearBillingDischarge,
        pharmacy: clearPharmacyDischarge,
      };
      const res = await stepMap[step](dischargeForm.admission, dischargeForm);
      setDischargeForm((current) => ({ ...current, ...res.data }));
      setSuccess(`${step[0].toUpperCase()}${step.slice(1)} discharge clearance saved.`);
      load();
    } catch (err) {
      setError(formatError(err));
    } finally {
      setSaving(false);
    }
  };

  const saveDischarge = async () => {
    setSaving(true);
    setError("");
    try {
      await dischargeAdmission(dischargeForm.admission, {
        diagnosis_on_discharge: dischargeForm.final_diagnosis,
        discharge_summary: dischargeForm.discharge_summary,
        generate_bed_charges: dischargeForm.generate_bed_charges,
      });
      setDischargeModal(false);
      setDischargeForm(emptyDischarge);
      setSuccess("Patient discharged, bed released, and final billing prepared.");
      load();
    } catch (err) {
      setError(formatError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-enter" style={{ padding: 28 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "var(--font-display)" }}>Inpatient / IPD</div>
          <div style={{ fontSize: 13, color: "var(--text-mute)", marginTop: 2 }}>Beds, active admissions, and ward occupancy</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {canConfigureBeds && <Btn variant="secondary" onClick={() => setWardModal(true)}>Add Ward</Btn>}
          {canConfigureBeds && <Btn variant="secondary" onClick={() => setBedModal(true)}>Add Bed</Btn>}
          <Btn onClick={() => setAssignModal(true)} disabled={availableBedOptions.length === 0 || admissionOptions.length === 0}>Assign Bed</Btn>
        </div>
      </div>

      {error && <Alert message={error} />}
      {success && <Alert message={success} type="success" />}

      <div className="dashboard-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        <Card><Metric label="Total Beds" value={stats.total} /></Card>
        <Card><Metric label="Available" value={stats.available} color="var(--green)" /></Card>
        <Card><Metric label="Occupied" value={stats.occupied} color="var(--red)" /></Card>
        <Card><Metric label="Active Admissions" value={stats.activeAdmissions} color="var(--blue)" /></Card>
      </div>

      <Tabs tabs={[{ key: "beds", label: "Beds" }, { key: "admissions", label: "Active Admissions" }, { key: "wards", label: "Wards" }]} active={tab} onChange={setTab} />

      {loading ? <Spinner /> : (
        <>
          {tab === "beds" && <BedsTable beds={beds} />}
          {tab === "admissions" && (
            <AdmissionsTable
              admissions={admissions}
              onDoctorRound={openRoundModal}
              onNursingRound={openNursingModal}
              onVitals={openVitalModal}
              onOrder={openOrderModal}
              onHistory={openHistoryModal}
              onReferral={openReferralModal}
              onDischarge={openDischargeModal}
            />
          )}
          {tab === "wards" && <WardsTable wards={wards} />}
        </>
      )}

      <Modal open={wardModal} onClose={() => setWardModal(false)} title="Add Ward" width={460}>
        <Field label="Name" name="name" value={wardForm.name} onChange={handleWard} required />
        <Field label="Type" name="ward_type" value={wardForm.ward_type} onChange={handleWard} options={WARD_TYPES} />
        <Field label="Department" name="department" value={wardForm.department} onChange={handleWard} />
        <Field label="Floor" name="floor" value={wardForm.floor} onChange={handleWard} />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <Btn variant="secondary" onClick={() => setWardModal(false)}>Cancel</Btn>
          <Btn onClick={saveWard} disabled={saving || !wardForm.name}>Save Ward</Btn>
        </div>
      </Modal>

      <Modal open={bedModal} onClose={() => setBedModal(false)} title="Add Bed" width={460}>
        <Field label="Ward" name="ward" value={bedForm.ward} onChange={handleBed} options={wardOptions} required />
        <Field label="Bed Number" name="bed_number" value={bedForm.bed_number} onChange={handleBed} required />
        <Field label="Daily Rate" name="daily_rate" value={bedForm.daily_rate} onChange={handleBed} type="number" />
        <Field label="Notes" name="notes" value={bedForm.notes} onChange={handleBed} />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <Btn variant="secondary" onClick={() => setBedModal(false)}>Cancel</Btn>
          <Btn onClick={saveBed} disabled={saving || !bedForm.ward || !bedForm.bed_number}>Save Bed</Btn>
        </div>
      </Modal>

      <Modal open={assignModal} onClose={() => setAssignModal(false)} title="Assign Bed" width={520}>
        <Field label="Admission" name="admission" value={assignForm.admission} onChange={handleAssign} options={admissionOptions} required />
        <Field label="Available Bed" name="bed" value={assignForm.bed} onChange={handleAssign} options={availableBedOptions} required />
        <Field label="Notes" name="notes" value={assignForm.notes} onChange={handleAssign} />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <Btn variant="secondary" onClick={() => setAssignModal(false)}>Cancel</Btn>
          <Btn onClick={saveAssignment} disabled={saving || !assignForm.admission || !assignForm.bed}>Assign</Btn>
        </div>
      </Modal>

      <Modal open={roundModal} onClose={() => setRoundModal(false)} title="Doctor Round" width={600}>
        <Field label="Doctor" name="doctor" value={roundForm.doctor} onChange={handleRound} options={doctorOptions} required />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Condition" name="condition" value={roundForm.condition} onChange={handleRound} />
          <Field label="Visit Fee" name="visit_fee" value={roundForm.visit_fee} onChange={handleRound} type="number" />
        </div>
        <Field label="Diagnosis" name="diagnosis" value={roundForm.diagnosis} onChange={handleRound} />
        <Field label="Treatment Plan" name="treatment_plan" value={roundForm.treatment_plan} onChange={handleRound} />
        <Field label="Notes" name="notes" value={roundForm.notes} onChange={handleRound} required />
        <Alert type="info" message="Saving this round adds the visit fee to the patient's open IPD invoice." />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <Btn variant="secondary" onClick={() => setRoundModal(false)}>Cancel</Btn>
          <Btn onClick={saveDoctorRound} disabled={saving || !roundForm.doctor || !roundForm.notes}>Save Round</Btn>
        </div>
      </Modal>

      <Modal open={nursingModal} onClose={() => setNursingModal(false)} title="Nursing Round" width={560}>
        <Field label="Condition" name="condition" value={nursingForm.condition} onChange={handleNursing} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Pain Score" name="pain_score" value={nursingForm.pain_score} onChange={handleNursing} type="number" />
          <Field label="Intake / Output" name="intake_output" value={nursingForm.intake_output} onChange={handleNursing} />
        </div>
        <Field label="Notes" name="notes" value={nursingForm.notes} onChange={handleNursing} required />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <Btn variant="secondary" onClick={() => setNursingModal(false)}>Cancel</Btn>
          <Btn onClick={saveNursingRound} disabled={saving || !nursingForm.notes}>Save Round</Btn>
        </div>
      </Modal>

      <Modal open={vitalModal} onClose={() => setVitalModal(false)} title="Record Vitals" width={640}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          <Field label="Temp C" name="temperature_celsius" value={vitalForm.temperature_celsius} onChange={handleVital} type="number" />
          <Field label="Pulse" name="pulse_rate" value={vitalForm.pulse_rate} onChange={handleVital} type="number" />
          <Field label="Resp. Rate" name="respiratory_rate" value={vitalForm.respiratory_rate} onChange={handleVital} type="number" />
          <Field label="Systolic BP" name="systolic_bp" value={vitalForm.systolic_bp} onChange={handleVital} type="number" />
          <Field label="Diastolic BP" name="diastolic_bp" value={vitalForm.diastolic_bp} onChange={handleVital} type="number" />
          <Field label="SpO2" name="oxygen_saturation" value={vitalForm.oxygen_saturation} onChange={handleVital} type="number" />
          <Field label="Blood Glucose" name="blood_glucose" value={vitalForm.blood_glucose} onChange={handleVital} type="number" />
          <Field label="Pain Score" name="pain_score" value={vitalForm.pain_score} onChange={handleVital} type="number" />
        </div>
        <Field label="Notes" name="notes" value={vitalForm.notes} onChange={handleVital} />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <Btn variant="secondary" onClick={() => setVitalModal(false)}>Cancel</Btn>
          <Btn onClick={saveVital} disabled={saving}>Save Vitals</Btn>
        </div>
      </Modal>

      <Modal open={orderModal} onClose={() => setOrderModal(false)} title="Doctor Order" width={600}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Type" name="order_type" value={orderForm.order_type} onChange={handleOrder} options={ORDER_TYPES} />
          <Field label="Priority" name="priority" value={orderForm.priority} onChange={handleOrder} options={PRIORITIES} />
        </div>
        <Field label="Order" name="title" value={orderForm.title} onChange={handleOrder} required />
        <Field label="Instructions" name="instructions" value={orderForm.instructions} onChange={handleOrder} required />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <Btn variant="secondary" onClick={() => setOrderModal(false)}>Cancel</Btn>
          <Btn onClick={saveOrder} disabled={saving || !orderForm.title || !orderForm.instructions}>Create Order</Btn>
        </div>
      </Modal>

      <Modal open={historyModal} onClose={() => setHistoryModal(false)} title={`Rounds - ${roundHistory.admission?.admission_number || ""}`} width={760}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <RoundList title="Doctor Rounds" items={roundHistory.doctors} kind="doctor" />
          <RoundList title="Nursing Rounds" items={roundHistory.nursing} kind="nursing" />
          <VitalList vitals={roundHistory.vitals} />
          <OrderList orders={roundHistory.orders} onComplete={markOrderComplete} onLabOrder={openLabOrderModal} />
        </div>
      </Modal>

      <Modal open={labOrderModal} onClose={() => setLabOrderModal(false)} title="Create Lab Order" width={620}>
        <Field label="Priority" name="priority" value={labOrderForm.priority} onChange={handleLabOrder} options={PRIORITIES} />
        <div className="field">
          <label className="field-label">Lab Tests <span className="required">*</span></label>
          <select name="tests" value={labOrderForm.tests} onChange={handleLabOrder} className="field-control" multiple style={{ minHeight: 150 }}>
            {labTestOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </div>
        <Field label="Clinical Notes" name="clinical_notes" value={labOrderForm.clinical_notes} onChange={handleLabOrder} />
        <Alert type="info" message="Creating this lab order will add selected lab test charges to Billing." />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <Btn variant="secondary" onClick={() => setLabOrderModal(false)}>Cancel</Btn>
          <Btn onClick={saveLabOrderFromDoctorOrder} disabled={saving || labOrderForm.tests.length === 0}>Create Lab Order</Btn>
        </div>
      </Modal>

      <Modal open={referralModal} onClose={() => setReferralModal(false)} title="Refer Patient" width={720}>
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ fontWeight: 800 }}>{referralForm.patientName || "Patient"}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Referral Type" name="referral_type" value={referralForm.referral_type} onChange={handleReferral} options={[
              { value: "internal", label: "Internal" },
              { value: "external", label: "External" },
              { value: "emergency", label: "Emergency" },
            ]} />
            <Field label="Referred To Facility" name="referred_to_facility" value={referralForm.referred_to_facility} onChange={handleReferral} />
            <Field label="Referred To Department" name="referred_to_department" value={referralForm.referred_to_department} onChange={handleReferral} />
            <Field label="Referred To Doctor" name="referred_to_doctor" value={referralForm.referred_to_doctor} onChange={handleReferral} />
          </div>
          <Field label="Reason" name="reason" value={referralForm.reason} onChange={handleReferral} required />
          <Field label="Provisional Diagnosis" name="provisional_diagnosis" value={referralForm.provisional_diagnosis} onChange={handleReferral} />
          <Field label="Treatment Given" name="treatment_given" value={referralForm.treatment_given} onChange={handleReferral} />
          <Field label="Investigations Summary" name="investigations_summary" value={referralForm.investigations_summary} onChange={handleReferral} />
          <Field label="Current Condition" name="current_condition" value={referralForm.current_condition} onChange={handleReferral} />
          <Field label="Transport Advice" name="transport_advice" value={referralForm.transport_advice} onChange={handleReferral} />
          <Field label="Notes" name="notes" value={referralForm.notes} onChange={handleReferral} />
          <CheckField label="Mark this admission as transferred and release the bed" name="mark_admission_transferred" checked={referralForm.mark_admission_transferred} onChange={handleReferral} />
          <Alert type="info" message="Saving creates a printable referral letter. Transfer-out closes the active admission as transferred." />
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <Btn variant="secondary" onClick={() => setReferralModal(false)}>Cancel</Btn>
            <Btn onClick={saveReferral} disabled={saving || !referralForm.reason}>Save Referral</Btn>
          </div>
        </div>
      </Modal>

      <Modal open={dischargeModal} onClose={() => setDischargeModal(false)} title="Patient Discharge Flow" width={820}>
        <div style={{ display: "grid", gap: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: 800 }}>{dischargeForm.patientName || "Patient"}</div>
              <div style={{ color: "var(--text-mute)", fontSize: 12 }}>Complete all clearances before final discharge.</div>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
              <StepStatus label="Clinical" done={dischargeForm.clinical_cleared} />
              <StepStatus label="Nursing" done={dischargeForm.nursing_cleared} />
              <StepStatus label="Billing" done={dischargeForm.billing_cleared} />
              <StepStatus label="Pharmacy" done={dischargeForm.pharmacy_cleared} />
            </div>
          </div>

          <DischargeSection
            title="Clinical Clearance"
            cleared={dischargeForm.clinical_cleared}
            clearedBy={dischargeForm.clinical_cleared_by_name}
            onClear={() => saveDischargeStep("clinical")}
            saving={saving}
            actionLabel="Clear Clinical"
          >
            <Field label="Final Diagnosis" name="final_diagnosis" value={dischargeForm.final_diagnosis} onChange={handleDischarge} />
            <Field label="Discharge Summary" name="discharge_summary" value={dischargeForm.discharge_summary} onChange={handleDischarge} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Treatment Given" name="treatment_given" value={dischargeForm.treatment_given} onChange={handleDischarge} />
              <Field label="Condition at Discharge" name="condition_at_discharge" value={dischargeForm.condition_at_discharge} onChange={handleDischarge} />
            </div>
            <Field label="Discharge Medications" name="discharge_medications" value={dischargeForm.discharge_medications} onChange={handleDischarge} />
            <Field label="Follow-up Advice" name="follow_up_advice" value={dischargeForm.follow_up_advice} onChange={handleDischarge} />
            <Field label="Clinical Notes" name="clinical_notes" value={dischargeForm.clinical_notes} onChange={handleDischarge} />
          </DischargeSection>

          <DischargeSection
            title="Nursing Clearance"
            cleared={dischargeForm.nursing_cleared}
            clearedBy={dischargeForm.nursing_cleared_by_name}
            onClear={() => saveDischargeStep("nursing")}
            saving={saving}
            actionLabel="Clear Nursing"
          >
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
              <CheckField label="Vitals stable" name="vitals_stable" checked={dischargeForm.vitals_stable} onChange={handleDischarge} />
              <CheckField label="IV line removed" name="iv_removed" checked={dischargeForm.iv_removed} onChange={handleDischarge} />
              <CheckField label="Catheter removed" name="catheter_removed" checked={dischargeForm.catheter_removed} onChange={handleDischarge} />
              <CheckField label="Instructions explained" name="instructions_explained" checked={dischargeForm.instructions_explained} onChange={handleDischarge} />
            </div>
            <Field label="Nursing Notes" name="nursing_notes" value={dischargeForm.nursing_notes} onChange={handleDischarge} />
          </DischargeSection>

          <DischargeSection
            title="Billing Clearance"
            cleared={dischargeForm.billing_cleared}
            clearedBy={dischargeForm.billing_cleared_by_name}
            onClear={() => saveDischargeStep("billing")}
            saving={saving}
            actionLabel="Clear Billing"
          >
            <CheckField label="Add bed-day charges to the final bill" name="generate_bed_charges" checked={dischargeForm.generate_bed_charges} onChange={handleDischarge} />
            <Field label="Billing Notes" name="billing_notes" value={dischargeForm.billing_notes} onChange={handleDischarge} />
          </DischargeSection>

          <DischargeSection
            title="Pharmacy Clearance"
            cleared={dischargeForm.pharmacy_cleared}
            clearedBy={dischargeForm.pharmacy_cleared_by_name}
            onClear={() => saveDischargeStep("pharmacy")}
            saving={saving}
            actionLabel="Clear Pharmacy"
          >
            <Field label="Pharmacy Notes" name="pharmacy_notes" value={dischargeForm.pharmacy_notes} onChange={handleDischarge} />
          </DischargeSection>

          <Alert type="warning" message="Final discharge releases the active bed and removes this patient from active IPD admissions." />
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <Btn variant="secondary" onClick={() => setDischargeModal(false)}>Close</Btn>
            <Btn
              onClick={saveDischarge}
              disabled={saving || !dischargeForm.clinical_cleared || !dischargeForm.nursing_cleared || !dischargeForm.billing_cleared || !dischargeForm.pharmacy_cleared}
            >
              Final Discharge
            </Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function StepStatus({ label, done }) {
  return <Badge label={`${label}: ${done ? "Cleared" : "Pending"}`} color={done ? "var(--green)" : "var(--amber)"} />;
}

function CheckField({ label, name, checked, onChange }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-mute)", fontSize: 13 }}>
      <input type="checkbox" name={name} checked={!!checked} onChange={onChange} />
      {label}
    </label>
  );
}

function DischargeSection({ title, cleared, clearedBy, children, onClear, saving, actionLabel }) {
  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 8, padding: 14, background: "var(--card)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 12 }}>
        <div>
          <div style={{ fontWeight: 800 }}>{title}</div>
          <div style={{ color: "var(--text-dim)", fontSize: 11 }}>
            {cleared ? `Cleared${clearedBy ? ` by ${clearedBy}` : ""}` : "Pending"}
          </div>
        </div>
        <Btn size="sm" variant={cleared ? "secondary" : "primary"} onClick={onClear} disabled={saving}>
          {cleared ? "Update" : actionLabel}
        </Btn>
      </div>
      <div style={{ display: "grid", gap: 10 }}>{children}</div>
    </div>
  );
}

function Metric({ label, value, color = "var(--teal)" }) {
  return (
    <div>
      <div style={{ fontSize: 28, fontWeight: 800, color, fontFamily: "var(--font-display)" }}>{value}</div>
      <div style={{ color: "var(--text-mute)", fontSize: 12 }}>{label}</div>
    </div>
  );
}

function BedsTable({ beds }) {
  if (!beds.length) return <Empty icon="BD" message="No beds configured" />;
  return (
    <div className="table-shell" style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr>{["Ward", "Bed", "Room", "Status", "Rate"].map((head) => <Th key={head}>{head}</Th>)}</tr></thead>
        <tbody>
          {beds.map((bed) => (
            <tr key={bed.id} style={{ borderBottom: "1px solid var(--border-light)" }}>
              <Td>{bed.ward_name}</Td>
              <Td>{bed.bed_number}</Td>
              <Td>{bed.room_number || "-"}</Td>
              <Td><Badge label={bed.status} color={STATUS_COLOR[bed.status] || "var(--text-mute)"} /></Td>
              <Td>Rs. {bed.effective_daily_rate}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AdmissionsTable({ admissions, onDoctorRound, onNursingRound, onVitals, onOrder, onHistory, onReferral, onDischarge }) {
  if (!admissions.length) return <Empty icon="IPD" message="No active admissions" />;
  return (
    <div className="table-shell" style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr>{["Admission", "Patient", "Doctor", "Bed", "Latest Vitals", "Orders", "Actions"].map((head) => <Th key={head}>{head}</Th>)}</tr></thead>
        <tbody>
          {admissions.map((admission) => (
            <tr key={admission.id} style={{ borderBottom: "1px solid var(--border-light)" }}>
              <Td>{admission.admission_number}</Td>
              <Td>{admission.patient_detail?.full_name || "-"}</Td>
              <Td>{admission.admitting_doctor_name || "-"}</Td>
              <Td>{admission.active_bed?.bed_label || "Unassigned"}</Td>
              <Td><LatestVitals vital={admission.latest_vital} /></Td>
              <Td>{admission.active_order_count || 0} active</Td>
              <Td>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <Btn size="sm" variant="secondary" onClick={() => onDoctorRound(admission)}>Doctor</Btn>
                  <Btn size="sm" variant="ghost" onClick={() => onNursingRound(admission)}>Nursing</Btn>
                  <Btn size="sm" variant="ghost" onClick={() => onVitals(admission)}>Vitals</Btn>
                  <Btn size="sm" variant="ghost" onClick={() => onOrder(admission)}>Order</Btn>
                  <Btn size="sm" variant="ghost" onClick={() => onHistory(admission)}>History</Btn>
                  <Btn size="sm" variant="secondary" onClick={() => onReferral(admission)}>Refer</Btn>
                  <Btn size="sm" onClick={() => onDischarge(admission)}>Discharge</Btn>
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function WardsTable({ wards }) {
  if (!wards.length) return <Empty icon="WD" message="No wards configured" />;
  return (
    <div style={{ display: "grid", gap: 10 }}>
      {wards.map((ward) => (
        <Card key={ward.id}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
            <div>
              <div style={{ fontWeight: 700 }}>{ward.name}</div>
              <div style={{ color: "var(--text-mute)", fontSize: 12 }}>{ward.department || "No department"} / {ward.floor || "No floor"}</div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Badge label={`${ward.available_beds || 0} available`} color="var(--green)" />
              <Badge label={`${ward.occupied_beds || 0} occupied`} color="var(--red)" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function LatestVitals({ vital }) {
  if (!vital) return <span>-</span>;
  const bp = vital.blood_pressure || (vital.systolic_bp && vital.diastolic_bp ? `${vital.systolic_bp}/${vital.diastolic_bp}` : "-");
  return (
    <div>
      <div>{bp} / SpO2 {vital.oxygen_saturation || "-"}</div>
      <div style={{ color: "var(--text-dim)", fontSize: 11 }}>
        T {vital.temperature_celsius || "-"} / P {vital.pulse_rate || "-"}
      </div>
    </div>
  );
}

function RoundList({ title, items, kind }) {
  return (
    <div>
      <div style={{ fontWeight: 800, marginBottom: 10 }}>{title}</div>
      {!items.length ? <Empty icon={kind === "doctor" ? "DR" : "NS"} message={`No ${kind} rounds yet`} /> : (
        <div style={{ display: "grid", gap: 10 }}>
          {items.map((item) => (
            <Card key={`${kind}-${item.id}`}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div style={{ fontWeight: 700 }}>{kind === "doctor" ? item.doctor_name : item.nurse_name}</div>
                <div style={{ color: "var(--text-dim)", fontSize: 11 }}>{new Date(item.round_time).toLocaleString()}</div>
              </div>
              <div style={{ color: "var(--text-mute)", fontSize: 12, marginTop: 6 }}>
                {item.condition || item.diagnosis || item.notes}
              </div>
              {kind === "doctor" && item.invoice_number && (
                <div style={{ color: "var(--green)", fontSize: 12, marginTop: 6 }}>
                  {item.invoice_number} / Rs. {item.invoice_line_total}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function VitalList({ vitals }) {
  return (
    <div>
      <div style={{ fontWeight: 800, marginBottom: 10 }}>Vitals</div>
      {!vitals.length ? <Empty icon="VT" message="No vitals recorded" /> : (
        <div style={{ display: "grid", gap: 10 }}>
          {vitals.slice(0, 6).map((vital) => (
            <Card key={`vital-${vital.id}`}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div style={{ fontWeight: 700 }}>{vital.blood_pressure || "Vitals"}</div>
                <div style={{ color: "var(--text-dim)", fontSize: 11 }}>{new Date(vital.created_at).toLocaleString()}</div>
              </div>
              <div style={{ color: "var(--text-mute)", fontSize: 12, marginTop: 6 }}>
                T {vital.temperature_celsius || "-"} / P {vital.pulse_rate || "-"} / SpO2 {vital.oxygen_saturation || "-"} / Pain {vital.pain_score ?? "-"}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function OrderList({ orders, onComplete, onLabOrder }) {
  return (
    <div>
      <div style={{ fontWeight: 800, marginBottom: 10 }}>Doctor Orders</div>
      {!orders.length ? <Empty icon="OR" message="No orders yet" /> : (
        <div style={{ display: "grid", gap: 10 }}>
          {orders.map((order) => (
            <Card key={`order-${order.id}`}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div style={{ fontWeight: 700 }}>{order.title}</div>
                <Badge label={order.status} color={order.status === "active" ? "var(--blue)" : "var(--green)"} />
              </div>
              <div style={{ color: "var(--text-mute)", fontSize: 12, marginTop: 6 }}>
                {order.order_type} / {order.priority}: {order.instructions}
              </div>
              {order.status === "active" && (
                <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {order.order_type === "investigation" && !order.lab_order_id && (
                    <Btn size="sm" onClick={() => onLabOrder(order)}>Send to Lab</Btn>
                  )}
                  {order.lab_order_number && <Badge label={order.lab_order_number} color="var(--purple)" />}
                  <Btn size="sm" variant="secondary" onClick={() => onComplete(order)}>Complete</Btn>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function printReferral(referral) {
  const patient = referral.patient_detail || {};
  const rows = [
    ["Referral Type", referral.referral_type],
    ["Referred To", [referral.referred_to_facility, referral.referred_to_department, referral.referred_to_doctor].filter(Boolean).join(" / ")],
    ["Reason", referral.reason],
    ["Provisional Diagnosis", referral.provisional_diagnosis],
    ["Treatment Given", referral.treatment_given],
    ["Investigations Summary", referral.investigations_summary],
    ["Current Condition", referral.current_condition],
    ["Transport Advice", referral.transport_advice],
    ["Notes", referral.notes],
  ].filter(([, value]) => value);

  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) return;
  win.document.write(`
    <html>
      <head>
        <title>Referral Letter</title>
        <style>
          body { font-family: Arial, sans-serif; color: #111827; margin: 34px; }
          h1 { margin: 0 0 4px; font-size: 22px; }
          .muted { color: #6b7280; font-size: 12px; }
          .header { border-bottom: 2px solid #111827; padding-bottom: 14px; margin-bottom: 18px; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; margin-bottom: 18px; }
          .label { color: #6b7280; font-size: 11px; text-transform: uppercase; letter-spacing: .05em; }
          .value { font-size: 14px; margin-top: 2px; }
          .section { margin: 14px 0; }
          .section-title { font-weight: 700; margin-bottom: 4px; }
          .signature { margin-top: 50px; display: flex; justify-content: space-between; }
          button { margin-top: 22px; padding: 8px 14px; }
          @media print { button { display: none; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Butwal Hospital</h1>
          <div class="muted">Patient Referral Letter</div>
        </div>
        <div class="grid">
          <div><div class="label">Patient</div><div class="value">${patient.full_name || "-"}</div></div>
          <div><div class="label">Patient ID</div><div class="value">${patient.patient_id || "-"}</div></div>
          <div><div class="label">Age / Gender</div><div class="value">${patient.age || "-"} / ${patient.gender || "-"}</div></div>
          <div><div class="label">Phone</div><div class="value">${patient.phone || "-"}</div></div>
          <div><div class="label">Admission</div><div class="value">${referral.admission_number || "-"}</div></div>
          <div><div class="label">Date</div><div class="value">${new Date(referral.referred_at).toLocaleString()}</div></div>
        </div>
        ${rows.map(([label, value]) => `
          <div class="section">
            <div class="section-title">${label}</div>
            <div>${value}</div>
          </div>
        `).join("")}
        <div class="signature">
          <div>Prepared by: ${referral.created_by_name || "-"}</div>
          <div>Doctor Signature: __________________</div>
        </div>
        <button onclick="window.print()">Print</button>
      </body>
    </html>
  `);
  win.document.close();
}

function Th({ children }) {
  return <th style={{ padding: "12px 16px", textAlign: "left", color: "var(--text-dim)", fontSize: 11, textTransform: "uppercase", letterSpacing: ".07em" }}>{children}</th>;
}

function Td({ children }) {
  return <td style={{ padding: "12px 16px", color: "var(--text-mute)", fontSize: 13 }}>{children}</td>;
}

function formatError(err) {
  const data = err.response?.data;
  if (!data) return "Operation failed.";
  if (typeof data === "string") return data;
  if (Array.isArray(data)) return data.join(" ");
  return Object.values(data).flat().join(" ");
}
