// LOCATION: HMS/frontend/src/pages/reception/index.jsx

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getPatients } from "../../api/patients";
import { getTodayAppointments } from "../../api/appointments";
import { StatCard, Card, Badge, Spinner, Empty } from "../../components/ui";
import useAuthStore from "../../store/authStore";

const STATUS_COLOR = { active: "var(--green)", inactive: "var(--text-mute)", scheduled: "var(--blue)", completed: "var(--green)", cancelled: "var(--red)", no_show: "var(--amber)" };

export default function ReceptionDashboard() {
  const { user }    = useAuthStore();
  const navigate    = useNavigate();
  const [patients, setPatients]     = useState([]);
  const [appointments, setAppts]    = useState([]);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    Promise.all([
      getPatients({ ordering: "-created_at", page_size: 5 }),
      getTodayAppointments(),
    ]).then(([p, a]) => {
      setPatients(p.data.results || p.data);
      setAppts(a.data.results    || a.data);
    }).finally(() => setLoading(false));
  }, []);

  const todayScheduled  = appointments.filter(a => a.status === "scheduled").length;
  const todayCompleted  = appointments.filter(a => a.status === "completed").length;

  return (
    <div className="page-enter" style={{ padding: 28 }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 24, fontWeight: 800, fontFamily: "var(--font-display)", color: "var(--text)" }}>
          Good {new Date().getHours() < 12 ? "Morning" : new Date().getHours() < 17 ? "Afternoon" : "Evening"}, {user?.full_name?.split(" ")[0]} 👋
        </div>
        <div style={{ fontSize: 13, color: "var(--text-mute)", marginTop: 4 }}>
          {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>
        <StatCard label="Today's Appointments" value={appointments.length} color="var(--teal)"   icon="📅" />
        <StatCard label="Scheduled"            value={todayScheduled}      color="var(--blue)"   icon="⏳" />
        <StatCard label="Completed"            value={todayCompleted}      color="var(--green)"  icon="✅" />
        <StatCard label="Total Patients"       value={patients.length}     color="var(--purple)" icon="👥" />
      </div>

      {/* Quick Actions */}
      <div style={{ display: "flex", gap: 12, marginBottom: 28 }}>
        {[
          { label: "➕ Register Patient",   to: "/reception/patients/register",     color: "var(--teal)" },
          { label: "📅 Book Appointment",   to: "/reception/appointments/book",     color: "var(--blue)" },
          { label: "🔢 View Queue",         to: "/reception/queue",                 color: "var(--amber)" },
          { label: "👥 All Patients",       to: "/reception/patients",              color: "var(--purple)" },
        ].map(({ label, to, color }) => (
          <button key={to} onClick={() => navigate(to)}
            style={{ flex: 1, background: color + "15", border: `1px solid ${color}33`,
              borderRadius: 10, padding: "14px", color, fontSize: 13, fontWeight: 600,
              cursor: "pointer", transition: "all .15s" }}>
            {label}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

        {/* Today's Appointments */}
        <Card title="Today's Appointments" action={
          <button onClick={() => navigate("/reception/appointments")}
            style={{ fontSize: 12, color: "var(--teal)", background: "none", border: "none", cursor: "pointer" }}>
            View all →
          </button>
        }>
          {loading ? <Spinner /> : appointments.length === 0 ? <Empty icon="📅" message="No appointments today" /> :
            appointments.slice(0, 6).map((a) => (
              <div key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "10px 0", borderBottom: "1px solid var(--border-light)" }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--teal)18",
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13,
                    fontWeight: 700, color: "var(--teal)" }}>
                    {a.token_number}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{a.patient_name}</div>
                    <div style={{ fontSize: 11, color: "var(--text-mute)" }}>{a.doctor_name} · {a.appointment_time}</div>
                  </div>
                </div>
                <Badge label={a.status.replace("_", " ")} color={STATUS_COLOR[a.status]} />
              </div>
            ))
          }
        </Card>

        {/* Recent Patients */}
        <Card title="Recent Patients" action={
          <button onClick={() => navigate("/reception/patients")}
            style={{ fontSize: 12, color: "var(--teal)", background: "none", border: "none", cursor: "pointer" }}>
            View all →
          </button>
        }>
          {loading ? <Spinner /> : patients.length === 0 ? <Empty icon="👥" message="No patients yet" /> :
            patients.slice(0, 6).map((p) => (
              <div key={p.id} onClick={() => navigate(`/reception/patients/${p.id}`)}
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "10px 0", borderBottom: "1px solid var(--border-light)", cursor: "pointer" }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--purple)18",
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14,
                    fontWeight: 700, color: "var(--purple)" }}>
                    {p.full_name?.[0]}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{p.full_name}</div>
                    <div style={{ fontSize: 11, color: "var(--text-mute)" }}>{p.patient_id} · {p.age}y · {p.gender}</div>
                  </div>
                </div>
                <Badge label={p.status} color={STATUS_COLOR[p.status]} />
              </div>
            ))
          }
        </Card>
      </div>
    </div>
  );
}