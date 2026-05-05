// LOCATION: HMS/frontend/src/pages/doctor/PatientDetail.jsx
// ACTION:   CREATE this file inside HMS/frontend/src/pages/doctor/

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getPatient, getVitals, addVital, getAllergies, addAllergy,
  getMedications, addMedication, getNotes, addNote,
  getAdmissions, admitPatient,
} from "../../api/patients";
import { Badge, Btn, Modal, Field, Spinner, Empty, Alert, Card, Tabs, InfoRow } from "../../components/ui";

const SEVERITY_COLOR = { mild: "var(--green)", moderate: "var(--amber)", severe: "var(--red)", life_threatening: "var(--red)" };

// ─── Small form helpers ───────────────────────────────────────────────────────
const ALLERGY_TYPES  = [{value:"drug",label:"Drug"},{value:"food",label:"Food"},{value:"environmental",label:"Environmental"},{value:"other",label:"Other"}];
const SEVERITY_OPTS  = [{value:"mild",label:"Mild"},{value:"moderate",label:"Moderate"},{value:"severe",label:"Severe"},{value:"life_threatening",label:"Life Threatening"}];
const ROUTE_OPTS     = [{value:"oral",label:"Oral"},{value:"intravenous",label:"Intravenous"},{value:"intramuscular",label:"Intramuscular"},{value:"subcutaneous",label:"Subcutaneous"},{value:"topical",label:"Topical"},{value:"inhalation",label:"Inhalation"},{value:"other",label:"Other"}];
const NOTE_TYPES     = [{value:"clinical",label:"Clinical"},{value:"nursing",label:"Nursing"},{value:"administrative",label:"Administrative"},{value:"follow_up",label:"Follow Up"},{value:"discharge",label:"Discharge"}];
const ADMISSION_TYPES= [{value:"outpatient",label:"Outpatient (OPD)"},{value:"inpatient",label:"Inpatient (IPD)"},{value:"emergency",label:"Emergency"},{value:"day_care",label:"Day Care"}];

export default function PatientDetail() {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [patient,     setPatient]     = useState(null);
  const [vitals,      setVitals]      = useState([]);
  const [allergies,   setAllergies]   = useState([]);
  const [medications, setMeds]        = useState([]);
  const [notes,       setNotes]       = useState([]);
  const [admissions,  setAdmissions]  = useState([]);
  const [tab,         setTab]         = useState("overview");
  const [loading,     setLoading]     = useState(true);

  // Modal states
  const [vitalModal,   setVitalModal]   = useState(false);
  const [allergyModal, setAllergyModal] = useState(false);
  const [medModal,     setMedModal]     = useState(false);
  const [noteModal,    setNoteModal]    = useState(false);
  const [admitModal,   setAdmitModal]   = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState("");

  // Form states
  const [vitalForm,  setVitalForm]  = useState({ temperature_celsius:"", pulse_rate:"", respiratory_rate:"", systolic_bp:"", diastolic_bp:"", oxygen_saturation:"", blood_glucose:"", weight_kg:"", height_cm:"", pain_score:"", notes:"" });
  const [allergyForm,setAllergyForm]= useState({ allergy_type:"drug", allergen:"", reaction:"", severity:"mild", notes:"" });
  const [medForm,    setMedForm]    = useState({ medication_name:"", dosage:"", frequency:"", route:"oral", prescribed_by:"", start_date:"", end_date:"", is_ongoing:true, notes:"" });
  const [noteForm,   setNoteForm]   = useState({ note_type:"clinical", content:"", is_confidential:false });
  const [admitForm,  setAdmitForm]  = useState({ admission_type:"inpatient", admission_date:"", admission_time:"", chief_complaint:"", ward:"", bed_number:"", department:"" });

  const loadAll = () => {
    setLoading(true);
    Promise.all([
      getPatient(id),
      getVitals(id),
      getAllergies(id),
      getMedications(id),
      getNotes(id),
      getAdmissions(id),
    ]).then(([p, v, al, m, n, ad]) => {
      setPatient(p.data);
      setVitals(v.data.results      || v.data);
      setAllergies(al.data.results  || al.data);
      setMeds(m.data.results        || m.data);
      setNotes(n.data.results       || n.data);
      setAdmissions(ad.data.results || ad.data);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { loadAll(); }, [id]);

  const handle = (setter) => (e) => {
    const val = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setter(p => ({ ...p, [e.target.name]: val }));
  };

  const save = async (apiFn, data, closeModal) => {
    setSaving(true); setError("");
    try {
      await apiFn(id, data);
      closeModal(false);
      loadAll();
    } catch (err) {
      const d = err.response?.data;
      setError(typeof d === "object" ? Object.values(d).flat().join(" ") : "Operation failed.");
    } finally { setSaving(false); }
  };

  const admitPatientSubmit = async () => {
    setSaving(true); setError("");
    try {
      const payload = {
        ...admitForm,
        admission_date: `${admitForm.admission_date}T${admitForm.admission_time || "08:00"}:00`,
      };
      delete payload.admission_time;
      await admitPatient(id, payload);
      setAdmitModal(false);
      loadAll();
    } catch (err) {
      const d = err.response?.data;
      setError(typeof d === "object" ? Object.values(d).flat().join(" ") : "Admission failed.");
    } finally { setSaving(false); }
  };

  const TABS = [
    { key: "overview",    label: "Overview" },
    { key: "vitals",      label: `Vitals (${vitals.length})` },
    { key: "allergies",   label: `Allergies (${allergies.length})` },
    { key: "medications", label: `Medications (${medications.length})` },
    { key: "notes",       label: `Notes (${notes.length})` },
    { key: "admissions",  label: `Admissions (${admissions.length})` },
  ];

  if (loading) return <div style={{ padding: 40, textAlign: "center" }}><Spinner size={36} /></div>;
  if (!patient) return <div style={{ padding: 40, color: "var(--text-mute)" }}>Patient not found.</div>;

  const activeAdmission = admissions.find(a => a.status === "admitted");

  return (
    <div className="page-enter" style={{ padding: 28 }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <button onClick={() => navigate(-1)}
          style={{ background: "none", border: "none", color: "var(--text-mute)", fontSize: 13,
            cursor: "pointer", marginBottom: 12, padding: 0 }}>← Back</button>

        <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14,
          padding: "20px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
              <div style={{ width: 56, height: 56, borderRadius: 14, background: "var(--blue)18",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 22, fontWeight: 800, color: "var(--blue)" }}>
                {patient.first_name?.[0]}
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "var(--font-display)" }}>
                  {patient.first_name} {patient.middle_name} {patient.last_name}
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                  <Badge label={patient.patient_id}    color="var(--blue)" />
                  <Badge label={`${patient.age}y · ${patient.gender}`} color="var(--purple)" />
                  <Badge label={patient.blood_group}   color="var(--red)" />
                  <Badge label={patient.status}        color={patient.status === "active" ? "var(--green)" : "var(--text-mute)"} />
                  {patient.is_vip && <Badge label="VIP" color="var(--amber)" />}
                  {activeAdmission && <Badge label="Admitted" color="var(--teal)" />}
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
              <Btn size="sm" variant="ghost" onClick={() => { setError(""); setVitalModal(true); }}>+ Vitals</Btn>
              <Btn size="sm" variant="ghost" onClick={() => { setError(""); setAllergyModal(true); }}>+ Allergy</Btn>
              <Btn size="sm" variant="ghost" onClick={() => { setError(""); setMedModal(true); }}>+ Medication</Btn>
              <Btn size="sm" variant="ghost" onClick={() => { setError(""); setNoteModal(true); }}>+ Note</Btn>
              {!activeAdmission && (
                <Btn size="sm" onClick={() => { setError(""); setAdmitModal(true); }}>Admit Patient</Btn>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {/* ── Overview ── */}
      {tab === "overview" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Card title="Personal Info">
            <InfoRow label="Date of Birth"  value={patient.date_of_birth} />
            <InfoRow label="Marital Status" value={patient.marital_status} />
            <InfoRow label="Nationality"    value={patient.nationality} />
            <InfoRow label="Occupation"     value={patient.occupation} />
            <InfoRow label="Religion"       value={patient.religion} />
          </Card>
          <Card title="Contact">
            <InfoRow label="Phone"         value={patient.phone} />
            <InfoRow label="Alternate"     value={patient.alternate_phone} />
            <InfoRow label="Email"         value={patient.email} />
            <InfoRow label="Address"       value={`${patient.address_line1}, ${patient.city}`} />
            <InfoRow label="Primary Doctor" value={patient.primary_doctor_name} />
          </Card>
          {patient.emergency_contacts?.length > 0 && (
            <Card title="Emergency Contacts" style={{ gridColumn: "span 2" }}>
              <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                {patient.emergency_contacts.map(ec => (
                  <div key={ec.id} style={{ minWidth: 200 }}>
                    <InfoRow label="Name"         value={ec.name} />
                    <InfoRow label="Relationship" value={ec.relationship} />
                    <InfoRow label="Phone"        value={ec.phone} />
                    {ec.is_primary && <Badge label="Primary" color="var(--green)" />}
                  </div>
                ))}
              </div>
            </Card>
          )}
          {patient.medical_history && (
            <Card title="Medical History" style={{ gridColumn: "span 2" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                <InfoRow label="Chronic Conditions" value={patient.medical_history.chronic_conditions} />
                <InfoRow label="Past Surgeries"     value={patient.medical_history.past_surgeries} />
                <InfoRow label="Family History"     value={patient.medical_history.family_history} />
                <InfoRow label="Smoking"            value={patient.medical_history.smoking_status} />
                <InfoRow label="Alcohol"            value={patient.medical_history.alcohol_use} />
                <InfoRow label="Exercise"           value={patient.medical_history.exercise_frequency} />
                {patient.medical_history.height_cm && <InfoRow label="Height" value={`${patient.medical_history.height_cm} cm`} />}
                {patient.medical_history.weight_kg && <InfoRow label="Weight" value={`${patient.medical_history.weight_kg} kg`} />}
                {patient.medical_history.bmi       && <InfoRow label="BMI"    value={patient.medical_history.bmi} />}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ── Vitals ── */}
      {tab === "vitals" && (
        <div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
            <Btn size="sm" onClick={() => { setError(""); setVitalModal(true); }}>+ Record Vitals</Btn>
          </div>
          {vitals.length === 0 ? <Empty icon="💓" message="No vitals recorded yet" /> :
            vitals.map(v => (
              <div key={v.id} style={{ background: "var(--card)", border: "1px solid var(--border)",
                borderRadius: 12, padding: 20, marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: "var(--text-mute)", marginBottom: 14 }}>
                  Recorded: {new Date(v.created_at).toLocaleString()} {v.recorded_by_name && `· by ${v.recorded_by_name}`}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
                  {[
                    { label: "Temp",       value: v.temperature_celsius  ? `${v.temperature_celsius}°C` : null },
                    { label: "Pulse",      value: v.pulse_rate           ? `${v.pulse_rate} bpm`        : null },
                    { label: "BP",         value: v.blood_pressure },
                    { label: "SpO₂",       value: v.oxygen_saturation    ? `${v.oxygen_saturation}%`    : null },
                    { label: "Resp Rate",  value: v.respiratory_rate     ? `${v.respiratory_rate}/min`  : null },
                    { label: "Glucose",    value: v.blood_glucose        ? `${v.blood_glucose} mmol/L`  : null },
                    { label: "Weight",     value: v.weight_kg            ? `${v.weight_kg} kg`          : null },
                    { label: "Height",     value: v.height_cm            ? `${v.height_cm} cm`          : null },
                    { label: "BMI",        value: v.bmi },
                    { label: "Pain Score", value: v.pain_score != null   ? `${v.pain_score}/10`         : null },
                  ].filter(x => x.value).map(({ label, value }) => (
                    <div key={label} style={{ background: "var(--surface)", borderRadius: 10,
                      padding: "12px 14px", textAlign: "center" }}>
                      <div style={{ fontSize: 10, color: "var(--text-dim)", textTransform: "uppercase",
                        letterSpacing: ".08em", marginBottom: 4 }}>{label}</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: "var(--teal)" }}>{value}</div>
                    </div>
                  ))}
                </div>
                {v.notes && <div style={{ marginTop: 12, fontSize: 13, color: "var(--text-mute)" }}>Note: {v.notes}</div>}
              </div>
            ))
          }
        </div>
      )}

      {/* ── Allergies ── */}
      {tab === "allergies" && (
        <div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
            <Btn size="sm" onClick={() => { setError(""); setAllergyModal(true); }}>+ Add Allergy</Btn>
          </div>
          {allergies.length === 0 ? <Empty icon="⚠️" message="No allergies recorded" /> :
            allergies.map(a => (
              <div key={a.id} style={{ background: "var(--card)",
                border: `1px solid ${SEVERITY_COLOR[a.severity]}44`,
                borderRadius: 12, padding: "16px 20px", marginBottom: 10,
                display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>{a.allergen}</div>
                  <div style={{ fontSize: 13, color: "var(--text-mute)", marginTop: 4 }}>
                    Reaction: {a.reaction}
                  </div>
                  {a.notes && <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 2 }}>{a.notes}</div>}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <Badge label={a.allergy_type} color="var(--blue)" />
                  <Badge label={a.severity.replace("_"," ")} color={SEVERITY_COLOR[a.severity]} />
                </div>
              </div>
            ))
          }
        </div>
      )}

      {/* ── Medications ── */}
      {tab === "medications" && (
        <div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
            <Btn size="sm" onClick={() => { setError(""); setMedModal(true); }}>+ Prescribe</Btn>
          </div>
          {medications.length === 0 ? <Empty icon="💊" message="No medications prescribed" /> :
            medications.map(m => (
              <div key={m.id} style={{ background: "var(--card)", border: "1px solid var(--border)",
                borderRadius: 12, padding: "16px 20px", marginBottom: 10,
                display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>{m.medication_name}</div>
                  <div style={{ fontSize: 13, color: "var(--text-mute)", marginTop: 4 }}>
                    {m.dosage} · {m.frequency} · {m.route}
                  </div>
                  {m.prescribed_by && <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 2 }}>By: {m.prescribed_by}</div>}
                  {m.start_date && <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 2 }}>{m.start_date} {m.end_date && `→ ${m.end_date}`}</div>}
                  {m.notes && <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 2 }}>{m.notes}</div>}
                </div>
                <Badge label={m.is_ongoing ? "Ongoing" : "Completed"} color={m.is_ongoing ? "var(--green)" : "var(--text-mute)"} />
              </div>
            ))
          }
        </div>
      )}

      {/* ── Notes ── */}
      {tab === "notes" && (
        <div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
            <Btn size="sm" onClick={() => { setError(""); setNoteModal(true); }}>+ Add Note</Btn>
          </div>
          {notes.length === 0 ? <Empty icon="📝" message="No notes yet" /> :
            notes.map(n => (
              <div key={n.id} style={{ background: "var(--card)", border: `1px solid ${n.is_confidential ? "var(--amber)44" : "var(--border)"}`,
                borderRadius: 12, padding: "16px 20px", marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <Badge label={n.note_type.replace("_"," ")} color="var(--blue)" />
                    {n.is_confidential && <Badge label="Confidential" color="var(--amber)" />}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-dim)" }}>
                    {new Date(n.created_at).toLocaleString()} {n.created_by_name && `· ${n.created_by_name}`}
                  </div>
                </div>
                <div style={{ fontSize: 14, color: "var(--text)", lineHeight: 1.7 }}>{n.content}</div>
              </div>
            ))
          }
        </div>
      )}

      {/* ── Admissions ── */}
      {tab === "admissions" && (
        <div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
            {!activeAdmission && <Btn size="sm" onClick={() => { setError(""); setAdmitModal(true); }}>Admit Patient</Btn>}
          </div>
          {admissions.length === 0 ? <Empty icon="🏥" message="No admissions" /> :
            admissions.map(a => (
              <div key={a.id} style={{ background: "var(--card)", border: "1px solid var(--border)",
                borderRadius: 12, padding: "18px 20px", marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                  <div>
                    <span style={{ fontWeight: 700, fontSize: 15, color: "var(--blue)" }}>{a.admission_number}</span>
                    <span style={{ marginLeft: 10, fontSize: 13, color: "var(--text-mute)" }}>{a.admission_type?.replace("_"," ")}</span>
                  </div>
                  <Badge label={a.status} color={a.status === "admitted" ? "var(--green)" : "var(--text-mute)"} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                  <InfoRow label="Admitted"       value={new Date(a.admission_date).toLocaleString()} />
                  <InfoRow label="Discharged"     value={a.discharge_date ? new Date(a.discharge_date).toLocaleString() : "—"} />
                  <InfoRow label="Length of Stay" value={a.length_of_stay != null ? `${a.length_of_stay} days` : "—"} />
                  <InfoRow label="Ward"           value={a.ward} />
                  <InfoRow label="Bed"            value={a.bed_number} />
                  <InfoRow label="Department"     value={a.department} />
                  <InfoRow label="Chief Complaint"       value={a.chief_complaint} />
                  <InfoRow label="Diagnosis on Admission"value={a.diagnosis_on_admission} />
                  <InfoRow label="Discharge Summary"     value={a.discharge_summary} />
                </div>
              </div>
            ))
          }
        </div>
      )}

      {/* ── Vital Signs Modal ── */}
      <Modal open={vitalModal} onClose={() => setVitalModal(false)} title="Record Vital Signs" width={580}>
        {error && <Alert message={error} />}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
          <Field label="Temperature (°C)"   name="temperature_celsius" value={vitalForm.temperature_celsius} onChange={handle(setVitalForm)} type="number" placeholder="e.g. 37.2" />
          <Field label="Pulse Rate (bpm)"   name="pulse_rate"          value={vitalForm.pulse_rate}          onChange={handle(setVitalForm)} type="number" />
          <Field label="Systolic BP"        name="systolic_bp"         value={vitalForm.systolic_bp}         onChange={handle(setVitalForm)} type="number" />
          <Field label="Diastolic BP"       name="diastolic_bp"        value={vitalForm.diastolic_bp}        onChange={handle(setVitalForm)} type="number" />
          <Field label="SpO₂ (%)"           name="oxygen_saturation"   value={vitalForm.oxygen_saturation}   onChange={handle(setVitalForm)} type="number" />
          <Field label="Respiratory Rate"   name="respiratory_rate"    value={vitalForm.respiratory_rate}    onChange={handle(setVitalForm)} type="number" />
          <Field label="Blood Glucose"      name="blood_glucose"       value={vitalForm.blood_glucose}       onChange={handle(setVitalForm)} type="number" />
          <Field label="Weight (kg)"        name="weight_kg"           value={vitalForm.weight_kg}           onChange={handle(setVitalForm)} type="number" />
          <Field label="Height (cm)"        name="height_cm"           value={vitalForm.height_cm}           onChange={handle(setVitalForm)} type="number" />
          <Field label="Pain Score (0-10)"  name="pain_score"          value={vitalForm.pain_score}          onChange={handle(setVitalForm)} type="number" />
          <div style={{ gridColumn: "span 2" }}>
            <Field label="Notes" name="notes" value={vitalForm.notes} onChange={handle(setVitalForm)} />
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 16, borderTop: "1px solid var(--border-light)" }}>
          <Btn variant="secondary" onClick={() => setVitalModal(false)}>Cancel</Btn>
          <Btn onClick={() => save(addVital, vitalForm, setVitalModal)} disabled={saving}>{saving ? "Saving…" : "Save Vitals"}</Btn>
        </div>
      </Modal>

      {/* ── Allergy Modal ── */}
      <Modal open={allergyModal} onClose={() => setAllergyModal(false)} title="Add Allergy" width={480}>
        {error && <Alert message={error} />}
        <Field label="Allergy Type" name="allergy_type" value={allergyForm.allergy_type} onChange={handle(setAllergyForm)} options={ALLERGY_TYPES} required />
        <Field label="Allergen"     name="allergen"     value={allergyForm.allergen}     onChange={handle(setAllergyForm)} required placeholder="e.g. Penicillin" />
        <Field label="Reaction"     name="reaction"     value={allergyForm.reaction}     onChange={handle(setAllergyForm)} required placeholder="e.g. Anaphylaxis" />
        <Field label="Severity"     name="severity"     value={allergyForm.severity}     onChange={handle(setAllergyForm)} options={SEVERITY_OPTS} required />
        <Field label="Notes"        name="notes"        value={allergyForm.notes}        onChange={handle(setAllergyForm)} />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 16, borderTop: "1px solid var(--border-light)" }}>
          <Btn variant="secondary" onClick={() => setAllergyModal(false)}>Cancel</Btn>
          <Btn onClick={() => save(addAllergy, allergyForm, setAllergyModal)} disabled={saving}>{saving ? "Saving…" : "Add Allergy"}</Btn>
        </div>
      </Modal>

      {/* ── Medication Modal ── */}
      <Modal open={medModal} onClose={() => setMedModal(false)} title="Prescribe Medication" width={520}>
        {error && <Alert message={error} />}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
          <div style={{ gridColumn: "span 2" }}>
            <Field label="Medication Name" name="medication_name" value={medForm.medication_name} onChange={handle(setMedForm)} required />
          </div>
          <Field label="Dosage"     name="dosage"     value={medForm.dosage}     onChange={handle(setMedForm)} required placeholder="e.g. 500mg" />
          <Field label="Frequency"  name="frequency"  value={medForm.frequency}  onChange={handle(setMedForm)} required placeholder="e.g. Twice daily" />
          <Field label="Route"      name="route"      value={medForm.route}      onChange={handle(setMedForm)} options={ROUTE_OPTS} />
          <Field label="Prescribed By" name="prescribed_by" value={medForm.prescribed_by} onChange={handle(setMedForm)} />
          <Field label="Start Date" name="start_date" value={medForm.start_date} onChange={handle(setMedForm)} type="date" />
          <Field label="End Date"   name="end_date"   value={medForm.end_date}   onChange={handle(setMedForm)} type="date" />
          <div style={{ gridColumn: "span 2" }}>
            <Field label="Notes" name="notes" value={medForm.notes} onChange={handle(setMedForm)} />
          </div>
          <div style={{ gridColumn: "span 2", display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <input type="checkbox" name="is_ongoing" checked={medForm.is_ongoing} onChange={handle(setMedForm)} id="ongoing" />
            <label htmlFor="ongoing" style={{ fontSize: 13, color: "var(--text-mute)" }}>Ongoing medication</label>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 16, borderTop: "1px solid var(--border-light)" }}>
          <Btn variant="secondary" onClick={() => setMedModal(false)}>Cancel</Btn>
          <Btn onClick={() => save(addMedication, medForm, setMedModal)} disabled={saving}>{saving ? "Saving…" : "Prescribe"}</Btn>
        </div>
      </Modal>

      {/* ── Note Modal ── */}
      <Modal open={noteModal} onClose={() => setNoteModal(false)} title="Add Clinical Note" width={500}>
        {error && <Alert message={error} />}
        <Field label="Note Type" name="note_type" value={noteForm.note_type} onChange={handle(setNoteForm)} options={NOTE_TYPES} />
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 11, color: "var(--text-mute)", marginBottom: 5,
            textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 600 }}>
            Content <span style={{ color: "var(--red)" }}>*</span>
          </label>
          <textarea name="content" value={noteForm.content}
            onChange={e => setNoteForm(p => ({ ...p, content: e.target.value }))}
            rows={5} placeholder="Write your clinical note here…"
            style={{ width: "100%", background: "var(--surface)", border: "1px solid var(--border)",
              borderRadius: "var(--radius)", padding: "9px 12px", color: "var(--text)",
              outline: "none", resize: "vertical", boxSizing: "border-box", fontSize: 14 }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <input type="checkbox" name="is_confidential" checked={noteForm.is_confidential}
            onChange={e => setNoteForm(p => ({ ...p, is_confidential: e.target.checked }))} id="conf" />
          <label htmlFor="conf" style={{ fontSize: 13, color: "var(--text-mute)" }}>
            Confidential (visible to doctors only)
          </label>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 16, borderTop: "1px solid var(--border-light)" }}>
          <Btn variant="secondary" onClick={() => setNoteModal(false)}>Cancel</Btn>
          <Btn onClick={() => save(addNote, noteForm, setNoteModal)} disabled={saving || !noteForm.content}>
            {saving ? "Saving…" : "Save Note"}
          </Btn>
        </div>
      </Modal>

      {/* ── Admit Modal ── */}
      <Modal open={admitModal} onClose={() => setAdmitModal(false)} title="Admit Patient" width={520}>
        {error && <Alert message={error} />}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
          <Field label="Admission Type" name="admission_type" value={admitForm.admission_type} onChange={handle(setAdmitForm)} options={ADMISSION_TYPES} required />
          <Field label="Department"     name="department"     value={admitForm.department}     onChange={handle(setAdmitForm)} />
          <Field label="Admission Date" name="admission_date" value={admitForm.admission_date} onChange={handle(setAdmitForm)} type="date" required />
          <Field label="Admission Time" name="admission_time" value={admitForm.admission_time} onChange={handle(setAdmitForm)} type="time" />
          <Field label="Ward"           name="ward"           value={admitForm.ward}           onChange={handle(setAdmitForm)} />
          <Field label="Bed Number"     name="bed_number"     value={admitForm.bed_number}     onChange={handle(setAdmitForm)} />
          <div style={{ gridColumn: "span 2" }}>
            <Field label="Chief Complaint" name="chief_complaint" value={admitForm.chief_complaint} onChange={handle(setAdmitForm)} required />
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 16, borderTop: "1px solid var(--border-light)" }}>
          <Btn variant="secondary" onClick={() => setAdmitModal(false)}>Cancel</Btn>
          <Btn onClick={admitPatientSubmit} disabled={saving}>{saving ? "Admitting…" : "Admit Patient"}</Btn>
        </div>
      </Modal>

    </div>
  );
}
