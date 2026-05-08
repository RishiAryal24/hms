import { useCallback, useEffect, useMemo, useState } from "react";
import { getPatients } from "../../api/patients";
import {
  cancelTheaterBooking,
  completeTheaterBooking,
  createOperatingRoom,
  createProcedure,
  createTheaterBooking,
  getTheaterBookings,
  getTheaterOptions,
  getTheaterSummary,
  startTheaterBooking,
} from "../../api/theater";
import { Alert, Badge, Btn, Card, Empty, Field, Modal, Spinner, Tabs } from "../../components/ui";
import useAuthStore from "../../store/authStore";

const PROCEDURE_TYPES = [
  "minor", "major", "emergency", "elective", "other",
].map((value) => ({ value, label: value }));

const PRIORITIES = [
  { value: "routine", label: "Routine" },
  { value: "urgent", label: "Urgent" },
  { value: "emergency", label: "Emergency" },
];

const ANESTHESIA_TYPES = [
  "none", "local", "spinal", "general", "sedation", "other",
].map((value) => ({ value, label: value }));

const STATUS_COLOR = {
  scheduled: "var(--blue)",
  in_progress: "var(--amber)",
  completed: "var(--green)",
  cancelled: "var(--red)",
};

const PRIORITY_COLOR = {
  routine: "var(--blue)",
  urgent: "var(--amber)",
  emergency: "var(--red)",
};

const emptyProcedure = { code: "", name: "", procedure_type: "minor", default_price: "0", estimated_minutes: "60", description: "" };
const emptyRoom = { name: "", location: "", notes: "" };
const emptyBooking = {
  patient: "",
  admission: "",
  procedure: "",
  operating_room: "",
  scheduled_at: "",
  priority: "routine",
  surgeon: "",
  assistant: "",
  nurse: "",
  anesthesia_type: "none",
  indication: "",
};
const emptyComplete = {
  id: "",
  bookingNumber: "",
  procedureName: "",
  charge_amount: "",
  procedure_notes: "",
  outcome: "",
  complications: "",
  anesthesia_type: "none",
  surgeon: "",
  assistant: "",
  nurse: "",
};

export default function Theater() {
  const { user } = useAuthStore();
  const [tab, setTab] = useState("bookings");
  const [summary, setSummary] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [patients, setPatients] = useState([]);
  const [procedures, setProcedures] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [surgeons, setSurgeons] = useState([]);
  const [nurses, setNurses] = useState([]);
  const [bookingModal, setBookingModal] = useState(false);
  const [procedureModal, setProcedureModal] = useState(false);
  const [roomModal, setRoomModal] = useState(false);
  const [completeModal, setCompleteModal] = useState(false);
  const [bookingForm, setBookingForm] = useState(emptyBooking);
  const [procedureForm, setProcedureForm] = useState(emptyProcedure);
  const [roomForm, setRoomForm] = useState(emptyRoom);
  const [completeForm, setCompleteForm] = useState(emptyComplete);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const canConfigure = !!(user?.is_tenant_admin || user?.is_superuser);
  const canManage = ["doctor", "nurse", "receptionist"].includes(user?.role) || canConfigure;

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [summaryRes, optionsRes, bookingRes, patientRes] = await Promise.all([
        getTheaterSummary(),
        getTheaterOptions(),
        getTheaterBookings(),
        getPatients({ page_size: 200 }),
      ]);
      setSummary(summaryRes.data);
      setProcedures(optionsRes.data.procedures || []);
      setRooms(optionsRes.data.rooms || []);
      setSurgeons(optionsRes.data.surgeons || []);
      setNurses(optionsRes.data.nurses || []);
      setBookings(bookingRes.data.results || bookingRes.data);
      setPatients(patientRes.data.results || patientRes.data);
    } catch {
      setError("Unable to load theater data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const patientOptions = patients.map((patient) => ({
    value: patient.id,
    label: `${patient.full_name} (${patient.patient_id})`,
  }));
  const procedureOptions = procedures.map((procedure) => ({
    value: procedure.id,
    label: `${procedure.code} - ${procedure.name} / Rs. ${procedure.default_price}`,
  }));
  const roomOptions = rooms.map((room) => ({ value: room.id, label: room.name }));
  const surgeonOptions = surgeons.map((staff) => ({ value: staff.id, label: staff.full_name || staff.username }));
  const nurseOptions = nurses.map((staff) => ({ value: staff.id, label: staff.full_name || staff.username }));

  const selectedProcedure = useMemo(
    () => procedures.find((procedure) => String(procedure.id) === String(bookingForm.procedure)),
    [procedures, bookingForm.procedure],
  );

  const handleProcedure = (event) => setProcedureForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const handleRoom = (event) => setRoomForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const handleBooking = (event) => setBookingForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const handleComplete = (event) => setCompleteForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  const saveProcedure = async () => {
    setSaving(true);
    setError("");
    try {
      await createProcedure(procedureForm);
      setProcedureModal(false);
      setProcedureForm(emptyProcedure);
      setSuccess("Procedure created.");
      load();
    } catch (err) {
      setError(formatError(err));
    } finally {
      setSaving(false);
    }
  };

  const saveRoom = async () => {
    setSaving(true);
    setError("");
    try {
      await createOperatingRoom(roomForm);
      setRoomModal(false);
      setRoomForm(emptyRoom);
      setSuccess("Operating room created.");
      load();
    } catch (err) {
      setError(formatError(err));
    } finally {
      setSaving(false);
    }
  };

  const saveBooking = async () => {
    setSaving(true);
    setError("");
    try {
      await createTheaterBooking({
        ...bookingForm,
        admission: bookingForm.admission || null,
        operating_room: bookingForm.operating_room || null,
        surgeon: bookingForm.surgeon || null,
        assistant: bookingForm.assistant || null,
        nurse: bookingForm.nurse || null,
      });
      setBookingModal(false);
      setBookingForm(emptyBooking);
      setSuccess("OT booking created.");
      load();
    } catch (err) {
      setError(formatError(err));
    } finally {
      setSaving(false);
    }
  };

  const startBooking = async (booking) => {
    setError("");
    try {
      await startTheaterBooking(booking.id);
      setSuccess("Procedure marked in progress.");
      load();
    } catch (err) {
      setError(formatError(err));
    }
  };

  const openComplete = (booking) => {
    setCompleteForm({
      ...emptyComplete,
      id: booking.id,
      bookingNumber: booking.booking_number,
      procedureName: booking.procedure_detail?.name || "Procedure",
      charge_amount: booking.procedure_detail?.default_price || "",
      anesthesia_type: booking.anesthesia_type || "none",
      surgeon: booking.surgeon || "",
      assistant: booking.assistant || "",
      nurse: booking.nurse || "",
    });
    setCompleteModal(true);
  };

  const saveComplete = async () => {
    setSaving(true);
    setError("");
    try {
      const { data } = await completeTheaterBooking(completeForm.id, {
        procedure_notes: completeForm.procedure_notes,
        outcome: completeForm.outcome,
        complications: completeForm.complications,
        anesthesia_type: completeForm.anesthesia_type,
        surgeon: completeForm.surgeon || null,
        assistant: completeForm.assistant || null,
        nurse: completeForm.nurse || null,
        charge_amount: completeForm.charge_amount || "0",
      });
      setCompleteModal(false);
      setCompleteForm(emptyComplete);
      setSuccess(`Procedure completed and added to ${data.invoice_number || "the patient bill"}.`);
      load();
    } catch (err) {
      setError(formatError(err));
    } finally {
      setSaving(false);
    }
  };

  const cancelBooking = async (booking) => {
    setError("");
    try {
      await cancelTheaterBooking(booking.id, { reason: "Cancelled from OT dashboard." });
      setSuccess("OT booking cancelled.");
      load();
    } catch (err) {
      setError(formatError(err));
    }
  };

  return (
    <div className="page-enter" style={{ padding: 28 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "var(--font-display)" }}>Operation Theater</div>
          <div style={{ fontSize: 13, color: "var(--text-mute)", marginTop: 2 }}>Procedures, OT bookings, completion notes, and theater billing</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {canConfigure && <Btn variant="secondary" onClick={() => setRoomModal(true)}>Add Room</Btn>}
          {canConfigure && <Btn variant="secondary" onClick={() => setProcedureModal(true)}>Add Procedure</Btn>}
          {canManage && <Btn onClick={() => setBookingModal(true)}>New OT Booking</Btn>}
        </div>
      </div>

      {error && <Alert message={error} />}
      {success && <Alert message={success} type="success" />}

      <div className="dashboard-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        <Card><Metric label="Procedures" value={summary?.procedures || 0} /></Card>
        <Card><Metric label="Scheduled" value={summary?.scheduled || 0} color="var(--blue)" /></Card>
        <Card><Metric label="In Progress" value={summary?.in_progress || 0} color="var(--amber)" /></Card>
        <Card><Metric label="Completed" value={summary?.completed || 0} color="var(--green)" /></Card>
      </div>

      <Tabs tabs={[{ key: "bookings", label: "Bookings" }, { key: "procedures", label: "Procedure Catalog" }, { key: "rooms", label: "OT Rooms" }]} active={tab} onChange={setTab} />

      {loading ? <Spinner /> : tab === "bookings" ? (
        <BookingsTable bookings={bookings} canManage={canManage} onStart={startBooking} onComplete={openComplete} onCancel={cancelBooking} />
      ) : tab === "procedures" ? (
        <ProceduresTable procedures={procedures} />
      ) : (
        <RoomsTable rooms={rooms} />
      )}

      <Modal open={bookingModal} onClose={() => setBookingModal(false)} title="New OT Booking" width={700}>
        <Field label="Patient" name="patient" value={bookingForm.patient} onChange={handleBooking} options={patientOptions} required />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Procedure" name="procedure" value={bookingForm.procedure} onChange={handleBooking} options={procedureOptions} required />
          <Field label="OT Room" name="operating_room" value={bookingForm.operating_room} onChange={handleBooking} options={roomOptions} />
          <Field label="Scheduled At" name="scheduled_at" type="datetime-local" value={bookingForm.scheduled_at} onChange={handleBooking} required />
          <Field label="Priority" name="priority" value={bookingForm.priority} onChange={handleBooking} options={PRIORITIES} />
          <Field label="Surgeon" name="surgeon" value={bookingForm.surgeon} onChange={handleBooking} options={surgeonOptions} />
          <Field label="Nurse" name="nurse" value={bookingForm.nurse} onChange={handleBooking} options={nurseOptions} />
          <Field label="Assistant" name="assistant" value={bookingForm.assistant} onChange={handleBooking} options={[...surgeonOptions, ...nurseOptions]} />
          <Field label="Anesthesia" name="anesthesia_type" value={bookingForm.anesthesia_type} onChange={handleBooking} options={ANESTHESIA_TYPES} />
        </div>
        {selectedProcedure && <Alert type="info" message={`Default billing charge after completion: Rs. ${selectedProcedure.default_price}.`} />}
        <Field label="Indication" name="indication" value={bookingForm.indication} onChange={handleBooking} />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <Btn variant="secondary" onClick={() => setBookingModal(false)}>Cancel</Btn>
          <Btn onClick={saveBooking} disabled={saving || !bookingForm.patient || !bookingForm.procedure || !bookingForm.scheduled_at}>Create Booking</Btn>
        </div>
      </Modal>

      <Modal open={procedureModal} onClose={() => setProcedureModal(false)} title="Add Procedure" width={560}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Code" name="code" value={procedureForm.code} onChange={handleProcedure} required />
          <Field label="Name" name="name" value={procedureForm.name} onChange={handleProcedure} required />
          <Field label="Type" name="procedure_type" value={procedureForm.procedure_type} onChange={handleProcedure} options={PROCEDURE_TYPES} />
          <Field label="Default Price" name="default_price" type="number" value={procedureForm.default_price} onChange={handleProcedure} />
          <Field label="Estimated Minutes" name="estimated_minutes" type="number" value={procedureForm.estimated_minutes} onChange={handleProcedure} />
        </div>
        <Field label="Description" name="description" value={procedureForm.description} onChange={handleProcedure} />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <Btn variant="secondary" onClick={() => setProcedureModal(false)}>Cancel</Btn>
          <Btn onClick={saveProcedure} disabled={saving || !procedureForm.code || !procedureForm.name}>Save Procedure</Btn>
        </div>
      </Modal>

      <Modal open={roomModal} onClose={() => setRoomModal(false)} title="Add OT Room" width={520}>
        <Field label="Room Name" name="name" value={roomForm.name} onChange={handleRoom} required />
        <Field label="Location" name="location" value={roomForm.location} onChange={handleRoom} />
        <Field label="Notes" name="notes" value={roomForm.notes} onChange={handleRoom} />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <Btn variant="secondary" onClick={() => setRoomModal(false)}>Cancel</Btn>
          <Btn onClick={saveRoom} disabled={saving || !roomForm.name}>Save Room</Btn>
        </div>
      </Modal>

      <Modal open={completeModal} onClose={() => setCompleteModal(false)} title={`Complete ${completeForm.bookingNumber}`} width={660}>
        <Alert type="info" message={`Completing ${completeForm.procedureName} will add the procedure charge to Billing.`} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Charge Amount" name="charge_amount" type="number" value={completeForm.charge_amount} onChange={handleComplete} />
          <Field label="Anesthesia" name="anesthesia_type" value={completeForm.anesthesia_type} onChange={handleComplete} options={ANESTHESIA_TYPES} />
          <Field label="Surgeon" name="surgeon" value={completeForm.surgeon} onChange={handleComplete} options={surgeonOptions} />
          <Field label="Nurse" name="nurse" value={completeForm.nurse} onChange={handleComplete} options={nurseOptions} />
        </div>
        <Field label="Procedure Notes" name="procedure_notes" value={completeForm.procedure_notes} onChange={handleComplete} />
        <Field label="Outcome" name="outcome" value={completeForm.outcome} onChange={handleComplete} />
        <Field label="Complications" name="complications" value={completeForm.complications} onChange={handleComplete} />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <Btn variant="secondary" onClick={() => setCompleteModal(false)}>Cancel</Btn>
          <Btn onClick={saveComplete} disabled={saving}>Complete Procedure</Btn>
        </div>
      </Modal>
    </div>
  );
}

function BookingsTable({ bookings, canManage, onStart, onComplete, onCancel }) {
  if (!bookings.length) return <Empty icon="OT" message="No OT bookings yet" />;
  return (
    <div className="table-shell" style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr>{["Booking", "Patient", "Procedure", "Schedule", "Team", "Billing", "Actions"].map((head) => <Th key={head}>{head}</Th>)}</tr></thead>
        <tbody>
          {bookings.map((booking) => (
            <tr key={booking.id} style={{ borderBottom: "1px solid var(--border-light)" }}>
              <Td>
                <div style={{ fontWeight: 800, color: "var(--card-ink)" }}>{booking.booking_number}</div>
                <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                  <Badge label={booking.status.replace("_", " ")} color={STATUS_COLOR[booking.status] || "var(--text-mute)"} />
                  <Badge label={booking.priority} color={PRIORITY_COLOR[booking.priority] || "var(--text-mute)"} />
                </div>
              </Td>
              <Td>{booking.patient_detail?.full_name || "-"}</Td>
              <Td>
                <div>{booking.procedure_detail?.name || "-"}</div>
                <div style={{ color: "var(--text-mute)", fontSize: 12 }}>{booking.operating_room_detail?.name || "No room"}</div>
              </Td>
              <Td>{new Date(booking.scheduled_at).toLocaleString()}</Td>
              <Td>
                <div>{booking.surgeon_name || "No surgeon"}</div>
                <div style={{ color: "var(--text-mute)", fontSize: 12 }}>{booking.nurse_name || "No nurse"}</div>
              </Td>
              <Td>
                {booking.invoice_number ? (
                  <div>
                    <div>{booking.invoice_number}</div>
                    <div style={{ color: "var(--text-mute)", fontSize: 12 }}>Rs. {booking.invoice_line_total}</div>
                  </div>
                ) : "-"}
              </Td>
              <Td>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {canManage && booking.status === "scheduled" && <Btn size="sm" variant="secondary" onClick={() => onStart(booking)}>Start</Btn>}
                  {canManage && ["scheduled", "in_progress"].includes(booking.status) && <Btn size="sm" onClick={() => onComplete(booking)}>Complete</Btn>}
                  {canManage && booking.status === "scheduled" && <Btn size="sm" variant="danger" onClick={() => onCancel(booking)}>Cancel</Btn>}
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ProceduresTable({ procedures }) {
  if (!procedures.length) return <Empty icon="PR" message="No procedures configured" />;
  return (
    <div className="table-shell" style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr>{["Code", "Name", "Type", "Price", "Duration", "Status"].map((head) => <Th key={head}>{head}</Th>)}</tr></thead>
        <tbody>
          {procedures.map((procedure) => (
            <tr key={procedure.id} style={{ borderBottom: "1px solid var(--border-light)" }}>
              <Td>{procedure.code}</Td>
              <Td>{procedure.name}</Td>
              <Td>{procedure.procedure_type}</Td>
              <Td>Rs. {procedure.default_price}</Td>
              <Td>{procedure.estimated_minutes} min</Td>
              <Td><Badge label={procedure.is_active ? "active" : "inactive"} color={procedure.is_active ? "var(--green)" : "var(--text-mute)"} /></Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RoomsTable({ rooms }) {
  if (!rooms.length) return <Empty icon="RM" message="No OT rooms configured" />;
  return (
    <div className="table-shell" style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr>{["Room", "Location", "Notes", "Status"].map((head) => <Th key={head}>{head}</Th>)}</tr></thead>
        <tbody>
          {rooms.map((room) => (
            <tr key={room.id} style={{ borderBottom: "1px solid var(--border-light)" }}>
              <Td>{room.name}</Td>
              <Td>{room.location || "-"}</Td>
              <Td>{room.notes || "-"}</Td>
              <Td><Badge label={room.is_active ? "active" : "inactive"} color={room.is_active ? "var(--green)" : "var(--text-mute)"} /></Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Metric({ label, value, color = "var(--teal)" }) {
  return (
    <div>
      <div style={{ fontSize: 24, fontWeight: 800, color, fontFamily: "var(--font-display)" }}>{value}</div>
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

function formatError(err) {
  const data = err.response?.data;
  if (!data) return "Operation failed.";
  if (typeof data === "string") return data;
  if (Array.isArray(data)) return data.join(" ");
  return Object.values(data).flat().join(" ");
}
