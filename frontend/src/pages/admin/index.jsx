// LOCATION: HMS/frontend/src/pages/admin/index.jsx

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getStaff, getRoles } from "../../api/auth";
import { getPatients } from "../../api/patients";
import { getTodayAppointments } from "../../api/appointments";
import { StatCard, Card, Badge, Spinner, Empty } from "../../components/ui";
import useAuthStore from "../../store/authStore";

const ROLE_COLOR = { doctor:"var(--blue)", nurse:"var(--purple)", receptionist:"var(--amber)", hospital_admin:"var(--teal)", billing_staff:"var(--green)", pharmacist:"var(--red)", lab_technician:"var(--text-mute)" };

export default function AdminDashboard() {
  const { user }  = useAuthStore();
  const navigate  = useNavigate();
  const [staff, setStaff]       = useState([]);
  const [patients, setPatients] = useState([]);
  const [appts, setAppts]       = useState([]);
  const [loading, setLoad]      = useState(true);

  useEffect(() => {
    Promise.all([
      getStaff(),
      getPatients({ page_size: 5, ordering: "-created_at" }),
      getTodayAppointments(),
    ]).then(([s, p, a]) => {
      setStaff(s.data.results    || s.data);
      setPatients(p.data.results || p.data);
      setAppts(a.data.results    || a.data);
    }).finally(() => setLoad(false));
  }, []);

  const activeStaff = staff.filter(s => s.is_active).length;
  const doctors     = staff.filter(s => s.role_name === "doctor").length;

  return (
    <div className="page-enter" style={{ padding: 28 }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 24, fontWeight: 800, fontFamily: "var(--font-display)" }}>
          Admin Dashboard
        </div>
        <div style={{ fontSize: 13, color: "var(--text-mute)", marginTop: 4 }}>
          Welcome back, {user?.full_name}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 28 }}>
        <StatCard label="Total Staff"      value={activeStaff}    color="var(--teal)"   icon="👤" />
        <StatCard label="Doctors"          value={doctors}        color="var(--blue)"   icon="🩺" />
        <StatCard label="Total Patients"   value={patients.length} color="var(--purple)" icon="👥" />
        <StatCard label="Today's Appts"    value={appts.length}   color="var(--green)"  icon="📅" />
      </div>

      {/* Quick Actions */}
      <div style={{ display: "flex", gap: 12, marginBottom: 28 }}>
        {[
          { label: "👤 Add Staff",        to: "/admin/staff",       color: "var(--teal)" },
          { label: "🗓 Manage Schedules", to: "/admin/schedules",   color: "var(--blue)" },
          { label: "👥 View Patients",    to: "/admin/patients",    color: "var(--purple)" },
          { label: "📅 Appointments",     to: "/admin/appointments",color: "var(--amber)" },
        ].map(({ label, to, color }) => (
          <button key={to} onClick={() => navigate(to)}
            style={{ flex: 1, background: color + "15", border: `1px solid ${color}33`,
              borderRadius: 10, padding: "14px", color, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            {label}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

        {/* Staff List */}
        <Card title="Staff" action={
          <button onClick={() => navigate("/admin/staff")}
            style={{ fontSize: 12, color: "var(--teal)", background: "none", border: "none", cursor: "pointer" }}>
            Manage →
          </button>
        }>
          {loading ? <Spinner /> : staff.length === 0 ? <Empty icon="👤" message="No staff yet" /> :
            staff.slice(0, 6).map(s => (
              <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "10px 0", borderBottom: "1px solid var(--border-light)" }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8,
                    background: (ROLE_COLOR[s.role_name] || "var(--text-mute)") + "20",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 13, fontWeight: 700, color: ROLE_COLOR[s.role_name] || "var(--text-mute)" }}>
                    {(s.full_name || s.username)?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{s.full_name || s.username}</div>
                    <div style={{ fontSize: 11, color: "var(--text-mute)" }}>{s.department || s.email}</div>
                  </div>
                </div>
                <Badge label={s.role_display || s.role_name || "—"} color={ROLE_COLOR[s.role_name] || "var(--text-mute)"} />
              </div>
            ))
          }
        </Card>

        {/* Today's Appointments */}
        <Card title="Today's Appointments" action={
          <button onClick={() => navigate("/admin/appointments")}
            style={{ fontSize: 12, color: "var(--teal)", background: "none", border: "none", cursor: "pointer" }}>
            View all →
          </button>
        }>
          {loading ? <Spinner /> : appts.length === 0 ? <Empty icon="📅" message="No appointments today" /> :
            appts.slice(0, 6).map(a => (
              <div key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "10px 0", borderBottom: "1px solid var(--border-light)" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{a.patient_name}</div>
                  <div style={{ fontSize: 11, color: "var(--text-mute)" }}>{a.doctor_name} · {a.appointment_time}</div>
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--teal)" }}>#{a.token_number}</span>
              </div>
            ))
          }
        </Card>
      </div>
    </div>
  );
}