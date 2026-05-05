export const Badge = ({ label, color = "var(--teal)" }) => (
  <span className="badge" style={{ "--badge-color": color }}>
    {label}
  </span>
);

export const Btn = ({ children, onClick, variant = "primary", size = "md", disabled, type = "button", style = {} }) => (
  <button type={type} onClick={onClick} disabled={disabled}
    className={`btn btn-${variant} btn-${size}`} style={style}>
    {children}
  </button>
);

export const Field = ({ label, name, value, onChange, required, type = "text", options, placeholder, error }) => (
  <div className="field">
    {label && (
      <label className="field-label">
        {label}{required && <span className="required"> *</span>}
      </label>
    )}
    {options ? (
      <select name={name} value={value} onChange={onChange}
        className={`field-control ${error ? "field-error" : ""}`}>
        <option value="">Select...</option>
        {options.map((option) => (
          <option key={option.value ?? option} value={option.value ?? option}>
            {option.label ?? option}
          </option>
        ))}
      </select>
    ) : (
      <input type={type} name={name} value={value} onChange={onChange} required={required}
        placeholder={placeholder} className={`field-control ${error ? "field-error" : ""}`} />
    )}
    {error && <div className="field-message">{error}</div>}
  </div>
);

export const Card = ({ children, style = {}, title, action }) => (
  <div className="card" style={style}>
    {title && (
      <div className="card-header">
        <div className="card-title">{title}</div>
        {action}
      </div>
    )}
    <div className="card-body">{children}</div>
  </div>
);

export const StatCard = ({ label, value, color = "var(--teal)", icon }) => (
  <div className="stat-card">
    <div>
      <div className="stat-value" style={{ color }}>{value}</div>
      <div className="stat-label">{label}</div>
    </div>
    {icon && <div className="stat-icon">{icon}</div>}
  </div>
);

export const Modal = ({ open, onClose, title, children, width = 560 }) => {
  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal-panel" style={{ maxWidth: width }}>
        <div className="modal-header">
          <div className="modal-title">{title}</div>
          <button onClick={onClose} className="icon-button" aria-label="Close">x</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
};

export const Alert = ({ message, type = "error" }) => {
  if (!message) return null;
  const colors = { error: "var(--red)", success: "var(--green)", warning: "var(--amber)", info: "var(--blue)" };
  return <div className="alert" style={{ "--alert-color": colors[type] }}>{message}</div>;
};

export const Spinner = ({ size = 24 }) => (
  <div className="spinner" style={{ width: size, height: size }} />
);

export const Empty = ({ icon = "-", message = "No data found" }) => (
  <div className="empty-state">
    <div className="empty-icon">{icon}</div>
    <div>{message}</div>
  </div>
);

export const InfoRow = ({ label, value }) => (
  <div className="info-row">
    <div className="info-label">{label}</div>
    <div className="info-value">{value || <span className="muted">-</span>}</div>
  </div>
);

export const Tabs = ({ tabs, active, onChange }) => (
  <div className="tabs">
    {tabs.map((tab) => (
      <button key={tab.key} onClick={() => onChange(tab.key)}
        className={`tab ${active === tab.key ? "active" : ""}`}>
        {tab.label}
      </button>
    ))}
  </div>
);
