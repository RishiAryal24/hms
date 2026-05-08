import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../../api/auth";
import useAuthStore from "../../store/authStore";

export default function Login() {
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoad] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const handle = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    setLoad(true);
    setError("");
    try {
      const { data } = await login(form);
      setAuth(data.user, data.access, data.refresh);

      const role = data.user.is_tenant_admin ? "hospital_admin" : data.user.role;
      const redirects = {
        hospital_admin: "/admin",
        doctor: "/doctor",
        nurse: "/doctor",
        receptionist: "/reception",
        billing_staff: "/billing",
        lab_technician: "/lab",
      };
      navigate(redirects[role] || "/reception");
    } catch (err) {
      setError(err.response?.data?.detail || "Invalid username or password.");
    } finally {
      setLoad(false);
    }
  };

  return (
    <div className="login-screen">
      <section className="login-hero">
        <div className="login-brand">
          <div className="login-brand-mark">H</div>
          <div>
            <div className="login-brand-title">Butwal Hospital</div>
            <div className="login-brand-subtitle">Hospital management system</div>
          </div>
        </div>

        <div className="login-copy">
          <div className="login-kicker">Clinical operations portal</div>
          <h1>One workspace for care, billing, and inpatient flow.</h1>
          <p>
            Manage appointments, IPD rounds, doctor orders, discharge billing, and staff activity from a focused hospital dashboard.
          </p>
        </div>

        <div className="login-metrics">
          <div className="login-metric">
            <strong>IPD</strong>
            <span>Rounds, vitals, orders</span>
          </div>
          <div className="login-metric">
            <strong>OPD</strong>
            <span>Appointments and queues</span>
          </div>
          <div className="login-metric">
            <strong>Billing</strong>
            <span>Invoices and receipts</span>
          </div>
        </div>
      </section>

      <section className="login-panel-wrap">
        <form onSubmit={submit} className="login-panel">
          <h2>Welcome Back</h2>
          <div className="login-panel-subtitle">Sign in with your hospital account.</div>

          {error && <div className="alert" style={{ "--alert-color": "var(--red)" }}>{error}</div>}

          <div className="login-form-group">
            <label>Username</label>
            <input
              name="username"
              value={form.username}
              onChange={handle}
              required
              autoFocus
              placeholder="Enter username"
              className="login-input"
            />
          </div>

          <div className="login-form-group">
            <label>Password</label>
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={handle}
              required
              placeholder="Enter password"
              className="login-input"
            />
          </div>

          <button type="submit" disabled={loading} className="login-submit">
            {loading ? "Signing in..." : "Sign In"}
          </button>

          <div className="login-footer">Secure access for authorized hospital staff.</div>
        </form>
      </section>
    </div>
  );
}
