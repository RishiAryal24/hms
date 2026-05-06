import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import useAuthStore from "../store/authStore";
import { logout } from "../api/auth";

const NAV = {
  receptionist: [
    { to: "/reception", icon: "D", label: "Dashboard" },
    { to: "/reception/patients", icon: "P", label: "Patients" },
    { to: "/reception/appointments", icon: "A", label: "Appointments" },
    { to: "/reception/ipd", icon: "I", label: "IPD" },
  ],
  doctor: [
    { to: "/doctor", icon: "D", label: "Dashboard" },
    { to: "/doctor/patients", icon: "P", label: "My Patients" },
    { to: "/doctor/appointments", icon: "A", label: "Appointments" },
  ],
  hospital_admin: [
    { to: "/admin", icon: "D", label: "Dashboard" },
    { to: "/admin/staff", icon: "S", label: "Staff" },
    { to: "/admin/ipd", icon: "I", label: "IPD" },
    { to: "/admin/patients", icon: "P", label: "Patients" },
    { to: "/admin/appointments", icon: "A", label: "Appointments" },
  ],
  nurse: [
    { to: "/doctor", icon: "D", label: "Dashboard" },
    { to: "/doctor/patients", icon: "P", label: "Patients" },
    { to: "/doctor/appointments", icon: "A", label: "Appointments" },
  ],
};

export default function AppLayout() {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const role = user?.is_tenant_admin ? "hospital_admin" : user?.role;
  const navItems = NAV[role] || NAV.receptionist;

  const handleLogout = async () => {
    try {
      const refresh = localStorage.getItem("refresh");
      await logout(refresh);
    } catch {
      // Logging out locally is still correct if the token is already invalid.
    }
    clearAuth();
    navigate("/login");
  };

  const roleColors = {
    hospital_admin: "var(--teal)",
    doctor: "var(--blue)",
    nurse: "var(--purple)",
    receptionist: "var(--amber)",
  };
  const roleColor = roleColors[role] || "var(--teal)";

  return (
    <div className="app-shell">
      <aside className="app-sidebar" style={{ width: collapsed ? 64 : 220 }}>
        <div className="sidebar-brand">
          <div className="brand-mark">H</div>
          {!collapsed && (
            <div>
              <div className="brand-title">HMS</div>
              <div className="brand-subtitle">Hospital System</div>
            </div>
          )}
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to.split("/").length <= 2}
              className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""} ${collapsed ? "collapsed" : ""}`}>
              <span className="sidebar-icon">{item.icon}</span>
              {!collapsed && item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-user">
          {!collapsed && (
            <div className="user-summary">
              <div className="user-name">{user?.full_name || user?.username}</div>
              <div className="user-role" style={{ color: roleColor }}>{user?.role_display || "Admin"}</div>
            </div>
          )}
          <button onClick={handleLogout} className="logout-button">
            {collapsed ? "Out" : "Logout"}
          </button>
        </div>

        <button onClick={() => setCollapsed((current) => !current)} className="collapse-button"
          style={{ left: collapsed ? 48 : 204 }}>
          {collapsed ? ">" : "<"}
        </button>
      </aside>

      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
