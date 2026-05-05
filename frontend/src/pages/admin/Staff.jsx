// LOCATION: HMS/frontend/src/pages/admin/Staff.jsx

import { useEffect, useState } from "react";
import { getStaff, createStaff, updateStaff, deleteStaff, getRoles, resetPassword } from "../../api/auth";
import { Badge, Btn, Modal, Field, Spinner, Empty, Alert } from "../../components/ui";

const ROLE_COLOR = { doctor:"var(--blue)", nurse:"var(--purple)", receptionist:"var(--amber)", hospital_admin:"var(--teal)", billing_staff:"var(--green)", pharmacist:"var(--red)", lab_technician:"var(--text-mute)" };

const EMPTY_FORM = { username:"", password:"", first_name:"", last_name:"", email:"", role:"", phone:"", department:"", employee_id:"", is_tenant_admin: false };

export default function Staff() {
  const [staff, setStaff]     = useState([]);
  const [roles, setRoles]     = useState([]);
  const [loading, setLoad]    = useState(true);
  const [showModal, setModal] = useState(false);
  const [editId, setEditId]   = useState(null);
  const [form, setForm]       = useState(EMPTY_FORM);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState("");
  const [success, setSuccess] = useState("");
  const [resetId, setResetId] = useState(null);
  const [newPw, setNewPw]     = useState("");

  const load = () => {
    setLoad(true);
    getStaff().then(r => setStaff(r.data.results || r.data)).finally(() => setLoad(false));
  };

  useEffect(() => {
    load();
    getRoles().then(r => setRoles(r.data.results || r.data));
  }, []);

  const handle = (e) => {
    const val = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm(p => ({ ...p, [e.target.name]: val }));
  };

  const openAdd  = () => { setForm(EMPTY_FORM); setEditId(null); setError(""); setModal(true); };
  const openEdit = (s) => {
    setForm({ ...s, password: "", role: s.role || "" });
    setEditId(s.id); setError(""); setModal(true);
  };

  const submit = async () => {
    setSaving(true); setError("");
    try {
      if (editId) {
        const rest = { ...form };
        delete rest.password;
        delete rest.username;
        await updateStaff(editId, rest);
        setSuccess("Staff updated successfully.");
      } else {
        await createStaff(form);
        setSuccess("Staff created successfully.");
      }
      setModal(false); load();
    } catch (err) {
      const d = err.response?.data;
      setError(typeof d === "object" ? Object.values(d).flat().join(" ") : "Operation failed.");
    } finally {
      setSaving(false);
    }
  };

  const deactivate = async (id) => {
    if (!confirm("Deactivate this staff member?")) return;
    await deleteStaff(id);
    load();
  };

  const doReset = async () => {
    try {
      await resetPassword(resetId, { new_password: newPw });
      setResetId(null); setNewPw("");
      setSuccess("Password reset successfully.");
    } catch (err) {
      alert(err.response?.data?.error || "Failed.");
    }
  };

  const roleOpts = roles.map(r => ({ value: r.id, label: r.get_name_display || r.name }));

  return (
    <div className="page-enter" style={{ padding: 28 }}>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "var(--font-display)" }}>Staff Management</div>
          <div style={{ fontSize: 13, color: "var(--text-mute)", marginTop: 2 }}>{staff.length} members</div>
        </div>
        <Btn onClick={openAdd}>Add Staff</Btn>
      </div>

      {success && <Alert message={success} type="success" />}

      {loading ? <Spinner /> : staff.length === 0 ? <Empty icon="👤" message="No staff members yet" /> : (
        <div className="table-shell" style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Name","Username","Role","Department","Employee ID","Phone","Status",""].map(h => (
                  <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 11,
                    color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: ".07em", fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {staff.map(s => (
                <tr key={s.id} style={{ borderBottom: "1px solid var(--border-light)" }}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--surface)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{s.full_name || `${s.first_name} ${s.last_name}`}</div>
                    <div style={{ fontSize: 11, color: "var(--text-mute)" }}>{s.email}</div>
                  </td>
                  <td style={{ padding: "12px 16px", color: "var(--text-mute)", fontSize: 13 }}>{s.username}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <Badge label={s.role_display || s.role_name || "—"} color={ROLE_COLOR[s.role_name] || "var(--text-mute)"} />
                    {s.is_tenant_admin && <Badge label="Admin" color="var(--teal)" />}
                  </td>
                  <td style={{ padding: "12px 16px", color: "var(--text-mute)", fontSize: 13 }}>{s.department || "—"}</td>
                  <td style={{ padding: "12px 16px", color: "var(--text-mute)", fontSize: 13 }}>{s.employee_id || "—"}</td>
                  <td style={{ padding: "12px 16px", color: "var(--text-mute)", fontSize: 13 }}>{s.phone || "—"}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <Badge label={s.is_active ? "Active" : "Inactive"} color={s.is_active ? "var(--green)" : "var(--text-mute)"} />
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => openEdit(s)}
                        style={{ background: "var(--teal-dim)", border: "none", borderRadius: 6,
                          padding: "5px 10px", color: "var(--teal)", fontSize: 12, cursor: "pointer" }}>Edit</button>
                      <button onClick={() => setResetId(s.id)}
                        style={{ background: "var(--blue)18", border: "none", borderRadius: 6,
                          padding: "5px 10px", color: "var(--blue)", fontSize: 12, cursor: "pointer" }}>Reset PW</button>
                      {s.is_active && (
                        <button onClick={() => deactivate(s.id)}
                          style={{ background: "var(--red)18", border: "none", borderRadius: 6,
                            padding: "5px 10px", color: "var(--red)", fontSize: 12, cursor: "pointer" }}>Deactivate</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal open={showModal} onClose={() => setModal(false)} title={editId ? "Edit Staff" : "Add Staff"} width={560}>
        {error && <Alert message={error} />}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
          {!editId && <Field label="Username" name="username" value={form.username} onChange={handle} required />}
          {!editId && <Field label="Password" name="password" value={form.password} onChange={handle} required type="password" />}
          <Field label="First Name"   name="first_name"   value={form.first_name}   onChange={handle} required />
          <Field label="Last Name"    name="last_name"    value={form.last_name}    onChange={handle} required />
          <div style={{ gridColumn: "span 2" }}>
            <Field label="Email"      name="email"        value={form.email}        onChange={handle} type="email" />
          </div>
          <Field label="Role"         name="role"         value={form.role}         onChange={handle} options={roleOpts} />
          <Field label="Phone"        name="phone"        value={form.phone}        onChange={handle} />
          <Field label="Department"   name="department"   value={form.department}   onChange={handle} />
          <Field label="Employee ID"  name="employee_id"  value={form.employee_id}  onChange={handle} />
          <div style={{ gridColumn: "span 2", display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <input type="checkbox" name="is_tenant_admin" checked={form.is_tenant_admin} onChange={handle} id="ta" />
            <label htmlFor="ta" style={{ fontSize: 13, color: "var(--text-mute)" }}>Is Hospital Admin</label>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 16, borderTop: "1px solid var(--border-light)" }}>
          <Btn variant="secondary" onClick={() => setModal(false)}>Cancel</Btn>
          <Btn onClick={submit} disabled={saving}>{saving ? "Saving…" : editId ? "Update" : "Create Staff"}</Btn>
        </div>
      </Modal>

      {/* Reset Password Modal */}
      <Modal open={!!resetId} onClose={() => setResetId(null)} title="Reset Password" width={380}>
        <Field label="New Password" name="new_password" value={newPw}
          onChange={e => setNewPw(e.target.value)} type="password" required />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
          <Btn variant="secondary" onClick={() => setResetId(null)}>Cancel</Btn>
          <Btn onClick={doReset} disabled={newPw.length < 8}>Reset Password</Btn>
        </div>
      </Modal>
    </div>
  );
}
