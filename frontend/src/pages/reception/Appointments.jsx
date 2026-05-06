// LOCATION: HMS/frontend/src/pages/reception/Appointments.jsx

import { useEffect, useState } from "react";
import { getAppointments, bookAppointment, cancelAppointment, checkAvailability } from "../../api/appointments";
import { getPatients } from "../../api/patients";
import { getDoctorProfiles } from "../../api/clinical";
import { Badge, Btn, Modal, Field, Spinner, Empty, Alert, Card } from "../../components/ui";

const STATUS_COLOR = { scheduled:"var(--blue)", completed:"var(--green)", cancelled:"var(--red)", no_show:"var(--amber)" };
const TYPE_OPTS = [{value:"walk_in",label:"Walk In"},{value:"new_patient",label:"New Patient"},{value:"follow_up",label:"Follow Up"},{value:"referral",label:"Referral"}];

const EMPTY_FORM = { patient:"", doctor:"", appointment_date:"", appointment_time:"", appointment_type:"walk_in", department:"", chief_complaint:"", consultation_fee:"" };

export default function Appointments() {
  const [appointments, setAppts]  = useState([]);
  const [patients, setPatients]   = useState([]);
  const [doctors, setDoctors]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showModal, setModal]     = useState(false);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");
  const [success, setSuccess]     = useState("");
  const [availability, setAvail]  = useState(null);
  const [dateFilter, setDate]     = useState("");
  const [statusFilter, setStatus] = useState("");
  const [cancelId, setCancelId]   = useState(null);
  const [cancelReason, setReason] = useState("");

  const load = () => {
    setLoading(true);
    getAppointments({ appointment_date: dateFilter || undefined, status: statusFilter || undefined, ordering: "appointment_date,token_number" })
      .then(r => setAppts(r.data.results || r.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [dateFilter, statusFilter]);

  useEffect(() => {
    getPatients({ page_size: 200 }).then(r => setPatients(r.data.results || r.data));
    getDoctorProfiles({ is_available: true }).then(r => setDoctors(r.data.results || r.data));
  }, []);

  const handle = (e) => {
    const next = { ...form, [e.target.name]: e.target.value };
    if (e.target.name === "doctor") {
      const profile = doctors.find(d => String(d.user) === String(e.target.value));
      if (profile) {
        next.consultation_fee = profile.consultation_fee || "";
        next.department = profile.department || next.department;
      }
    }
    setForm(next);
    if ((e.target.name === "doctor" || e.target.name === "appointment_date") ) {
      setAvail(null);
    }
  };

  const checkAvail = async () => {
    if (!form.doctor || !form.appointment_date) return;
    try {
      const { data } = await checkAvailability({ doctor: form.doctor, date: form.appointment_date });
      setAvail(data);
    } catch {
      setAvail(null);
    }
  };

  useEffect(() => { if (form.doctor && form.appointment_date) checkAvail(); }, [form.doctor, form.appointment_date]);

  const submit = async () => {
    setSaving(true); setError("");
    try {
      const { data } = await bookAppointment(form);
      setSuccess(`Appointment booked — Token #${data.token_number}`);
      setModal(false); setForm(EMPTY_FORM); setAvail(null);
      load();
    } catch (err) {
      const d = err.response?.data;
      setError(typeof d === "object" ? Object.values(d).flat().join(" ") : "Booking failed.");
    } finally {
      setSaving(false);
    }
  };

  const doCancel = async () => {
    try {
      await cancelAppointment(cancelId, { reason: cancelReason });
      setCancelId(null); setReason("");
      load();
    } catch {
      setError("Unable to cancel appointment.");
    }
  };

  const patientOpts = patients.map(p => ({ value: p.id, label: `${p.full_name} (${p.patient_id})` }));
  const doctorOpts  = doctors.map(d => ({
    value: d.user,
    label: `${d.full_name || d.username} - ${d.specialty}${d.consultation_fee ? ` / Rs. ${d.consultation_fee}` : ""}`,
  }));

  return (
    <div className="page-enter" style={{ padding: 28 }}>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "var(--font-display)" }}>Appointments</div>
          <div style={{ fontSize: 13, color: "var(--text-mute)", marginTop: 2 }}>{appointments.length} records</div>
        </div>
        <Btn onClick={() => { setModal(true); setError(""); }}>Book Appointment</Btn>
      </div>

      {success && <Alert message={success} type="success" />}

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <input type="date" value={dateFilter} onChange={e => setDate(e.target.value)}
          style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)",
            padding: "9px 12px", color: "var(--text)", outline: "none" }} />
        <select value={statusFilter} onChange={e => setStatus(e.target.value)}
          style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)",
            padding: "9px 12px", color: "var(--text-mute)", outline: "none" }}>
          <option value="">All Status</option>
          <option value="scheduled">Scheduled</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
          <option value="no_show">No Show</option>
        </select>
        <button onClick={() => { setDate(""); setStatus(""); }}
          style={{ background: "none", border: "1px solid var(--border)", borderRadius: "var(--radius)",
            padding: "9px 14px", color: "var(--text-mute)", cursor: "pointer" }}>Clear</button>
      </div>

      {/* Table */}
      {loading ? <Spinner /> : appointments.length === 0 ? <Empty icon="📅" message="No appointments found" /> : (
        <div className="table-shell" style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Token","Patient","Doctor","Date","Time","Type","Status","Fee",""].map(h => (
                  <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 11,
                    color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: ".07em", fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {appointments.map(a => (
                <tr key={a.id} style={{ borderBottom: "1px solid var(--border-light)" }}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--surface)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ background: "var(--teal)18", color: "var(--teal)", fontWeight: 700,
                      padding: "3px 10px", borderRadius: 6, fontSize: 13 }}>#{a.token_number}</span>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{a.patient_name}</div>
                    <div style={{ fontSize: 11, color: "var(--text-mute)" }}>{a.patient_id}</div>
                  </td>
                  <td style={{ padding: "12px 16px", color: "var(--text-mute)", fontSize: 13 }}>{a.doctor_name}</td>
                  <td style={{ padding: "12px 16px", color: "var(--text-mute)", fontSize: 13 }}>{a.appointment_date}</td>
                  <td style={{ padding: "12px 16px", color: "var(--text-mute)", fontSize: 13 }}>{a.appointment_time}</td>
                  <td style={{ padding: "12px 16px" }}><Badge label={a.appointment_type.replace("_"," ")} color="var(--purple)" /></td>
                  <td style={{ padding: "12px 16px" }}><Badge label={a.status.replace("_"," ")} color={STATUS_COLOR[a.status]} /></td>
                  <td style={{ padding: "12px 16px", color: "var(--text-mute)", fontSize: 13 }}>
                    {a.consultation_fee ? `Rs. ${a.consultation_fee}` : "—"}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    {a.status === "scheduled" && (
                      <button onClick={() => setCancelId(a.id)}
                        style={{ background: "var(--red)18", border: "none", borderRadius: 6, padding: "5px 10px",
                          color: "var(--red)", fontSize: 12, cursor: "pointer" }}>Cancel</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Book Modal */}
      <Modal open={showModal} onClose={() => setModal(false)} title="Book Appointment" width={560}>
        {error && <Alert message={error} />}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
          <div style={{ gridColumn: "span 2" }}>
            <Field label="Patient" name="patient" value={form.patient} onChange={handle} required options={patientOpts} />
          </div>
          <div style={{ gridColumn: "span 2" }}>
            <Field label="Doctor"  name="doctor"  value={form.doctor}  onChange={handle} required options={doctorOpts} />
          </div>
          <Field label="Date" name="appointment_date" value={form.appointment_date} onChange={handle} required type="date" />
          <Field label="Time" name="appointment_time" value={form.appointment_time} onChange={handle} required type="time" />
          <Field label="Type" name="appointment_type" value={form.appointment_type} onChange={handle} options={TYPE_OPTS} />
          <Field label="Department" name="department" value={form.department} onChange={handle} />
          <div style={{ gridColumn: "span 2" }}>
            <Field label="Chief Complaint" name="chief_complaint" value={form.chief_complaint} onChange={handle} />
          </div>
          <Field label="Consultation Fee (Rs.)" name="consultation_fee" value={form.consultation_fee} onChange={handle} type="number" />
        </div>

        {/* Availability indicator */}
        {availability && (
          <div style={{ background: availability.available ? "var(--green)15" : "var(--red)15",
            border: `1px solid ${availability.available ? "var(--green)" : "var(--red)"}33`,
            borderRadius: 8, padding: "10px 14px", fontSize: 13,
            color: availability.available ? "var(--green)" : "var(--red)", marginBottom: 8 }}>
            {availability.available
              ? `✓ Available — ${availability.remaining_slots} slots left on ${availability.day}`
              : `✗ ${availability.reason}`}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 16, borderTop: "1px solid var(--border-light)" }}>
          <Btn variant="secondary" onClick={() => setModal(false)}>Cancel</Btn>
          <Btn onClick={submit} disabled={saving || availability?.available === false}>
            {saving ? "Booking..." : "Book Appointment"}
          </Btn>
        </div>
      </Modal>

      {/* Cancel Modal */}
      <Modal open={!!cancelId} onClose={() => setCancelId(null)} title="Cancel Appointment" width={400}>
        <div style={{ marginBottom: 16, color: "var(--text-mute)" }}>Please provide a reason for cancellation.</div>
        <textarea value={cancelReason} onChange={e => setReason(e.target.value)} rows={3}
          placeholder="Reason (optional)"
          style={{ width: "100%", background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: "var(--radius)", padding: "9px 12px", color: "var(--text)",
            outline: "none", resize: "vertical", boxSizing: "border-box" }} />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
          <Btn variant="secondary" onClick={() => setCancelId(null)}>Back</Btn>
          <Btn variant="danger" onClick={doCancel}>Confirm Cancel</Btn>
        </div>
      </Modal>
    </div>
  );
}
