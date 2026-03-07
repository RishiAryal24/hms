// LOCATION: HMS/frontend/src/pages/doctor/Patients.jsx
// ACTION:   CREATE this file inside HMS/frontend/src/pages/doctor/

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getPatients } from "../../api/patients";
import { Badge, Spinner, Empty } from "../../components/ui";
import useAuthStore from "../../store/authStore";

const STATUS_COLOR = { active: "var(--green)", inactive: "var(--text-mute)", deceased: "var(--red)" };

export default function DoctorPatients() {
  const { user }  = useAuthStore();
  const navigate  = useNavigate();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [showAll, setShowAll]   = useState(false);

  const load = () => {
    setLoading(true);
    const params = {
      search:   search || undefined,
      ordering: "-created_at",
    };
    // Filter by primary_doctor unless showAll is checked
    if (!showAll) params.primary_doctor = user?.id;
    getPatients(params)
      .then(r => setPatients(r.data.results || r.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [search, showAll]);

  return (
    <div className="page-enter" style={{ padding: 28 }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "var(--font-display)" }}>Patients</div>
        <div style={{ fontSize: 13, color: "var(--text-mute)", marginTop: 2 }}>
          {showAll ? "All hospital patients" : "Your assigned patients"}
        </div>
      </div>

      {/* Search & toggle */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, alignItems: "center" }}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, ID, phone…"
          style={{ flex: 1, background: "var(--card)", border: "1px solid var(--border)",
            borderRadius: "var(--radius)", padding: "9px 14px", color: "var(--text)", outline: "none" }} />
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13,
          color: "var(--text-mute)", cursor: "pointer", whiteSpace: "nowrap" }}>
          <input type="checkbox" checked={showAll} onChange={e => setShowAll(e.target.checked)} />
          Show all patients
        </label>
      </div>

      {loading ? <Spinner /> : patients.length === 0 ? (
        <Empty icon="👥" message={showAll ? "No patients found" : "No patients assigned to you"} />
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {patients.map(p => (
            <div key={p.id} onClick={() => navigate(`/doctor/patients/${p.id}`)}
              style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12,
                padding: "16px 20px", cursor: "pointer", display: "flex",
                justifyContent: "space-between", alignItems: "center",
                transition: "border-color .15s" }}
              onMouseEnter={e => e.currentTarget.style.borderColor = "var(--teal)44"}
              onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}>
              <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                <div style={{ width: 44, height: 44, borderRadius: 11,
                  background: "var(--blue)18", display: "flex", alignItems: "center",
                  justifyContent: "center", fontSize: 18, fontWeight: 700, color: "var(--blue)" }}>
                  {p.full_name?.[0]}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{p.full_name}</div>
                  <div style={{ fontSize: 12, color: "var(--text-mute)", marginTop: 3 }}>
                    {p.patient_id} · {p.age}y · {p.gender} · {p.blood_group}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 1 }}>
                    {p.phone} · {p.city}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                <Badge label={p.status} color={STATUS_COLOR[p.status]} />
                {p.is_vip && <Badge label="VIP" color="var(--amber)" />}
                <div style={{ fontSize: 11, color: "var(--text-dim)" }}>{p.primary_doctor_name || "No doctor"}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}