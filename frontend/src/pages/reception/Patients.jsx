// LOCATION: HMS/frontend/src/pages/reception/Patients.jsx

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getPatients, registerPatient } from "../../api/patients";
import { Badge, Btn, Modal, Field, Spinner, Empty, Alert } from "../../components/ui";

const GENDER_OPTS   = [{value:"male",label:"Male"},{value:"female",label:"Female"},{value:"other",label:"Other"}];
const BLOOD_OPTS    = ["A+","A-","B+","B-","AB+","AB-","O+","O-","unknown"].map(v=>({value:v,label:v}));
const MARITAL_OPTS  = [{value:"single",label:"Single"},{value:"married",label:"Married"},{value:"divorced",label:"Divorced"},{value:"widowed",label:"Widowed"}];
const STATUS_COLOR  = { active:"var(--green)", inactive:"var(--text-mute)", deceased:"var(--red)" };

const EMPTY_FORM = {
  first_name:"", middle_name:"", last_name:"", date_of_birth:"", gender:"",
  blood_group:"unknown", marital_status:"", nationality:"Nepali", occupation:"",
  phone:"", alternate_phone:"", email:"",
  address_line1:"", address_line2:"", city:"", state:"", postal_code:"", country:"Nepal",
  ec_name:"", ec_relationship:"", ec_phone:"",
};

export default function Patients() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [statusF, setStatusF]   = useState("");
  const [showModal, setModal]   = useState(false);
  const [form, setForm]         = useState(EMPTY_FORM);
  const [step, setStep]         = useState(1);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");
  const [success, setSuccess]   = useState("");

  const load = () => {
    setLoading(true);
    getPatients({ search, status: statusF || undefined, ordering: "-created_at" })
      .then(r => setPatients(r.data.results || r.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [search, statusF]);

  const handle = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const submit = async () => {
    setSaving(true); setError("");
    try {
      const payload = { ...form };
      const ec = payload.ec_name ? [{ name: payload.ec_name, relationship: payload.ec_relationship, phone: payload.ec_phone, is_primary: true }] : [];
      delete payload.ec_name; delete payload.ec_relationship; delete payload.ec_phone;
      payload.emergency_contacts = ec;
      const { data } = await registerPatient(payload);
      setSuccess(`Patient ${data.patient_id} — ${data.name} registered successfully.`);
      setModal(false); setForm(EMPTY_FORM); setStep(1);
      load();
    } catch (err) {
      const d = err.response?.data;
      setError(typeof d === "object" ? Object.values(d).flat().join(" ") : "Registration failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-enter" style={{ padding: 28 }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "var(--font-display)" }}>Patients</div>
          <div style={{ fontSize: 13, color: "var(--text-mute)", marginTop: 2 }}>{patients.length} records</div>
        </div>
        <Btn onClick={() => { setModal(true); setStep(1); setError(""); }}>Register Patient</Btn>
      </div>

      {success && <Alert message={success} type="success" />}

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, ID, phone…"
          style={{ flex: 1, background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)",
            padding: "9px 14px", color: "var(--text)", outline: "none" }} />
        <select value={statusF} onChange={e => setStatusF(e.target.value)}
          style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)",
            padding: "9px 12px", color: "var(--text-mute)", outline: "none" }}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Table */}
      {loading ? <Spinner /> : patients.length === 0 ? <Empty icon="👥" message="No patients found" /> : (
        <div className="table-shell" style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Patient ID","Name","Age/Gender","Blood","Phone","City","Status","Doctor",""].map(h => (
                  <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 11,
                    color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: ".07em",
                    fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {patients.map(p => (
                <tr key={p.id} style={{ borderBottom: "1px solid var(--border-light)", cursor: "pointer" }}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--surface)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <td style={{ padding: "12px 16px" }}><span style={{ color: "var(--blue)", fontWeight: 600, fontSize: 13 }}>{p.patient_id}</span></td>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{p.full_name}</div>
                    {p.is_vip && <Badge label="VIP" color="var(--amber)" />}
                  </td>
                  <td style={{ padding: "12px 16px", color: "var(--text-mute)", fontSize: 13 }}>{p.age}y · {p.gender}</td>
                  <td style={{ padding: "12px 16px" }}><Badge label={p.blood_group} color="var(--red)" /></td>
                  <td style={{ padding: "12px 16px", color: "var(--text-mute)", fontSize: 13 }}>{p.phone}</td>
                  <td style={{ padding: "12px 16px", color: "var(--text-mute)", fontSize: 13 }}>{p.city}</td>
                  <td style={{ padding: "12px 16px" }}><Badge label={p.status} color={STATUS_COLOR[p.status]} /></td>
                  <td style={{ padding: "12px 16px", color: "var(--text-mute)", fontSize: 12 }}>{p.primary_doctor_name || "—"}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <button onClick={() => navigate(`/reception/patients/${p.id}`)}
                      style={{ background: "var(--teal-dim)", border: "none", borderRadius: 6, padding: "5px 12px",
                        color: "var(--teal)", fontSize: 12, cursor: "pointer" }}>View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Register Modal */}
      <Modal open={showModal} onClose={() => { setModal(false); setStep(1); }} title={`Register Patient - Step ${step}/3`} width={620}>
        {/* Step bar */}
        <div style={{ display: "flex", gap: 6, marginBottom: 24 }}>
          {[1,2,3].map(s => (
            <div key={s} style={{ height: 3, flex: 1, borderRadius: 4,
              background: s <= step ? "var(--teal)" : "var(--border)", transition: "background .3s" }} />
          ))}
        </div>
        {error && <Alert message={error} />}

        {step === 1 && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
            <Field label="First Name"    name="first_name"    value={form.first_name}    onChange={handle} required />
            <Field label="Middle Name"   name="middle_name"   value={form.middle_name}   onChange={handle} />
            <Field label="Last Name"     name="last_name"     value={form.last_name}     onChange={handle} required />
            <Field label="Date of Birth" name="date_of_birth" value={form.date_of_birth} onChange={handle} required type="date" />
            <Field label="Gender"        name="gender"        value={form.gender}        onChange={handle} required options={GENDER_OPTS} />
            <Field label="Blood Group"   name="blood_group"   value={form.blood_group}   onChange={handle} options={BLOOD_OPTS} />
            <Field label="Marital Status" name="marital_status" value={form.marital_status} onChange={handle} options={MARITAL_OPTS} />
            <Field label="Occupation"    name="occupation"    value={form.occupation}    onChange={handle} />
            <Field label="Nationality"   name="nationality"   value={form.nationality}   onChange={handle} />
          </div>
        )}
        {step === 2 && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
            <Field label="Phone"          name="phone"          value={form.phone}         onChange={handle} required />
            <Field label="Alternate Phone" name="alternate_phone" value={form.alternate_phone} onChange={handle} />
            <div style={{ gridColumn: "span 2" }}>
              <Field label="Email" name="email" value={form.email} onChange={handle} type="email" />
            </div>
            <div style={{ gridColumn: "span 2" }}>
              <Field label="Address Line 1" name="address_line1" value={form.address_line1} onChange={handle} required />
            </div>
            <Field label="City"        name="city"        value={form.city}        onChange={handle} required />
            <Field label="State"       name="state"       value={form.state}       onChange={handle} required />
            <Field label="Postal Code" name="postal_code" value={form.postal_code} onChange={handle} required />
            <Field label="Country"     name="country"     value={form.country}     onChange={handle} />
          </div>
        )}
        {step === 3 && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
            <Alert message="Optional — add primary emergency contact." type="info" />
            <div style={{ gridColumn: "span 2" }} />
            <Field label="Contact Name"  name="ec_name"         value={form.ec_name}         onChange={handle} />
            <Field label="Relationship"  name="ec_relationship" value={form.ec_relationship} onChange={handle} />
            <Field label="Phone"         name="ec_phone"        value={form.ec_phone}        onChange={handle} />
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24,
          paddingTop: 20, borderTop: "1px solid var(--border-light)" }}>
          <Btn variant="secondary" onClick={() => step > 1 ? setStep(s => s - 1) : setModal(false)}>
            {step === 1 ? "Cancel" : "Back"}
          </Btn>
          {step < 3
            ? <Btn onClick={() => setStep(s => s + 1)}>Next</Btn>
            : <Btn onClick={submit} disabled={saving}>{saving ? "Registering..." : "Register"}</Btn>
          }
        </div>
      </Modal>
    </div>
  );
}
