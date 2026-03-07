// LOCATION: HMS/frontend/src/pages/auth/Login.jsx

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../../api/auth";
import useAuthStore from "../../store/authStore";

export default function Login() {
  const [form, setForm]     = useState({ username: "", password: "" });
  const [error, setError]   = useState("");
  const [loading, setLoad]  = useState(false);
  const { setAuth }         = useAuthStore();
  const navigate            = useNavigate();

  const handle = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setLoad(true); setError("");
    try {
      const { data } = await login(form);
      setAuth(data.user, data.access, data.refresh);

      const role = data.user.is_tenant_admin ? "hospital_admin" : data.user.role;
      const redirects = {
        hospital_admin: "/admin",
        doctor:         "/doctor",
        nurse:          "/doctor",
        receptionist:   "/reception",
      };
      navigate(redirects[role] || "/reception");
    } catch (err) {
      setError(err.response?.data?.detail || "Invalid username or password.");
    } finally {
      setLoad(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex",
      alignItems: "center", justifyContent: "center", padding: 24, position: "relative", overflow: "hidden" }}>

      {/* Background decoration */}
      <div style={{ position: "absolute", top: -200, right: -200, width: 600, height: 600,
        borderRadius: "50%", background: "radial-gradient(circle, var(--teal)08 0%, transparent 70%)",
        pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: -200, left: -200, width: 500, height: 500,
        borderRadius: "50%", background: "radial-gradient(circle, var(--blue)06 0%, transparent 70%)",
        pointerEvents: "none" }} />

      <div style={{ width: "100%", maxWidth: 420, animation: "fadeUp .3s ease both" }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: "var(--teal)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26,
            margin: "0 auto 16px" }}>🏥</div>
          <div style={{ fontSize: 28, fontWeight: 800, fontFamily: "var(--font-display)",
            color: "var(--text)", letterSpacing: "-.02em" }}>HMS Portal</div>
          <div style={{ fontSize: 13, color: "var(--text-mute)", marginTop: 6 }}>
            Sign in to your hospital account
          </div>
        </div>

        {/* Form */}
        <form onSubmit={submit} style={{ background: "var(--card)", border: "1px solid var(--border)",
          borderRadius: 16, padding: 32, boxShadow: "var(--shadow)" }}>

          {error && (
            <div style={{ background: "var(--red)18", border: "1px solid var(--red)44", borderRadius: 8,
              padding: "10px 14px", color: "var(--red)", fontSize: 13, marginBottom: 20 }}>{error}</div>
          )}

          <div style={{ marginBottom: 18 }}>
            <label style={{ display: "block", fontSize: 11, color: "var(--text-mute)", marginBottom: 6,
              textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 600 }}>Username</label>
            <input name="username" value={form.username} onChange={handle} required autoFocus
              placeholder="Enter your username"
              style={{ width: "100%", background: "var(--surface)", border: "1px solid var(--border)",
                borderRadius: "var(--radius)", padding: "11px 14px", color: "var(--text)",
                outline: "none", boxSizing: "border-box", fontSize: 14 }} />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", fontSize: 11, color: "var(--text-mute)", marginBottom: 6,
              textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 600 }}>Password</label>
            <input name="password" type="password" value={form.password} onChange={handle} required
              placeholder="Enter your password"
              style={{ width: "100%", background: "var(--surface)", border: "1px solid var(--border)",
                borderRadius: "var(--radius)", padding: "11px 14px", color: "var(--text)",
                outline: "none", boxSizing: "border-box", fontSize: 14 }} />
          </div>

          <button type="submit" disabled={loading}
            style={{ width: "100%", background: "var(--teal)", border: "none", borderRadius: "var(--radius)",
              padding: "12px", color: "#080d14", fontSize: 15, fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer", opacity: loading ? .7 : 1,
              fontFamily: "var(--font-display)", letterSpacing: ".02em" }}>
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: 20, fontSize: 12, color: "var(--text-dim)" }}>
          Butwal Hospital Management System
        </div>
      </div>
    </div>
  );
}
