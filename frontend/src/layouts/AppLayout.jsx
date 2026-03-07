// LOCATION: HMS/frontend/src/layouts/AppLayout.jsx

import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import useAuthStore from "../store/authStore";
import { logout } from "../api/auth";

const NAV = {
  receptionist: [
    { to: "/reception",               icon: "🏠", label: "Dashboard" },
    { to: "/reception/patients",      icon: "👥", label: "Patients" },
    { to: "/reception/appointments",  icon: "📅", label: "Appointments" },
    { to: "/reception/queue",         icon: "🔢", label: "Queue" },
  ],
  doctor: [
    { to: "/doctor",                  icon: "🏠", label: "Dashboard" },
    { to: "/doctor/patients",         icon: "👥", label: "My Patients" },
    { to: "/doctor/appointments",     icon: "📅", label: "Appointments" },
  ],
  hospital_admin: [
    { to: "/admin",                   icon: "🏠", label: "Dashboard" },
    { to: "/admin/staff",             icon: "👤", label: "Staff" },
    { to: "/admin/schedules",         icon: "🗓", label: "Schedules" },
    { to: "/admin/patients",          icon: "👥", label: "Patients" },
    { to: "/admin/appointments",      icon: "📅", label: "Appointments" },
  ],
  nurse: [
    { to: "/doctor",                  icon: "🏠", label: "Dashboard" },
    { to: "/doctor/patients",         icon: "👥", label: "Patients" },
    { to: "/doctor/appointments",     icon: "📅", label: "Appointments" },
  ],
};

export default function AppLayout() {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const role    = user?.is_tenant_admin ? "hospital_admin" : user?.role;
  const navItems = NAV[role] || NAV["receptionist"];

  const handleLogout = async () => {
    try {
      const refresh = localStorage.getItem("refresh");
      await logout(refresh);
    } catch {}
    clearAuth();
    navigate("/login");
  };

  const roleColors = {
    hospital_admin: "var(--teal)",
    doctor:         "var(--blue)",
    nurse:          "var(--purple)",
    receptionist:   "var(--amber)",
  };
  const roleColor = roleColors[role] || "var(--teal)";

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>

      {/* Sidebar */}
      <aside style={{
        width: collapsed ? 64 : 220, flexShrink: 0, background: "var(--surface)",
        borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column",
        transition: "width .25s", overflow: "hidden",
      }}>
        {/* Logo */}
        <div style={{ padding: collapsed ? "18px 16px" : "18px 20px", borderBottom: "1px solid var(--border-light)",
          display: "flex", alignItems: "center", gap: 10, minHeight: 64 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--teal)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>🏥</div>
          {!collapsed && (
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, fontFamily: "var(--font-display)", color: "var(--text)", lineHeight: 1 }}>HMS</div>
              <div style={{ fontSize: 10, color: "var(--text-mute)", marginTop: 2 }}>Hospital System</div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "12px 8px", overflowY: "auto" }}>
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to.split("/").length <= 2}
              style={({ isActive }) => ({
                display: "flex", alignItems: "center", gap: 10,
                padding: collapsed ? "10px 16px" : "10px 12px",
                borderRadius: "var(--radius)", marginBottom: 2, textDecoration: "none",
                background: isActive ? "var(--teal-dim)" : "transparent",
                color: isActive ? "var(--teal)" : "var(--text-mute)",
                borderLeft: isActive ? "2px solid var(--teal)" : "2px solid transparent",
                fontWeight: isActive ? 600 : 400, fontSize: 13, transition: "all .15s",
              })}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>{item.icon}</span>
              {!collapsed && item.label}
            </NavLink>
          ))}
        </nav>

        {/* User info */}
        <div style={{ padding: collapsed ? "12px 8px" : "12px 16px", borderTop: "1px solid var(--border-light)" }}>
          {!collapsed && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", whiteSpace: "nowrap",
                overflow: "hidden", textOverflow: "ellipsis" }}>{user?.full_name}</div>
              <div style={{ fontSize: 11, marginTop: 2 }}>
                <span style={{ color: roleColor, fontWeight: 700, textTransform: "uppercase",
                  letterSpacing: ".06em" }}>{user?.role_display || "Admin"}</span>
              </div>
            </div>
          )}
          <button onClick={handleLogout}
            style={{ width: "100%", background: "none", border: "1px solid var(--border)", borderRadius: "var(--radius)",
              padding: collapsed ? "8px" : "7px 12px", color: "var(--text-mute)", fontSize: 12,
              cursor: "pointer", textAlign: collapsed ? "center" : "left" }}>
            {collapsed ? "⬅" : "← Logout"}
          </button>
        </div>

        {/* Collapse toggle */}
        <button onClick={() => setCollapsed(c => !c)}
          style={{ position: "absolute", top: 20, left: collapsed ? 48 : 204, width: 24, height: 24,
            background: "var(--card)", border: "1px solid var(--border)", borderRadius: "50%",
            cursor: "pointer", color: "var(--text-mute)", fontSize: 10, zIndex: 10,
            display: "flex", alignItems: "center", justifyContent: "center" }}>
          {collapsed ? "›" : "‹"}
        </button>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column" }}>
        <Outlet />
      </main>
    </div>
  );
}
