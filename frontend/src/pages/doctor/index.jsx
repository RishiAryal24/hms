// LOCATION: HMS/frontend/src/pages/doctor/index.jsx — REPLACE

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getTodayAppointments } from "../../api/appointments";
import { StatCard, Card, Badge, Btn, Spinner, Empty } from "../../components/ui";
import useAuthStore from "../../store/authStore";

const STATUS_COLOR = { scheduled:"var(--blue)", completed:"var(--green)", cancelled:"var(--red)", no_show:"var(--amber)" };

export default function DoctorDashboard() {
  const { user }   = useAuthStore();
  const navigate   = useNavigate();
  const [appts, setAppts]  = useState([]);
  const [loading, setLoad] = useState(true);

  useEffect(() => {
    getTodayAppointments({ doctor: user?.id, page_size: 100 })
      .then(r => setAppts(r.data.results || r.data))
      .finally(() => setLoad(false));
  }, []);

  const scheduled = appts.filter(a => a.status === "scheduled").length;
  const completed = appts.filter(a => a.status === "completed").length;
  const pending   = appts.filter(a => a.status === "scheduled");

  const base = user?.is_tenant_admin ? "/admin" : "/doctor";

  return (
    <div className="page-enter" style={{ padding: 28 }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 24, fontWeight: 800, fontFamily: "var(--font-display)" }}>
          Dr. {user?.full_name?.split(" ").slice(-1)[0]}'s Dashboard
        </div>
        <div style={{ fontSize: 13, color: "var(--text-mute)", marginTop: 4 }}>
          {new Date().toLocaleDateString("en-US", { weekday:"long", year:"numeric", month:"long", day:"numeric" })}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 28 }}>
        <StatCard label="Today's Total"  value={appts.length} color="var(--teal)"  icon="📅" />
        <StatCard label="Remaining"      value={scheduled}    color="var(--blue)"  icon="⏳" />
        <StatCard label="Completed"      value={completed}    color="var(--green)" icon="✅" />
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 28 }}>
        {[
          { label: "📋 Today's Schedule", to: `${base}/appointments` },
          { label: "👥 My Patients",      to: `${base}/patients` },
        ].map(({ label, to }) => (
          <button key={to} onClick={() => navigate(to)}
            style={{ flex: 1, background: "var(--teal-dim)", border: "1px solid var(--teal)33",
              borderRadius: 10, padding: "14px", color: "var(--teal)", fontSize: 13,
              fontWeight: 600, cursor: "pointer" }}>
            {label}
          </button>
        ))}
      </div>

      <Card title="Today's Pending Appointments">
        {loading ? <Spinner /> : pending.length === 0
          ? <Empty icon="🎉" message="All appointments completed!" />
          : pending.map(a => (
            <div key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "12px 0", borderBottom: "1px solid var(--border-light)" }}>
              <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                <div style={{ width: 36, height: 36, borderRadius: 9, background: "var(--teal)18",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 14, fontWeight: 800, color: "var(--teal)" }}>
                  {a.token_number}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, cursor: "pointer" }}
                    onClick={() => navigate(`${base}/patients/${a.patient}`)}>
                    {a.patient_name}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-mute)", marginTop: 2 }}>
                    {a.appointment_time} · {a.appointment_type.replace("_"," ")}
                    {a.chief_complaint && ` · "${a.chief_complaint}"`}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <Badge label={a.status} color={STATUS_COLOR[a.status]} />
                <Btn size="sm" variant="ghost"
                  onClick={() => navigate(`${base}/appointments`)}>
                  Manage
                </Btn>
              </div>
            </div>
          ))
        }
      </Card>
    </div>
  );
}