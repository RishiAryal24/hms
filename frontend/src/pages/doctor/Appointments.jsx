// LOCATION: HMS/frontend/src/pages/doctor/Appointments.jsx
// ACTION:   CREATE this file inside HMS/frontend/src/pages/doctor/

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAppointments, getTodayAppointments, completeAppointment, cancelAppointment, bookAppointment, checkAvailability } from "../../api/appointments";
import { getPatients } from "../../api/patients";
import { Badge, Btn, Modal, Field, Spinner, Empty, Alert, Tabs } from "../../components/ui";
import useAuthStore from "../../store/authStore";

const STATUS_COLOR = { scheduled:"var(--blue)", completed:"var(--green)", cancelled:"var(--red)", no_show:"var(--amber)" };
const TYPE_OPTS = [{value:"walk_in",label:"Walk In"},{value:"new_patient",label:"New Patient"},{value:"follow_up",label:"Follow Up"},{value:"referral",label:"Referral"}];

export default function DoctorAppointments() {
  const { user }   = useAuthStore();
  const navigate   = useNavigate();
  const [tab, setTab]               = useState("today");
  const [todayAppts, setToday]      = useState([]);
  const [allAppts, setAll]          = useState([]);
  const [loading, setLoading]       = useState(true);
  const [dateFilter, setDate]       = useState("");

  // Complete modal
  const [completeId, setCompleteId] = useState(null);
  const [diagnosis, setDiagnosis]   = useState("");
  const [instructions, setInstr]    = useState("");
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState("");

  // Follow-up modal
  const [followUpAppt, setFollowUp] = useState(null);
  const [followForm, setFollowForm] = useState({ appointment_date:"", appointment_time:"", chief_complaint:"", consultation_fee:"" });
  const [patients, setPatients]     = useState([]);
  const [availability, setAvail]    = useState(null);

  const loadToday = () => {
    setLoading(true);
    getTodayAppointments({ doctor: user?.id, page_size: 100 })
      .then(r => setToday(r.data.results || r.data))
      .finally(() => setLoading(false));
  };

  const loadAll = () => {
    setLoading(true);
    getAppointments({ doctor: user?.id, appointment_date: dateFilter || undefined, ordering: "-appointment_date,token_number", page_size: 100 })
      .then(r => setAll(r.data.results || r.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadToday(); }, []);
  useEffect(() => { if (tab === "all") loadAll(); }, [tab, dateFilter]);

  // Check availability when booking follow-up
  useEffect(() => {
    if (followUpAppt && followForm.appointment_date) {
      checkAvailability({ doctor: user?.id, date: followForm.appointment_date })
        .then(r => setAvail(r.data)).catch(() => {});
    }
  }, [followForm.appointment_date]);

  const doComplete = async () => {
    setSaving(true); setError("");
    try {
      await completeAppointment(completeId, { diagnosis, follow_up_instructions: instructions });
      setCompleteId(null); setDiagnosis(""); setInstr("");
      loadToday(); if (tab === "all") loadAll();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to complete appointment.");
    } finally { setSaving(false); }
  };

  const doFollowUp = async () => {
    setSaving(true); setError("");
    try {
      await bookAppointment({
        patient:          followUpAppt.patient,
        doctor:           user?.id,
        appointment_date: followForm.appointment_date,
        appointment_time: followForm.appointment_time,
        appointment_type: "follow_up",
        chief_complaint:  followForm.chief_complaint,
        consultation_fee: followForm.consultation_fee,
        follow_up_of:     followUpAppt.id,
      });
      setFollowUp(null);
      setFollowForm({ appointment_date:"", appointment_time:"", chief_complaint:"", consultation_fee:"" });
      setAvail(null);
      loadToday(); loadAll();
    } catch (err) {
      const d = err.response?.data;
      setError(typeof d === "object" ? Object.values(d).flat().join(" ") : "Booking failed.");
    } finally { setSaving(false); }
  };

  const AppointmentRow = ({ a, onComplete, onFollowUp }) => (
    <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12,
      padding: "16px 20px", marginBottom: 10, display: "flex",
      justifyContent: "space-between", alignItems: "center" }}>
      <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--teal)18",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 16, fontWeight: 800, color: "var(--teal)" }}>
          {a.token_number}
        </div>
        <div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontWeight: 600, fontSize: 15, cursor: "pointer", color: "var(--text)" }}
              onClick={() => navigate(`/doctor/patients/${a.patient}`)}>
              {a.patient_name}
            </span>
            <Badge label={a.appointment_type.replace("_"," ")} color="var(--purple)" />
            {a.follow_up_of && <Badge label="Follow-up" color="var(--blue)" />}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-mute)", marginTop: 3 }}>
            {a.appointment_date} · {a.appointment_time}
            {a.chief_complaint && ` · "${a.chief_complaint}"`}
          </div>
          {a.diagnosis && (
            <div style={{ fontSize: 12, color: "var(--green)", marginTop: 2 }}>Dx: {a.diagnosis}</div>
          )}
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <Badge label={a.status.replace("_"," ")} color={STATUS_COLOR[a.status]} />
        {a.status === "scheduled" && (
          <>
            <button onClick={() => { setError(""); setCompleteId(a.id); }}
              style={{ background: "var(--green)18", border: "none", borderRadius: 6,
                padding: "5px 12px", color: "var(--green)", fontSize: 12, cursor: "pointer" }}>
              ✓ Complete
            </button>
          </>
        )}
        {a.status === "completed" && (
          <button onClick={() => { setError(""); setFollowUp(a); }}
            style={{ background: "var(--blue)18", border: "none", borderRadius: 6,
              padding: "5px 12px", color: "var(--blue)", fontSize: 12, cursor: "pointer" }}>
            + Follow Up
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="page-enter" style={{ padding: 28 }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "var(--font-display)" }}>Appointments</div>
      </div>

      <Tabs tabs={[{ key:"today", label:"Today" }, { key:"all", label:"All Appointments" }]}
        active={tab} onChange={(t) => { setTab(t); }} />

      {tab === "today" && (
        loading ? <Spinner /> : todayAppts.length === 0
          ? <Empty icon="📅" message="No appointments today" />
          : todayAppts.map(a => <AppointmentRow key={a.id} a={a} />)
      )}

      {tab === "all" && (
        <>
          <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
            <input type="date" value={dateFilter} onChange={e => setDate(e.target.value)}
              style={{ background: "var(--card)", border: "1px solid var(--border)",
                borderRadius: "var(--radius)", padding: "9px 12px", color: "var(--text)", outline: "none" }} />
            <button onClick={() => setDate("")}
              style={{ background: "none", border: "1px solid var(--border)", borderRadius: "var(--radius)",
                padding: "9px 14px", color: "var(--text-mute)", cursor: "pointer" }}>Clear</button>
          </div>
          {loading ? <Spinner /> : allAppts.length === 0
            ? <Empty icon="📅" message="No appointments found" />
            : allAppts.map(a => <AppointmentRow key={a.id} a={a} />)
          }
        </>
      )}

      {/* Complete Modal */}
      <Modal open={!!completeId} onClose={() => setCompleteId(null)} title="Complete Appointment" width={480}>
        {error && <Alert message={error} />}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 11, color: "var(--text-mute)", marginBottom: 5,
            textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 600 }}>Diagnosis</label>
          <textarea value={diagnosis} onChange={e => setDiagnosis(e.target.value)} rows={3}
            placeholder="Enter diagnosis…"
            style={{ width: "100%", background: "var(--surface)", border: "1px solid var(--border)",
              borderRadius: "var(--radius)", padding: "9px 12px", color: "var(--text)",
              outline: "none", resize: "vertical", boxSizing: "border-box" }} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 11, color: "var(--text-mute)", marginBottom: 5,
            textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 600 }}>Follow-up Instructions</label>
          <textarea value={instructions} onChange={e => setInstr(e.target.value)} rows={3}
            placeholder="Instructions for patient…"
            style={{ width: "100%", background: "var(--surface)", border: "1px solid var(--border)",
              borderRadius: "var(--radius)", padding: "9px 12px", color: "var(--text)",
              outline: "none", resize: "vertical", boxSizing: "border-box" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 16,
          borderTop: "1px solid var(--border-light)" }}>
          <Btn variant="secondary" onClick={() => setCompleteId(null)}>Cancel</Btn>
          <Btn onClick={doComplete} disabled={saving}>{saving ? "Saving…" : "✓ Mark Complete"}</Btn>
        </div>
      </Modal>

      {/* Follow-up Modal */}
      <Modal open={!!followUpAppt} onClose={() => { setFollowUp(null); setAvail(null); }} title="Book Follow-up Appointment" width={480}>
        {error && <Alert message={error} />}
        {followUpAppt && (
          <div style={{ background: "var(--surface)", borderRadius: 8, padding: "10px 14px",
            marginBottom: 16, fontSize: 13, color: "var(--text-mute)" }}>
            Follow-up for: <strong style={{ color: "var(--text)" }}>{followUpAppt.patient_name}</strong>
          </div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
          <Field label="Date" name="appointment_date" value={followForm.appointment_date}
            onChange={e => setFollowForm(p => ({ ...p, appointment_date: e.target.value }))} type="date" required />
          <Field label="Time" name="appointment_time" value={followForm.appointment_time}
            onChange={e => setFollowForm(p => ({ ...p, appointment_time: e.target.value }))} type="time" required />
          <div style={{ gridColumn: "span 2" }}>
            <Field label="Chief Complaint" name="chief_complaint" value={followForm.chief_complaint}
              onChange={e => setFollowForm(p => ({ ...p, chief_complaint: e.target.value }))} />
          </div>
          <Field label="Consultation Fee (Rs.)" name="consultation_fee" value={followForm.consultation_fee}
            onChange={e => setFollowForm(p => ({ ...p, consultation_fee: e.target.value }))} type="number" />
        </div>
        {availability && (
          <div style={{ background: availability.available ? "var(--green)15" : "var(--red)15",
            border: `1px solid ${availability.available ? "var(--green)" : "var(--red)"}33`,
            borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 8,
            color: availability.available ? "var(--green)" : "var(--red)" }}>
            {availability.available
              ? `✓ Available — ${availability.remaining_slots} slots left`
              : `✗ ${availability.reason}`}
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 16,
          borderTop: "1px solid var(--border-light)" }}>
          <Btn variant="secondary" onClick={() => { setFollowUp(null); setAvail(null); }}>Cancel</Btn>
          <Btn onClick={doFollowUp} disabled={saving || !followForm.appointment_date || !followForm.appointment_time}>
            {saving ? "Booking…" : "Book Follow-up"}
          </Btn>
        </div>
      </Modal>
    </div>
  );
}