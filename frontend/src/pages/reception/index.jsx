import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getPatients } from "../../api/patients";
import { getTodayAppointments } from "../../api/appointments";
import { StatCard, Card, Badge, Spinner, Empty, Alert } from "../../components/ui";
import useAuthStore from "../../store/authStore";

const STATUS_COLOR = {
  active: "var(--green)",
  inactive: "var(--text-mute)",
  scheduled: "var(--blue)",
  completed: "var(--green)",
  cancelled: "var(--red)",
  no_show: "var(--amber)",
};

export default function ReceptionDashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [appointments, setAppts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      getPatients({ ordering: "-created_at", page_size: 5 }),
      getTodayAppointments(),
    ]).then(([patientRes, appointmentRes]) => {
      setPatients(patientRes.data.results || patientRes.data);
      setAppts(appointmentRes.data.results || appointmentRes.data);
    }).catch(() => {
      setError("Unable to load reception dashboard data.");
    }).finally(() => setLoading(false));
  }, []);

  const todayScheduled = appointments.filter((appointment) => appointment.status === "scheduled").length;
  const todayCompleted = appointments.filter((appointment) => appointment.status === "completed").length;

  return (
    <div className="page-enter" style={{ padding: 28 }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 24, fontWeight: 800, fontFamily: "var(--font-display)", color: "var(--text)" }}>
          Good {new Date().getHours() < 12 ? "Morning" : new Date().getHours() < 17 ? "Afternoon" : "Evening"}, {user?.full_name?.split(" ")[0] || user?.username}
        </div>
        <div style={{ fontSize: 13, color: "var(--text-mute)", marginTop: 4 }}>
          {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </div>
      </div>

      {error && <Alert message={error} />}

      <div className="dashboard-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>
        <StatCard label="Today's Appointments" value={appointments.length} color="var(--teal)" icon="AP" />
        <StatCard label="Scheduled" value={todayScheduled} color="var(--blue)" icon="SC" />
        <StatCard label="Completed" value={todayCompleted} color="var(--green)" icon="OK" />
        <StatCard label="Total Patients" value={patients.length} color="var(--purple)" icon="PT" />
      </div>

      <div className="quick-actions" style={{ display: "flex", gap: 12, marginBottom: 28 }}>
        {[
          { label: "Register Patient", to: "/reception/patients", color: "var(--teal)" },
          { label: "Book Appointment", to: "/reception/appointments", color: "var(--blue)" },
          { label: "IPD Beds", to: "/reception/ipd", color: "var(--amber)" },
          { label: "All Patients", to: "/reception/patients", color: "var(--purple)" },
        ].map(({ label, to, color }) => (
          <button key={label} onClick={() => navigate(to)}
            style={{ flex: 1, background: color + "15", border: `1px solid ${color}33`,
              borderRadius: 8, padding: "14px", color, fontSize: 13, fontWeight: 600,
              cursor: "pointer", transition: "all .15s" }}>
            {label}
          </button>
        ))}
      </div>

      <div className="split-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <Card title="Today's Appointments" action={
          <button onClick={() => navigate("/reception/appointments")}
            style={{ fontSize: 12, color: "var(--teal)", background: "none", border: "none", cursor: "pointer" }}>
            View all
          </button>
        }>
          {loading ? <Spinner /> : appointments.length === 0 ? <Empty icon="AP" message="No appointments today" /> :
            appointments.slice(0, 6).map((appointment) => (
              <div key={appointment.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "10px 0", borderBottom: "1px solid var(--border-light)" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{appointment.patient_name}</div>
                  <div style={{ fontSize: 11, color: "var(--text-mute)" }}>{appointment.doctor_name} / {appointment.appointment_time}</div>
                </div>
                <Badge label={appointment.status.replace("_", " ")} color={STATUS_COLOR[appointment.status]} />
              </div>
            ))
          }
        </Card>

        <Card title="Recent Patients" action={
          <button onClick={() => navigate("/reception/patients")}
            style={{ fontSize: 12, color: "var(--teal)", background: "none", border: "none", cursor: "pointer" }}>
            View all
          </button>
        }>
          {loading ? <Spinner /> : patients.length === 0 ? <Empty icon="PT" message="No patients yet" /> :
            patients.slice(0, 6).map((patient) => (
              <div key={patient.id} onClick={() => navigate(`/reception/patients/${patient.id}`)}
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "10px 0", borderBottom: "1px solid var(--border-light)", cursor: "pointer" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{patient.full_name}</div>
                  <div style={{ fontSize: 11, color: "var(--text-mute)" }}>{patient.patient_id} / {patient.age}y / {patient.gender}</div>
                </div>
                <Badge label={patient.status} color={STATUS_COLOR[patient.status]} />
              </div>
            ))
          }
        </Card>
      </div>
    </div>
  );
}
