// LOCATION: HMS/frontend/src/components/ui/index.jsx

import { useState } from "react";

// ─── Badge ────────────────────────────────────────────────────────────────────
export const Badge = ({ label, color = "var(--teal)" }) => (
  <span style={{
    fontSize: 11, fontWeight: 700, letterSpacing: ".07em", padding: "2px 9px",
    borderRadius: 20, background: color + "22", color,
    border: `1px solid ${color}44`, textTransform: "uppercase", whiteSpace: "nowrap",
  }}>{label}</span>
);

// ─── Button ───────────────────────────────────────────────────────────────────
export const Btn = ({ children, onClick, variant = "primary", size = "md", disabled, type = "button", style = {} }) => {
  const styles = {
    primary:  { background: "var(--teal)",    color: "#080d14", border: "none" },
    secondary:{ background: "transparent",    color: "var(--text-mute)", border: "1px solid var(--border)" },
    danger:   { background: "var(--red)",     color: "#fff",    border: "none" },
    ghost:    { background: "var(--teal-dim)",color: "var(--teal)", border: "1px solid var(--teal)33" },
  };
  const sizes = {
    sm: { padding: "5px 14px", fontSize: 12 },
    md: { padding: "8px 20px", fontSize: 14 },
    lg: { padding: "11px 28px", fontSize: 15 },
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      style={{ ...styles[variant], ...sizes[size], borderRadius: "var(--radius)", fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? .5 : 1,
        transition: "all .15s", fontFamily: "var(--font-body)", ...style }}>
      {children}
    </button>
  );
};

// ─── Input ────────────────────────────────────────────────────────────────────
export const Field = ({ label, name, value, onChange, required, type = "text", options, placeholder, error }) => (
  <div style={{ marginBottom: 16 }}>
    {label && (
      <label style={{ display: "block", fontSize: 11, color: "var(--text-mute)", marginBottom: 5,
        textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 600 }}>
        {label}{required && <span style={{ color: "var(--red)" }}> *</span>}
      </label>
    )}
    {options ? (
      <select name={name} value={value} onChange={onChange}
        style={{ width: "100%", background: "var(--surface)", border: `1px solid ${error ? "var(--red)" : "var(--border)"}`,
          borderRadius: "var(--radius)", padding: "9px 12px", color: value ? "var(--text)" : "var(--text-dim)", outline: "none" }}>
        <option value="">Select…</option>
        {options.map((o) => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}
      </select>
    ) : (
      <input type={type} name={name} value={value} onChange={onChange} required={required} placeholder={placeholder}
        style={{ width: "100%", background: "var(--surface)", border: `1px solid ${error ? "var(--red)" : "var(--border)"}`,
          borderRadius: "var(--radius)", padding: "9px 12px", color: "var(--text)", outline: "none", boxSizing: "border-box" }} />
    )}
    {error && <div style={{ fontSize: 12, color: "var(--red)", marginTop: 4 }}>{error}</div>}
  </div>
);

// ─── Card ─────────────────────────────────────────────────────────────────────
export const Card = ({ children, style = {}, title, action }) => (
  <div style={{ background: "var(--card)", border: "1px solid var(--border)",
    borderRadius: 12, overflow: "hidden", ...style }}>
    {title && (
      <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border-light)",
        display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", fontFamily: "var(--font-display)",
          textTransform: "uppercase", letterSpacing: ".06em" }}>{title}</div>
        {action}
      </div>
    )}
    <div style={{ padding: 20 }}>{children}</div>
  </div>
);

// ─── Stat Card ────────────────────────────────────────────────────────────────
export const StatCard = ({ label, value, color = "var(--teal)", icon }) => (
  <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12,
    padding: "18px 20px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
    <div>
      <div style={{ fontSize: 28, fontWeight: 800, color, fontFamily: "var(--font-display)" }}>{value}</div>
      <div style={{ fontSize: 12, color: "var(--text-mute)", marginTop: 3 }}>{label}</div>
    </div>
    {icon && <div style={{ fontSize: 22, opacity: .5 }}>{icon}</div>}
  </div>
);

// ─── Modal ────────────────────────────────────────────────────────────────────
export const Modal = ({ open, onClose, title, children, width = 560 }) => {
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, background: "#000000bb", zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14,
        width: "100%", maxWidth: width, maxHeight: "90vh", overflow: "auto", boxShadow: "var(--shadow)",
        animation: "fadeUp .2s ease both" }}>
        <div style={{ padding: "18px 24px", borderBottom: "1px solid var(--border-light)",
          display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "var(--font-display)", color: "var(--text)" }}>{title}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-mute)",
            fontSize: 18, cursor: "pointer", padding: 4, lineHeight: 1 }}>✕</button>
        </div>
        <div style={{ padding: 24 }}>{children}</div>
      </div>
    </div>
  );
};

// ─── Alert ────────────────────────────────────────────────────────────────────
export const Alert = ({ message, type = "error" }) => {
  const colors = { error: "var(--red)", success: "var(--green)", warning: "var(--amber)", info: "var(--blue)" };
  const c = colors[type];
  if (!message) return null;
  return (
    <div style={{ background: c + "18", border: `1px solid ${c}44`, borderRadius: "var(--radius)",
      padding: "10px 14px", color: c, fontSize: 13, marginBottom: 16 }}>{message}</div>
  );
};

// ─── Spinner ──────────────────────────────────────────────────────────────────
export const Spinner = ({ size = 24 }) => (
  <div style={{ width: size, height: size, border: `2px solid var(--border)`,
    borderTop: `2px solid var(--teal)`, borderRadius: "50%",
    animation: "spin .7s linear infinite", margin: "0 auto" }}>
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

// ─── Empty State ──────────────────────────────────────────────────────────────
export const Empty = ({ icon = "📭", message = "No data found" }) => (
  <div style={{ textAlign: "center", padding: "48px 24px", color: "var(--text-mute)" }}>
    <div style={{ fontSize: 36, marginBottom: 10 }}>{icon}</div>
    <div>{message}</div>
  </div>
);

// ─── Info Row ─────────────────────────────────────────────────────────────────
export const InfoRow = ({ label, value }) => (
  <div style={{ marginBottom: 12 }}>
    <div style={{ fontSize: 11, color: "var(--text-dim)", textTransform: "uppercase",
      letterSpacing: ".08em", marginBottom: 2 }}>{label}</div>
    <div style={{ fontSize: 14, color: "var(--text)" }}>{value || <span style={{ color: "var(--text-dim)" }}>—</span>}</div>
  </div>
);

// ─── Tab Bar ──────────────────────────────────────────────────────────────────
export const Tabs = ({ tabs, active, onChange }) => (
  <div style={{ display: "flex", gap: 4, borderBottom: "1px solid var(--border)", marginBottom: 20 }}>
    {tabs.map((t) => (
      <button key={t.key} onClick={() => onChange(t.key)}
        style={{ background: "none", border: "none", padding: "10px 16px",
          color: active === t.key ? "var(--teal)" : "var(--text-mute)",
          borderBottom: active === t.key ? "2px solid var(--teal)" : "2px solid transparent",
          cursor: "pointer", fontSize: 13, fontWeight: active === t.key ? 600 : 400,
          transition: "all .15s", marginBottom: -1 }}>
        {t.label}
      </button>
    ))}
  </div>
);
