import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getPatients, registerPatient } from "../../api/patients";
import { Alert, Badge, Btn, Empty, Field, Modal, Spinner } from "../../components/ui";

const GENDER_OPTS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];
const BLOOD_OPTS = ["A+","A-","B+","B-","AB+","AB-","O+","O-","unknown"].map((value) => ({ value, label: value }));
const MARITAL_OPTS = ["single", "married", "divorced", "widowed", "separated"].map((value) => ({ value, label: value }));
const STATUS_COLOR = { active:"var(--green)", inactive:"var(--text-mute)", deceased:"var(--red)", transferred:"var(--amber)" };

const EMPTY_FORM = {
  first_name: "", middle_name: "", last_name: "", date_of_birth: "", gender: "",
  blood_group: "unknown", marital_status: "", nationality: "Nepali", occupation: "",
  phone: "", alternate_phone: "", email: "",
  address_line1: "", address_line2: "", city: "", state: "", postal_code: "", country: "Nepal",
  ec_name: "", ec_relationship: "", ec_phone: "",
  ins_provider_name: "", ins_policy_number: "", ins_policy_holder_name: "", ins_relationship: "Self",
};

export default function Patients() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [duplicates, setDuplicates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);
  const [search, setSearch] = useState("");
  const [statusF, setStatusF] = useState("");
  const [showModal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [lastRegistered, setLastRegistered] = useState(null);

  const load = () => {
    setLoading(true);
    getPatients({ search, status: statusF || undefined, ordering: "-created_at" })
      .then((response) => setPatients(response.data.results || response.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [search, statusF]);

  useEffect(() => {
    if (!showModal) return;
    const query = form.phone || [form.first_name, form.last_name].filter(Boolean).join(" ");
    if (!query || query.length < 4) {
      setDuplicates([]);
      return;
    }
    const timer = setTimeout(() => {
      setCheckingDuplicate(true);
      getPatients({ search: query, page_size: 5 })
        .then((response) => setDuplicates(response.data.results || response.data))
        .catch(() => setDuplicates([]))
        .finally(() => setCheckingDuplicate(false));
    }, 350);
    return () => clearTimeout(timer);
  }, [showModal, form.phone, form.first_name, form.last_name]);

  const fullName = useMemo(
    () => [form.first_name, form.middle_name, form.last_name].filter(Boolean).join(" "),
    [form.first_name, form.middle_name, form.last_name],
  );

  const handle = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  const openRegister = () => {
    setForm(EMPTY_FORM);
    setStep(1);
    setError("");
    setDuplicates([]);
    setModal(true);
  };

  const submit = async () => {
    setSaving(true);
    setError("");
    try {
      const payload = { ...form };
      const emergency = payload.ec_name || payload.ec_phone ? [{
        name: payload.ec_name,
        relationship: payload.ec_relationship,
        phone: payload.ec_phone,
        is_primary: true,
      }] : [];
      const insurance = payload.ins_provider_name && payload.ins_policy_number ? [{
        provider_name: payload.ins_provider_name,
        policy_number: payload.ins_policy_number,
        policy_holder_name: payload.ins_policy_holder_name || fullName,
        relationship_to_patient: payload.ins_relationship || "Self",
        is_primary: true,
        is_active: true,
      }] : [];

      [
        "ec_name", "ec_relationship", "ec_phone",
        "ins_provider_name", "ins_policy_number", "ins_policy_holder_name", "ins_relationship",
      ].forEach((key) => delete payload[key]);
      payload.emergency_contacts = emergency;
      payload.insurance_records = insurance;

      const { data } = await registerPatient(payload);
      setLastRegistered(data.data);
      setSuccess(`Patient ${data.patient_id} - ${data.name} registered successfully.`);
      setModal(false);
      setForm(EMPTY_FORM);
      setStep(1);
      load();
    } catch (err) {
      setError(formatError(err, "Registration failed."));
    } finally {
      setSaving(false);
    }
  };

  const canNext = () => {
    if (step === 1) return form.first_name && form.last_name && form.date_of_birth && form.gender;
    if (step === 2) return form.phone && form.address_line1 && form.city && form.state && form.postal_code;
    return true;
  };

  return (
    <div className="page-enter" style={{ padding: 28 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "var(--font-display)" }}>Patient Registration</div>
          <div style={{ fontSize: 13, color: "var(--text-mute)", marginTop: 2 }}>{patients.length} patient records</div>
        </div>
        <Btn onClick={openRegister}>Register Patient</Btn>
      </div>

      {success && (
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
          <Alert message={success} type="success" />
          {lastRegistered && <Btn variant="secondary" onClick={() => printRegistration(lastRegistered)}>Print Slip</Btn>}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "minmax(220px, 1fr) 170px", gap: 10, marginBottom: 20 }}>
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name, patient ID, phone, or email"
          style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "10px 14px", color: "var(--card-ink)", outline: "none" }} />
        <select value={statusF} onChange={(event) => setStatusF(event.target.value)}
          style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "10px 12px", color: "var(--text-mute)", outline: "none" }}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="deceased">Deceased</option>
        </select>
      </div>

      {loading ? <Spinner /> : patients.length === 0 ? <Empty icon="PT" message="No patients found" /> : (
        <PatientsTable patients={patients} navigate={navigate} />
      )}

      <Modal open={showModal} onClose={() => setModal(false)} title={`Register Patient - Step ${step}/4`} width={700}>
        <div style={{ display: "flex", gap: 6, marginBottom: 22 }}>
          {[1,2,3,4].map((item) => (
            <div key={item} style={{ height: 4, flex: 1, borderRadius: 4, background: item <= step ? "var(--teal)" : "var(--border-light)" }} />
          ))}
        </div>
        {error && <Alert message={error} />}
        {checkingDuplicate && <Alert type="info" message="Checking for possible duplicate patients..." />}
        {!!duplicates.length && (
          <Alert
            type="warning"
            message={`Possible duplicate found: ${duplicates.slice(0, 2).map((patient) => `${patient.patient_id} ${patient.full_name}`).join(", ")}`}
          />
        )}

        {step === 1 && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
            <Field label="First Name" name="first_name" value={form.first_name} onChange={handle} required />
            <Field label="Middle Name" name="middle_name" value={form.middle_name} onChange={handle} />
            <Field label="Last Name" name="last_name" value={form.last_name} onChange={handle} required />
            <Field label="Date of Birth" name="date_of_birth" value={form.date_of_birth} onChange={handle} required type="date" />
            <Field label="Gender" name="gender" value={form.gender} onChange={handle} required options={GENDER_OPTS} />
            <Field label="Blood Group" name="blood_group" value={form.blood_group} onChange={handle} options={BLOOD_OPTS} />
            <Field label="Marital Status" name="marital_status" value={form.marital_status} onChange={handle} options={MARITAL_OPTS} />
            <Field label="Occupation" name="occupation" value={form.occupation} onChange={handle} />
            <Field label="Nationality" name="nationality" value={form.nationality} onChange={handle} />
          </div>
        )}

        {step === 2 && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
            <Field label="Phone" name="phone" value={form.phone} onChange={handle} required />
            <Field label="Alternate Phone" name="alternate_phone" value={form.alternate_phone} onChange={handle} />
            <div style={{ gridColumn: "span 2" }}><Field label="Email" name="email" value={form.email} onChange={handle} type="email" /></div>
            <div style={{ gridColumn: "span 2" }}><Field label="Address Line 1" name="address_line1" value={form.address_line1} onChange={handle} required /></div>
            <div style={{ gridColumn: "span 2" }}><Field label="Address Line 2" name="address_line2" value={form.address_line2} onChange={handle} /></div>
            <Field label="City" name="city" value={form.city} onChange={handle} required />
            <Field label="State" name="state" value={form.state} onChange={handle} required />
            <Field label="Postal Code" name="postal_code" value={form.postal_code} onChange={handle} required />
            <Field label="Country" name="country" value={form.country} onChange={handle} />
          </div>
        )}

        {step === 3 && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
            <div style={{ gridColumn: "span 2" }}><Alert message="Emergency contact is optional but recommended." type="info" /></div>
            <Field label="Contact Name" name="ec_name" value={form.ec_name} onChange={handle} />
            <Field label="Relationship" name="ec_relationship" value={form.ec_relationship} onChange={handle} />
            <Field label="Phone" name="ec_phone" value={form.ec_phone} onChange={handle} />
          </div>
        )}

        {step === 4 && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
              <Field label="Insurance Provider" name="ins_provider_name" value={form.ins_provider_name} onChange={handle} />
              <Field label="Policy Number" name="ins_policy_number" value={form.ins_policy_number} onChange={handle} />
              <Field label="Policy Holder" name="ins_policy_holder_name" value={form.ins_policy_holder_name} onChange={handle} placeholder={fullName || "Self"} />
              <Field label="Relationship" name="ins_relationship" value={form.ins_relationship} onChange={handle} />
            </div>
            <Review form={form} fullName={fullName} />
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24, paddingTop: 20, borderTop: "1px solid var(--border-light)" }}>
          <Btn variant="secondary" onClick={() => step > 1 ? setStep((current) => current - 1) : setModal(false)}>
            {step === 1 ? "Cancel" : "Back"}
          </Btn>
          {step < 4
            ? <Btn onClick={() => setStep((current) => current + 1)} disabled={!canNext()}>Next</Btn>
            : <Btn onClick={submit} disabled={saving || !canNext()}>{saving ? "Registering..." : "Register Patient"}</Btn>
          }
        </div>
      </Modal>
    </div>
  );
}

function PatientsTable({ patients, navigate }) {
  return (
    <div className="table-shell" style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr>{["Patient ID","Name","Age/Gender","Blood","Phone","City","Status","Doctor","Actions"].map((head) => <Th key={head}>{head}</Th>)}</tr></thead>
        <tbody>
          {patients.map((patient) => (
            <tr key={patient.id} style={{ borderBottom: "1px solid var(--border-light)" }}>
              <Td><span style={{ color: "var(--blue)", fontWeight: 800 }}>{patient.patient_id}</span></Td>
              <Td><div style={{ fontWeight: 700, color: "var(--card-ink)" }}>{patient.full_name}</div>{patient.is_vip && <Badge label="VIP" color="var(--amber)" />}</Td>
              <Td>{patient.age}y / {patient.gender}</Td>
              <Td><Badge label={patient.blood_group} color="var(--red)" /></Td>
              <Td>{patient.phone}</Td>
              <Td>{patient.city}</Td>
              <Td><Badge label={patient.status} color={STATUS_COLOR[patient.status] || "var(--text-mute)"} /></Td>
              <Td>{patient.primary_doctor_name || "-"}</Td>
              <Td><Btn size="sm" variant="secondary" onClick={() => navigate(`/reception/patients/${patient.id}`)}>View</Btn></Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Review({ form, fullName }) {
  return (
    <div style={{ border: "1px solid var(--border-light)", borderRadius: 8, padding: 14, marginTop: 8, background: "#f8fbfd" }}>
      <div style={{ fontWeight: 800, marginBottom: 8 }}>Registration Review</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, color: "var(--text-mute)", fontSize: 13 }}>
        <div><strong>Name:</strong> {fullName || "-"}</div>
        <div><strong>DOB:</strong> {form.date_of_birth || "-"}</div>
        <div><strong>Phone:</strong> {form.phone || "-"}</div>
        <div><strong>Address:</strong> {[form.city, form.state].filter(Boolean).join(", ") || "-"}</div>
        <div><strong>Emergency:</strong> {form.ec_name || "-"}</div>
        <div><strong>Insurance:</strong> {form.ins_provider_name || "-"}</div>
      </div>
    </div>
  );
}

function printRegistration(patient) {
  const popup = window.open("", "_blank", "width=820,height=640");
  popup.document.write(`
    <html>
      <head>
        <title>${patient.patient_id} Registration</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 28px; color: #111827; }
          h1 { margin: 0 0 4px; font-size: 24px; }
          .muted { color: #6b7280; font-size: 13px; }
          .top { display: flex; justify-content: space-between; gap: 24px; margin-bottom: 24px; }
          .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px 24px; margin-top: 18px; }
          .card { border: 1px solid #d1d5db; border-radius: 8px; padding: 18px; margin-top: 24px; }
          .id { font-size: 26px; font-weight: 800; letter-spacing: .04em; }
          @media print { button { display: none; } }
        </style>
      </head>
      <body>
        <button onclick="window.print()">Print</button>
        <div class="top">
          <div><h1>Butwal Hospital</h1><div class="muted">Patient Registration Slip</div></div>
          <div><div class="id">${patient.patient_id}</div><div class="muted">${new Date().toLocaleString()}</div></div>
        </div>
        <div class="card">
          <h2>${patient.full_name || patient.first_name + " " + patient.last_name}</h2>
          <div class="grid">
            <div><strong>Age/Gender:</strong> ${patient.age || "-"} / ${patient.gender || "-"}</div>
            <div><strong>DOB:</strong> ${patient.date_of_birth || "-"}</div>
            <div><strong>Phone:</strong> ${patient.phone || "-"}</div>
            <div><strong>Blood Group:</strong> ${patient.blood_group || "-"}</div>
            <div><strong>Address:</strong> ${[patient.address_line1, patient.city, patient.state].filter(Boolean).join(", ") || "-"}</div>
            <div><strong>Registered By:</strong> ${patient.registered_by_name || "-"}</div>
          </div>
        </div>
      </body>
    </html>
  `);
  popup.document.close();
}

function Th({ children }) {
  return <th style={{ padding: "12px 16px", textAlign: "left", color: "var(--text-dim)", fontSize: 11, textTransform: "uppercase", letterSpacing: ".07em" }}>{children}</th>;
}

function Td({ children }) {
  return <td style={{ padding: "12px 16px", color: "var(--text-mute)", fontSize: 13 }}>{children}</td>;
}

function formatError(err, fallback) {
  const data = err.response?.data;
  if (!data) return fallback;
  if (typeof data === "string") return data;
  if (Array.isArray(data)) return data.join(" ");
  return Object.values(data).flat().join(" ");
}
