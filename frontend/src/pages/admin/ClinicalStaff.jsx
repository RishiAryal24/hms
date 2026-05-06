import { useEffect, useMemo, useState } from "react";
import {
  createDoctorProfile,
  createNurseProfile,
  getClinicalOptions,
  getDoctorProfiles,
  getNurseProfiles,
} from "../../api/clinical";
import { Alert, Badge, Btn, Card, Empty, Field, Modal, Spinner, Tabs } from "../../components/ui";

const emptyDoctor = {
  user: "",
  specialty: "",
  department: "",
  license_number: "",
  qualification: "",
  years_experience: "0",
  consultation_fee: "0",
  room_number: "",
  signature_text: "",
  notes: "",
  is_available: true,
};

const emptyNurse = {
  user: "",
  registration_number: "",
  ward: "",
  department: "",
  qualification: "",
  shift: "rotating",
  notes: "",
  is_charge_nurse: false,
  is_available: true,
};

const SHIFT_OPTIONS = [
  { value: "morning", label: "Morning" },
  { value: "evening", label: "Evening" },
  { value: "night", label: "Night" },
  { value: "rotating", label: "Rotating" },
];

export default function ClinicalStaff() {
  const [tab, setTab] = useState("doctors");
  const [doctors, setDoctors] = useState([]);
  const [nurses, setNurses] = useState([]);
  const [options, setOptions] = useState({ doctors: [], nurses: [] });
  const [doctorModal, setDoctorModal] = useState(false);
  const [nurseModal, setNurseModal] = useState(false);
  const [doctorForm, setDoctorForm] = useState(emptyDoctor);
  const [nurseForm, setNurseForm] = useState(emptyNurse);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [doctorRes, nurseRes, optionRes] = await Promise.all([
        getDoctorProfiles(),
        getNurseProfiles(),
        getClinicalOptions(),
      ]);
      setDoctors(doctorRes.data.results || doctorRes.data);
      setNurses(nurseRes.data.results || nurseRes.data);
      setOptions(optionRes.data || { doctors: [], nurses: [] });
    } catch {
      setError("Unable to load clinical staff profiles.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const doctorUserIds = useMemo(() => new Set(doctors.map((doctor) => doctor.user)), [doctors]);
  const nurseUserIds = useMemo(() => new Set(nurses.map((nurse) => nurse.user)), [nurses]);

  const doctorOptions = (options.doctors || [])
    .filter((user) => !doctorUserIds.has(user.id))
    .map(toUserOption);

  const nurseOptions = (options.nurses || [])
    .filter((user) => !nurseUserIds.has(user.id))
    .map(toUserOption);

  const handleDoctor = (event) => {
    const { name, value, type, checked } = event.target;
    setDoctorForm((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
  };

  const handleNurse = (event) => {
    const { name, value, type, checked } = event.target;
    setNurseForm((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
  };

  const saveDoctor = async () => {
    setSaving(true);
    setError("");
    try {
      await createDoctorProfile(doctorForm);
      setDoctorModal(false);
      setDoctorForm(emptyDoctor);
      setSuccess("Doctor profile created.");
      load();
    } catch (err) {
      setError(formatError(err));
    } finally {
      setSaving(false);
    }
  };

  const saveNurse = async () => {
    setSaving(true);
    setError("");
    try {
      await createNurseProfile(nurseForm);
      setNurseModal(false);
      setNurseForm(emptyNurse);
      setSuccess("Nurse profile created.");
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
          <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "var(--font-display)" }}>Clinical Staff</div>
          <div style={{ fontSize: 13, color: "var(--text-mute)", marginTop: 2 }}>Doctor and nurse professional profiles</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn variant="secondary" onClick={() => setNurseModal(true)}>Add Nurse Profile</Btn>
          <Btn onClick={() => setDoctorModal(true)}>Add Doctor Profile</Btn>
        </div>
      </div>

      {error && <Alert message={error} />}
      {success && <Alert message={success} type="success" />}

      <div className="dashboard-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        <Card><Metric label="Doctor Profiles" value={doctors.length} color="var(--blue)" /></Card>
        <Card><Metric label="Available Doctors" value={doctors.filter((doctor) => doctor.is_available).length} color="var(--green)" /></Card>
        <Card><Metric label="Nurse Profiles" value={nurses.length} color="var(--purple)" /></Card>
        <Card><Metric label="Charge Nurses" value={nurses.filter((nurse) => nurse.is_charge_nurse).length} color="var(--amber)" /></Card>
      </div>

      <Tabs tabs={[{ key: "doctors", label: "Doctors" }, { key: "nurses", label: "Nurses" }]} active={tab} onChange={setTab} />

      {loading ? <Spinner /> : tab === "doctors" ? (
        <DoctorsTable doctors={doctors} />
      ) : (
        <NursesTable nurses={nurses} />
      )}

      <Modal open={doctorModal} onClose={() => setDoctorModal(false)} title="Add Doctor Profile" width={600}>
        <Field label="Doctor User" name="user" value={doctorForm.user} onChange={handleDoctor} options={doctorOptions} required />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Specialty" name="specialty" value={doctorForm.specialty} onChange={handleDoctor} required />
          <Field label="Department" name="department" value={doctorForm.department} onChange={handleDoctor} />
          <Field label="License Number" name="license_number" value={doctorForm.license_number} onChange={handleDoctor} required />
          <Field label="Qualification" name="qualification" value={doctorForm.qualification} onChange={handleDoctor} />
          <Field label="Experience Years" name="years_experience" type="number" value={doctorForm.years_experience} onChange={handleDoctor} />
          <Field label="Consultation Fee" name="consultation_fee" type="number" value={doctorForm.consultation_fee} onChange={handleDoctor} />
          <Field label="Room Number" name="room_number" value={doctorForm.room_number} onChange={handleDoctor} />
          <Field label="Signature Text" name="signature_text" value={doctorForm.signature_text} onChange={handleDoctor} />
        </div>
        <Field label="Notes" name="notes" value={doctorForm.notes} onChange={handleDoctor} />
        <Checkbox label="Available for appointment selection" name="is_available" checked={doctorForm.is_available} onChange={handleDoctor} />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <Btn variant="secondary" onClick={() => setDoctorModal(false)}>Cancel</Btn>
          <Btn onClick={saveDoctor} disabled={saving || !doctorForm.user || !doctorForm.specialty || !doctorForm.license_number}>Save</Btn>
        </div>
      </Modal>

      <Modal open={nurseModal} onClose={() => setNurseModal(false)} title="Add Nurse Profile" width={600}>
        <Field label="Nurse User" name="user" value={nurseForm.user} onChange={handleNurse} options={nurseOptions} required />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Registration Number" name="registration_number" value={nurseForm.registration_number} onChange={handleNurse} required />
          <Field label="Ward" name="ward" value={nurseForm.ward} onChange={handleNurse} />
          <Field label="Department" name="department" value={nurseForm.department} onChange={handleNurse} />
          <Field label="Qualification" name="qualification" value={nurseForm.qualification} onChange={handleNurse} />
          <Field label="Shift" name="shift" value={nurseForm.shift} onChange={handleNurse} options={SHIFT_OPTIONS} />
        </div>
        <Field label="Notes" name="notes" value={nurseForm.notes} onChange={handleNurse} />
        <Checkbox label="Charge nurse" name="is_charge_nurse" checked={nurseForm.is_charge_nurse} onChange={handleNurse} />
        <Checkbox label="Available for ward duty" name="is_available" checked={nurseForm.is_available} onChange={handleNurse} />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <Btn variant="secondary" onClick={() => setNurseModal(false)}>Cancel</Btn>
          <Btn onClick={saveNurse} disabled={saving || !nurseForm.user || !nurseForm.registration_number}>Save</Btn>
        </div>
      </Modal>
    </div>
  );
}

function DoctorsTable({ doctors }) {
  if (!doctors.length) return <Empty icon="DR" message="No doctor profiles yet" />;
  return (
    <div className="table-shell" style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr>{["Doctor", "Specialty", "Department", "License", "Fee", "Status"].map((head) => <Th key={head}>{head}</Th>)}</tr></thead>
        <tbody>
          {doctors.map((doctor) => (
            <tr key={doctor.id} style={{ borderBottom: "1px solid var(--border-light)" }}>
              <Td>
                <div style={{ fontWeight: 700, color: "var(--text)" }}>{doctor.full_name || doctor.username}</div>
                <div style={{ fontSize: 11, color: "var(--text-dim)" }}>{doctor.qualification || doctor.room_number || "-"}</div>
              </Td>
              <Td>{doctor.specialty}</Td>
              <Td>{doctor.department || "-"}</Td>
              <Td>{doctor.license_number}</Td>
              <Td>Rs. {doctor.consultation_fee}</Td>
              <Td><Badge label={doctor.is_available ? "available" : "unavailable"} color={doctor.is_available ? "var(--green)" : "var(--text-mute)"} /></Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function NursesTable({ nurses }) {
  if (!nurses.length) return <Empty icon="NS" message="No nurse profiles yet" />;
  return (
    <div className="table-shell" style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr>{["Nurse", "Ward", "Department", "Registration", "Shift", "Status"].map((head) => <Th key={head}>{head}</Th>)}</tr></thead>
        <tbody>
          {nurses.map((nurse) => (
            <tr key={nurse.id} style={{ borderBottom: "1px solid var(--border-light)" }}>
              <Td>
                <div style={{ fontWeight: 700, color: "var(--text)" }}>{nurse.full_name || nurse.username}</div>
                <div style={{ fontSize: 11, color: "var(--text-dim)" }}>{nurse.qualification || "-"}</div>
              </Td>
              <Td>{nurse.ward || "-"}</Td>
              <Td>{nurse.department || "-"}</Td>
              <Td>{nurse.registration_number}</Td>
              <Td>{nurse.shift}</Td>
              <Td>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <Badge label={nurse.is_available ? "available" : "unavailable"} color={nurse.is_available ? "var(--green)" : "var(--text-mute)"} />
                  {nurse.is_charge_nurse && <Badge label="charge" color="var(--amber)" />}
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Checkbox({ label, name, checked, onChange }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 8, margin: "8px 0 16px", color: "var(--text-mute)", fontSize: 13 }}>
      <input type="checkbox" name={name} checked={checked} onChange={onChange} />
      {label}
    </label>
  );
}

function Metric({ label, value, color = "var(--teal)" }) {
  return (
    <div>
      <div style={{ fontSize: 22, fontWeight: 800, color, fontFamily: "var(--font-display)" }}>{value}</div>
      <div style={{ color: "var(--text-mute)", fontSize: 12 }}>{label}</div>
    </div>
  );
}

function Th({ children }) {
  return <th style={{ padding: "12px 16px", textAlign: "left", color: "var(--text-dim)", fontSize: 11, textTransform: "uppercase", letterSpacing: ".07em" }}>{children}</th>;
}

function Td({ children }) {
  return <td style={{ padding: "12px 16px", color: "var(--text-mute)", fontSize: 13 }}>{children}</td>;
}

function toUserOption(user) {
  return {
    value: user.id,
    label: `${user.full_name || user.username} (${user.email || user.username})`,
  };
}

function formatError(err) {
  const data = err.response?.data;
  if (!data) return "Operation failed.";
  if (typeof data === "string") return data;
  if (Array.isArray(data)) return data.join(" ");
  return Object.values(data).flat().join(" ");
}
