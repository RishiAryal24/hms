import { useEffect, useMemo, useState } from "react";
import { getDoctorProfiles } from "../../api/clinical";
import { assignBed, createBed, createDoctorRound, createWard, getActiveAdmissions, getBeds, getWards } from "../../api/inpatient";
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

export default function IPD() {
  const { user } = useAuthStore();
  const [tab, setTab] = useState("beds");
  const [wards, setWards] = useState([]);
  const [beds, setBeds] = useState([]);
  const [admissions, setAdmissions] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [wardModal, setWardModal] = useState(false);
  const [bedModal, setBedModal] = useState(false);
  const [assignModal, setAssignModal] = useState(false);
  const [roundModal, setRoundModal] = useState(false);
  const [wardForm, setWardForm] = useState(emptyWard);
  const [bedForm, setBedForm] = useState(emptyBed);
  const [assignForm, setAssignForm] = useState(emptyAssign);
  const [roundForm, setRoundForm] = useState(emptyDoctorRound);
  const [saving, setSaving] = useState(false);
  const canConfigureBeds = !!(user?.is_tenant_admin || user?.is_superuser);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [wardRes, bedRes, admissionRes, doctorRes] = await Promise.all([
        getWards(),
        getBeds(),
        getActiveAdmissions(),
        getDoctorProfiles({ is_available: true }),
      ]);
      setWards(wardRes.data.results || wardRes.data);
      setBeds(bedRes.data.results || bedRes.data);
      setAdmissions(admissionRes.data.results || admissionRes.data);
      setDoctors(doctorRes.data.results || doctorRes.data);
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

  const stats = useMemo(() => ({
    total: beds.length,
    available: beds.filter((bed) => bed.status === "available").length,
    occupied: beds.filter((bed) => bed.status === "occupied").length,
    activeAdmissions: admissions.length,
  }), [beds, admissions]);

  const handleWard = (event) => setWardForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const handleBed = (event) => setBedForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const handleAssign = (event) => setAssignForm((current) => ({ ...current, [event.target.name]: event.target.value }));
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
          {tab === "admissions" && <AdmissionsTable admissions={admissions} onDoctorRound={openRoundModal} />}
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

function AdmissionsTable({ admissions, onDoctorRound }) {
  if (!admissions.length) return <Empty icon="IPD" message="No active admissions" />;
  return (
    <div className="table-shell" style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr>{["Admission", "Patient", "Doctor", "Department", "Bed", "Since", "Actions"].map((head) => <Th key={head}>{head}</Th>)}</tr></thead>
        <tbody>
          {admissions.map((admission) => (
            <tr key={admission.id} style={{ borderBottom: "1px solid var(--border-light)" }}>
              <Td>{admission.admission_number}</Td>
              <Td>{admission.patient_detail?.full_name || "-"}</Td>
              <Td>{admission.admitting_doctor_name || "-"}</Td>
              <Td>{admission.department || "-"}</Td>
              <Td>{admission.active_bed?.bed_label || "Unassigned"}</Td>
              <Td>{new Date(admission.admission_date).toLocaleDateString()}</Td>
              <Td><Btn size="sm" variant="secondary" onClick={() => onDoctorRound(admission)}>Doctor Round</Btn></Td>
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
