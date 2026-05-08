import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getStaff } from "../../api/auth";
import { getPatients } from "../../api/patients";
import { getTodayAppointments } from "../../api/appointments";
import { StatCard, Card, Badge, Spinner, Empty } from "../../components/ui";
import useAuthStore from "../../store/authStore";

const ROLE_COLOR = {
  doctor: "var(--blue)",
  nurse: "var(--purple)",
  receptionist: "var(--amber)",
  hospital_admin: "var(--teal)",
  billing_staff: "var(--green)",
  pharmacist: "var(--red)",
  lab_technician: "var(--text-mute)",
};

export default function AdminDashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [staff, setStaff] = useState([]);
  const [patients, setPatients] = useState([]);
  const [appts, setAppts] = useState([]);
  const [loading, setLoad] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      getStaff(),
      getPatients({ page_size: 5, ordering: "-created_at" }),
      getTodayAppointments(),
    ]).then(([staffRes, patientRes, appointmentRes]) => {
      setStaff(staffRes.data.results || staffRes.data);
      setPatients(patientRes.data.results || patientRes.data);
      setAppts(appointmentRes.data.results || appointmentRes.data);
    }).catch(() => {
      setError("Unable to load dashboard data.");
    }).finally(() => setLoad(false));
  }, []);

  const activeStaff = staff.filter((person) => person.is_active).length;
  const doctors = staff.filter((person) => person.role_name === "doctor").length;

  return (
    <div className="page-enter" style={{ padding: 28 }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 24, fontWeight: 800, fontFamily: "var(--font-display)" }}>
          Admin Dashboard
        </div>
        <div style={{ fontSize: 13, color: "var(--text-mute)", marginTop: 4 }}>
          Welcome back, {user?.full_name || user?.username}
        </div>
      </div>

      {error && <div className="alert" style={{ "--alert-color": "var(--red)" }}>{error}</div>}

      <div className="dashboard-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 28 }}>
        <StatCard label="Total Staff" value={activeStaff} color="var(--teal)" icon="ST" />
        <StatCard label="Doctors" value={doctors} color="var(--blue)" icon="DR" />
        <StatCard label="Total Patients" value={patients.length} color="var(--purple)" icon="PT" />
        <StatCard label="Today's Appts" value={appts.length} color="var(--green)" icon="AP" />
      </div>

      <div className="quick-actions" style={{ display: "flex", gap: 12, marginBottom: 28 }}>
        {[
          { label: "Add Staff", to: "/admin/staff", color: "var(--teal)" },
          { label: "Clinical Staff", to: "/admin/clinical", color: "var(--blue)" },
          { label: "Manage IPD", to: "/admin/ipd", color: "var(--blue)" },
          { label: "Lab", to: "/admin/lab", color: "var(--purple)" },
          { label: "Billing", to: "/admin/billing", color: "var(--green)" },
          { label: "View Patients", to: "/admin/patients", color: "var(--purple)" },
          { label: "Appointments", to: "/admin/appointments", color: "var(--amber)" },
        ].map(({ label, to, color }) => (
          <button key={to} onClick={() => navigate(to)}
            style={{ flex: 1, background: color + "15", border: `1px solid ${color}33`,
              borderRadius: 8, padding: "14px", color, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            {label}
          </button>
        ))}
      </div>

      <div className="split-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <Card title="Staff" action={
          <button onClick={() => navigate("/admin/staff")}
            style={{ fontSize: 12, color: "var(--teal)", background: "none", border: "none", cursor: "pointer" }}>
            Manage
          </button>
        }>
          {loading ? <Spinner /> : staff.length === 0 ? <Empty icon="ST" message="No staff yet" /> :
            staff.slice(0, 6).map((person) => (
              <div key={person.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "10px 0", borderBottom: "1px solid var(--border-light)" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{person.full_name || person.username}</div>
                  <div style={{ fontSize: 11, color: "var(--text-mute)" }}>{person.department || person.email}</div>
                </div>
                <Badge label={person.role_display || person.role_name || "-"} color={ROLE_COLOR[person.role_name] || "var(--text-mute)"} />
              </div>
            ))
          }
        </Card>

        <Card title="Today's Appointments" action={
          <button onClick={() => navigate("/admin/appointments")}
            style={{ fontSize: 12, color: "var(--teal)", background: "none", border: "none", cursor: "pointer" }}>
            View all
          </button>
        }>
          {loading ? <Spinner /> : appts.length === 0 ? <Empty icon="AP" message="No appointments today" /> :
            appts.slice(0, 6).map((appointment) => (
              <div key={appointment.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "10px 0", borderBottom: "1px solid var(--border-light)" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{appointment.patient_name}</div>
                  <div style={{ fontSize: 11, color: "var(--text-mute)" }}>{appointment.doctor_name} / {appointment.appointment_time}</div>
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--teal)" }}>#{appointment.token_number}</span>
              </div>
            ))
          }
        </Card>
      </div>
    </div>
  );
}
