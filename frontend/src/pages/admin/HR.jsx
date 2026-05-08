import { useCallback, useEffect, useState } from "react";
import { createStaff, deleteStaff, getRoles, getStaff, resetPassword, updateStaff } from "../../api/auth";
import {
  createAttendance,
  createEmployee,
  createLeave,
  createRoster,
  getAttendance,
  getEmployees,
  getHROptions,
  getHRSummary,
  getLeaves,
  getRosters,
  updateLeave,
} from "../../api/hr";
import { Alert, Badge, Btn, Card, Empty, Field, Modal, Spinner, Tabs } from "../../components/ui";
import useAuthStore from "../../store/authStore";

const EMPLOYMENT_TYPES = ["permanent", "contract", "visiting", "intern", "other"].map((value) => ({ value, label: value.replace("_", " ") }));
const EMPLOYMENT_STATUSES = ["active", "on_leave", "suspended", "resigned"].map((value) => ({ value, label: value.replace("_", " ") }));
const SHIFTS = ["morning", "evening", "night", "on_call"].map((value) => ({ value, label: value.replace("_", " ") }));
const LOCATIONS = ["opd", "ipd", "lab", "pharmacy", "ot", "reception", "billing", "admin", "other"].map((value) => ({ value, label: value.toUpperCase() }));

const ROLE_COLOR = { doctor:"var(--blue)", nurse:"var(--purple)", receptionist:"var(--amber)", hospital_admin:"var(--teal)", billing_staff:"var(--green)", pharmacist:"var(--red)", lab_technician:"var(--text-mute)" };
const STATUS_COLOR = { active: "var(--green)", on_leave: "var(--amber)", suspended: "var(--red)", resigned: "var(--text-mute)" };
const SHIFT_COLOR = { morning: "var(--blue)", evening: "var(--amber)", night: "var(--purple)", on_call: "var(--green)" };
const ATTENDANCE_STATUSES = ["present", "absent", "late", "half_day"].map((value) => ({ value, label: value.replace("_", " ") }));
const ATTENDANCE_COLOR = { present: "var(--green)", absent: "var(--red)", late: "var(--amber)", half_day: "var(--blue)" };
const LEAVE_TYPES = ["sick", "annual", "emergency", "unpaid", "other"].map((value) => ({ value, label: value }));
const LEAVE_STATUS_COLOR = { pending: "var(--amber)", approved: "var(--green)", rejected: "var(--red)" };

const emptyStaff = { username:"", password:"", first_name:"", last_name:"", email:"", role:"", phone:"", department:"", employee_id:"", is_tenant_admin: false };
const emptyEmployee = { user: "", employee_code: "", employment_type: "permanent", status: "active", joining_date: "", designation: "", emergency_contact: "", address: "", notes: "" };
const emptyRoster = { employee: "", duty_date: "", shift: "morning", location: "opd", department: "", start_time: "", end_time: "", notes: "" };
const emptyAttendance = { employee: "", roster: "", attendance_date: new Date().toISOString().slice(0, 10), status: "present", check_in: "", check_out: "", notes: "" };
const emptyLeave = { employee: "", leave_type: "sick", start_date: "", end_date: "", reason: "", status: "pending", decision_notes: "" };

export default function HR() {
  const { user } = useAuthStore();
  const [tab, setTab] = useState("staff");
  const [summary, setSummary] = useState(null);
  const [staff, setStaff] = useState([]);
  const [roles, setRoles] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [rosters, setRosters] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [staffOptions, setStaffOptions] = useState([]);
  const [staffModal, setStaffModal] = useState(false);
  const [employeeModal, setEmployeeModal] = useState(false);
  const [rosterModal, setRosterModal] = useState(false);
  const [attendanceModal, setAttendanceModal] = useState(false);
  const [leaveModal, setLeaveModal] = useState(false);
  const [staffForm, setStaffForm] = useState(emptyStaff);
  const [staffEditId, setStaffEditId] = useState(null);
  const [resetId, setResetId] = useState(null);
  const [newPw, setNewPw] = useState("");
  const [employeeForm, setEmployeeForm] = useState(emptyEmployee);
  const [rosterForm, setRosterForm] = useState(emptyRoster);
  const [attendanceForm, setAttendanceForm] = useState(emptyAttendance);
  const [leaveForm, setLeaveForm] = useState(emptyLeave);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const canManage = !!(user?.is_tenant_admin || user?.is_superuser);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [summaryRes, employeeRes, rosterRes, attendanceRes, leaveRes, optionRes, staffRes, roleRes] = await Promise.all([
        getHRSummary(),
        getEmployees(),
        getRosters(),
        getAttendance(),
        getLeaves(),
        getHROptions(),
        getStaff(),
        getRoles(),
      ]);
      setSummary(summaryRes.data);
      setEmployees(employeeRes.data.results || employeeRes.data);
      setRosters(rosterRes.data.results || rosterRes.data);
      setAttendance(attendanceRes.data.results || attendanceRes.data);
      setLeaves(leaveRes.data.results || leaveRes.data);
      setStaffOptions(optionRes.data.staff || []);
      setStaff(staffRes.data.results || staffRes.data);
      setRoles(roleRes.data.results || roleRes.data);
    } catch {
      setError("Unable to load HR data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const roleChoices = roles.map((role) => ({ value: role.id, label: role.get_name_display || role.name }));
  const staffChoices = staffOptions.map((person) => ({ value: person.id, label: `${person.full_name || person.username} (${person.role_display || person.role_name || "Staff"})` }));
  const employeeChoices = employees
    .filter((employee) => employee.status === "active" || employee.status === "on_leave")
    .map((employee) => ({ value: employee.id, label: `${employee.user_detail?.full_name || employee.employee_code} (${employee.employee_code})` }));
  const rosterChoices = rosters.map((roster) => ({
    value: roster.id,
    label: `${roster.employee_detail?.user_detail?.full_name || roster.employee_detail?.employee_code} - ${roster.duty_date} ${roster.shift}`,
  }));

  const handleStaff = (event) => {
    const value = event.target.type === "checkbox" ? event.target.checked : event.target.value;
    setStaffForm((current) => ({ ...current, [event.target.name]: value }));
  };
  const handleEmployee = (event) => setEmployeeForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const handleRoster = (event) => setRosterForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const handleAttendance = (event) => setAttendanceForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const handleLeave = (event) => setLeaveForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  const openStaffAdd = () => {
    setStaffForm(emptyStaff);
    setStaffEditId(null);
    setStaffModal(true);
  };

  const openStaffEdit = (person) => {
    setStaffForm({ ...person, password: "", role: person.role || "" });
    setStaffEditId(person.id);
    setStaffModal(true);
  };

  const saveStaff = async () => {
    setSaving(true);
    setError("");
    try {
      if (staffEditId) {
        const payload = { ...staffForm };
        delete payload.username;
        delete payload.password;
        await updateStaff(staffEditId, payload);
        setSuccess("Staff account updated.");
      } else {
        await createStaff(staffForm);
        setSuccess("Staff account created.");
      }
      setStaffModal(false);
      setStaffForm(emptyStaff);
      setStaffEditId(null);
      load();
    } catch (err) {
      setError(formatError(err));
    } finally {
      setSaving(false);
    }
  };

  const deactivateStaff = async (person) => {
    if (!confirm(`Deactivate ${person.full_name || person.username}?`)) return;
    setError("");
    try {
      await deleteStaff(person.id);
      setSuccess("Staff account deactivated.");
      load();
    } catch (err) {
      setError(formatError(err));
    }
  };

  const saveResetPassword = async () => {
    setError("");
    try {
      await resetPassword(resetId, { new_password: newPw });
      setResetId(null);
      setNewPw("");
      setSuccess("Password reset successfully.");
    } catch (err) {
      setError(formatError(err));
    }
  };

  const saveEmployee = async () => {
    setSaving(true);
    setError("");
    try {
      await createEmployee({ ...employeeForm, joining_date: employeeForm.joining_date || null });
      setEmployeeModal(false);
      setEmployeeForm(emptyEmployee);
      setSuccess("Employee profile created.");
      load();
    } catch (err) {
      setError(formatError(err));
    } finally {
      setSaving(false);
    }
  };

  const saveRoster = async () => {
    setSaving(true);
    setError("");
    try {
      await createRoster({ ...rosterForm, start_time: rosterForm.start_time || null, end_time: rosterForm.end_time || null });
      setRosterModal(false);
      setRosterForm(emptyRoster);
      setSuccess("Duty roster assigned.");
      load();
    } catch (err) {
      setError(formatError(err));
    } finally {
      setSaving(false);
    }
  };

  const saveAttendance = async () => {
    setSaving(true);
    setError("");
    try {
      await createAttendance({
        ...attendanceForm,
        roster: attendanceForm.roster || null,
        check_in: attendanceForm.check_in || null,
        check_out: attendanceForm.check_out || null,
      });
      setAttendanceModal(false);
      setAttendanceForm(emptyAttendance);
      setSuccess("Attendance recorded.");
      load();
    } catch (err) {
      setError(formatError(err));
    } finally {
      setSaving(false);
    }
  };

  const saveLeave = async () => {
    setSaving(true);
    setError("");
    try {
      await createLeave(leaveForm);
      setLeaveModal(false);
      setLeaveForm(emptyLeave);
      setSuccess("Leave request created.");
      load();
    } catch (err) {
      setError(formatError(err));
    } finally {
      setSaving(false);
    }
  };

  const decideLeave = async (leave, status) => {
    setError("");
    try {
      await updateLeave(leave.id, { status });
      setSuccess(`Leave ${status}.`);
      load();
    } catch (err) {
      setError(formatError(err));
    }
  };

  return (
    <div className="page-enter" style={{ padding: 28 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "var(--font-display)" }}>HR</div>
          <div style={{ fontSize: 13, color: "var(--text-mute)", marginTop: 2 }}>Staff accounts, employee profiles, employment status, and duty rosters</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {canManage && <Btn variant="secondary" onClick={openStaffAdd}>Add Staff</Btn>}
          {canManage && <Btn variant="secondary" onClick={() => setEmployeeModal(true)}>Add Employee</Btn>}
          {canManage && <Btn variant="secondary" onClick={() => setRosterModal(true)}>Assign Duty</Btn>}
          {canManage && <Btn variant="secondary" onClick={() => setLeaveModal(true)}>Add Leave</Btn>}
          {canManage && <Btn onClick={() => setAttendanceModal(true)}>Mark Attendance</Btn>}
        </div>
      </div>

      {error && <Alert message={error} />}
      {success && <Alert message={success} type="success" />}

      <div className="dashboard-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        <Card><Metric label="Staff Accounts" value={staff.length} /></Card>
        <Card><Metric label="Active Employees" value={summary?.active || 0} color="var(--green)" /></Card>
        <Card><Metric label="Present Today" value={summary?.present_today || 0} color="var(--green)" /></Card>
        <Card><Metric label="Absent Today" value={summary?.absent_today || 0} color="var(--red)" /></Card>
        <Card><Metric label="Pending Leave" value={summary?.pending_leave || 0} color="var(--amber)" /></Card>
      </div>

      <Tabs tabs={[
        { key: "staff", label: "Staff Accounts" },
        { key: "employees", label: "Employees" },
        { key: "rosters", label: "Duty Roster" },
        { key: "attendance", label: "Attendance" },
        { key: "leaves", label: "Leave" },
      ]} active={tab} onChange={setTab} />

      {loading ? <Spinner /> : tab === "staff" ? (
        <StaffTable staff={staff} onEdit={openStaffEdit} onReset={setResetId} onDeactivate={deactivateStaff} />
      ) : tab === "employees" ? (
        <EmployeesTable employees={employees} />
      ) : tab === "rosters" ? (
        <RostersTable rosters={rosters} />
      ) : tab === "attendance" ? (
        <AttendanceTable attendance={attendance} />
      ) : (
        <LeaveTable leaves={leaves} onApprove={(leave) => decideLeave(leave, "approved")} onReject={(leave) => decideLeave(leave, "rejected")} />
      )}

      <Modal open={staffModal} onClose={() => setStaffModal(false)} title={staffEditId ? "Edit Staff Account" : "Add Staff Account"} width={620}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {!staffEditId && <Field label="Username" name="username" value={staffForm.username} onChange={handleStaff} required />}
          {!staffEditId && <Field label="Password" name="password" value={staffForm.password} onChange={handleStaff} type="password" required />}
          <Field label="First Name" name="first_name" value={staffForm.first_name} onChange={handleStaff} required />
          <Field label="Last Name" name="last_name" value={staffForm.last_name} onChange={handleStaff} required />
          <Field label="Email" name="email" value={staffForm.email} onChange={handleStaff} type="email" />
          <Field label="Role" name="role" value={staffForm.role} onChange={handleStaff} options={roleChoices} />
          <Field label="Phone" name="phone" value={staffForm.phone} onChange={handleStaff} />
          <Field label="Department" name="department" value={staffForm.department} onChange={handleStaff} />
          <Field label="Employee ID" name="employee_id" value={staffForm.employee_id} onChange={handleStaff} />
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, color: "var(--text-mute)", fontSize: 13 }}>
          <input type="checkbox" name="is_tenant_admin" checked={staffForm.is_tenant_admin} onChange={handleStaff} />
          Hospital admin
        </label>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <Btn variant="secondary" onClick={() => setStaffModal(false)}>Cancel</Btn>
          <Btn onClick={saveStaff} disabled={saving || !staffForm.first_name || !staffForm.last_name || (!staffEditId && (!staffForm.username || !staffForm.password))}>
            {staffEditId ? "Update Staff" : "Create Staff"}
          </Btn>
        </div>
      </Modal>

      <Modal open={employeeModal} onClose={() => setEmployeeModal(false)} title="Add Employee Profile" width={640}>
        <Field label="Staff User" name="user" value={employeeForm.user} onChange={handleEmployee} options={staffChoices} required />
        {!staffChoices.length && <Alert type="warning" message="All active staff already have HR profiles. Create staff from HR staff accounts first." />}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Employee Code" name="employee_code" value={employeeForm.employee_code} onChange={handleEmployee} required />
          <Field label="Designation" name="designation" value={employeeForm.designation} onChange={handleEmployee} />
          <Field label="Employment Type" name="employment_type" value={employeeForm.employment_type} onChange={handleEmployee} options={EMPLOYMENT_TYPES} />
          <Field label="Status" name="status" value={employeeForm.status} onChange={handleEmployee} options={EMPLOYMENT_STATUSES} />
          <Field label="Joining Date" name="joining_date" type="date" value={employeeForm.joining_date} onChange={handleEmployee} />
          <Field label="Emergency Contact" name="emergency_contact" value={employeeForm.emergency_contact} onChange={handleEmployee} />
        </div>
        <Field label="Address" name="address" value={employeeForm.address} onChange={handleEmployee} />
        <Field label="Notes" name="notes" value={employeeForm.notes} onChange={handleEmployee} />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <Btn variant="secondary" onClick={() => setEmployeeModal(false)}>Cancel</Btn>
          <Btn onClick={saveEmployee} disabled={saving || !employeeForm.user || !employeeForm.employee_code}>Save Employee</Btn>
        </div>
      </Modal>

      <Modal open={rosterModal} onClose={() => setRosterModal(false)} title="Assign Duty" width={620}>
        <Field label="Employee" name="employee" value={rosterForm.employee} onChange={handleRoster} options={employeeChoices} required />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Duty Date" name="duty_date" type="date" value={rosterForm.duty_date} onChange={handleRoster} required />
          <Field label="Shift" name="shift" value={rosterForm.shift} onChange={handleRoster} options={SHIFTS} />
          <Field label="Location" name="location" value={rosterForm.location} onChange={handleRoster} options={LOCATIONS} />
          <Field label="Department" name="department" value={rosterForm.department} onChange={handleRoster} />
          <Field label="Start Time" name="start_time" type="time" value={rosterForm.start_time} onChange={handleRoster} />
          <Field label="End Time" name="end_time" type="time" value={rosterForm.end_time} onChange={handleRoster} />
        </div>
        <Field label="Notes" name="notes" value={rosterForm.notes} onChange={handleRoster} />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <Btn variant="secondary" onClick={() => setRosterModal(false)}>Cancel</Btn>
          <Btn onClick={saveRoster} disabled={saving || !rosterForm.employee || !rosterForm.duty_date}>Assign Duty</Btn>
        </div>
      </Modal>

      <Modal open={attendanceModal} onClose={() => setAttendanceModal(false)} title="Mark Attendance" width={620}>
        <Field label="Employee" name="employee" value={attendanceForm.employee} onChange={handleAttendance} options={employeeChoices} required />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Roster" name="roster" value={attendanceForm.roster} onChange={handleAttendance} options={rosterChoices} />
          <Field label="Date" name="attendance_date" type="date" value={attendanceForm.attendance_date} onChange={handleAttendance} required />
          <Field label="Status" name="status" value={attendanceForm.status} onChange={handleAttendance} options={ATTENDANCE_STATUSES} />
          <Field label="Check In" name="check_in" type="time" value={attendanceForm.check_in} onChange={handleAttendance} />
          <Field label="Check Out" name="check_out" type="time" value={attendanceForm.check_out} onChange={handleAttendance} />
        </div>
        <Field label="Notes" name="notes" value={attendanceForm.notes} onChange={handleAttendance} />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <Btn variant="secondary" onClick={() => setAttendanceModal(false)}>Cancel</Btn>
          <Btn onClick={saveAttendance} disabled={saving || !attendanceForm.employee || !attendanceForm.attendance_date}>Save Attendance</Btn>
        </div>
      </Modal>

      <Modal open={leaveModal} onClose={() => setLeaveModal(false)} title="Create Leave Request" width={620}>
        <Field label="Employee" name="employee" value={leaveForm.employee} onChange={handleLeave} options={employeeChoices} required />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Leave Type" name="leave_type" value={leaveForm.leave_type} onChange={handleLeave} options={LEAVE_TYPES} />
          <Field label="Start Date" name="start_date" type="date" value={leaveForm.start_date} onChange={handleLeave} required />
          <Field label="End Date" name="end_date" type="date" value={leaveForm.end_date} onChange={handleLeave} required />
        </div>
        <Field label="Reason" name="reason" value={leaveForm.reason} onChange={handleLeave} />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <Btn variant="secondary" onClick={() => setLeaveModal(false)}>Cancel</Btn>
          <Btn onClick={saveLeave} disabled={saving || !leaveForm.employee || !leaveForm.start_date || !leaveForm.end_date}>Create Leave</Btn>
        </div>
      </Modal>

      <Modal open={!!resetId} onClose={() => setResetId(null)} title="Reset Password" width={420}>
        <Field label="New Password" name="new_password" value={newPw} onChange={(event) => setNewPw(event.target.value)} type="password" required />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <Btn variant="secondary" onClick={() => setResetId(null)}>Cancel</Btn>
          <Btn onClick={saveResetPassword} disabled={newPw.length < 8}>Reset Password</Btn>
        </div>
      </Modal>
    </div>
  );
}

function StaffTable({ staff, onEdit, onReset, onDeactivate }) {
  if (!staff.length) return <Empty icon="ST" message="No staff accounts yet" />;
  return (
    <div className="table-shell" style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr>{["Name", "Username", "Role", "Department", "Employee ID", "Status", "Actions"].map((head) => <Th key={head}>{head}</Th>)}</tr></thead>
        <tbody>
          {staff.map((person) => (
            <tr key={person.id} style={{ borderBottom: "1px solid var(--border-light)" }}>
              <Td><div style={{ fontWeight: 700, color: "var(--card-ink)" }}>{person.full_name || person.username}</div><div style={{ color: "var(--text-mute)", fontSize: 12 }}>{person.email || "-"}</div></Td>
              <Td>{person.username}</Td>
              <Td><div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}><Badge label={person.role_display || person.role_name || "-"} color={ROLE_COLOR[person.role_name] || "var(--text-mute)"} />{person.is_tenant_admin && <Badge label="admin" color="var(--teal)" />}</div></Td>
              <Td>{person.department || "-"}</Td>
              <Td>{person.employee_id || "-"}</Td>
              <Td><Badge label={person.is_active ? "active" : "inactive"} color={person.is_active ? "var(--green)" : "var(--text-mute)"} /></Td>
              <Td><div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}><Btn size="sm" variant="secondary" onClick={() => onEdit(person)}>Edit</Btn><Btn size="sm" variant="ghost" onClick={() => onReset(person.id)}>Reset PW</Btn>{person.is_active && <Btn size="sm" variant="danger" onClick={() => onDeactivate(person)}>Deactivate</Btn>}</div></Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmployeesTable({ employees }) {
  if (!employees.length) return <Empty icon="HR" message="No employee profiles yet" />;
  return (
    <div className="table-shell" style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr>{["Code", "Employee", "Role", "Designation", "Type", "Status", "Joined"].map((head) => <Th key={head}>{head}</Th>)}</tr></thead>
        <tbody>
          {employees.map((employee) => (
            <tr key={employee.id} style={{ borderBottom: "1px solid var(--border-light)" }}>
              <Td>{employee.employee_code}</Td>
              <Td><div style={{ fontWeight: 700, color: "var(--card-ink)" }}>{employee.user_detail?.full_name || employee.user_detail?.username}</div><div style={{ color: "var(--text-mute)", fontSize: 12 }}>{employee.user_detail?.email || "-"}</div></Td>
              <Td>{employee.user_detail?.role_display || employee.role_name || "-"}</Td>
              <Td>{employee.designation || "-"}</Td>
              <Td>{employee.employment_type}</Td>
              <Td><Badge label={employee.status.replace("_", " ")} color={STATUS_COLOR[employee.status] || "var(--text-mute)"} /></Td>
              <Td>{employee.joining_date || "-"}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RostersTable({ rosters }) {
  if (!rosters.length) return <Empty icon="DR" message="No duty roster assigned yet" />;
  return (
    <div className="table-shell" style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr>{["Date", "Employee", "Shift", "Location", "Department", "Time", "Assigned By"].map((head) => <Th key={head}>{head}</Th>)}</tr></thead>
        <tbody>
          {rosters.map((roster) => (
            <tr key={roster.id} style={{ borderBottom: "1px solid var(--border-light)" }}>
              <Td>{roster.duty_date}</Td>
              <Td><div style={{ fontWeight: 700, color: "var(--card-ink)" }}>{roster.employee_detail?.user_detail?.full_name || "-"}</div><div style={{ color: "var(--text-mute)", fontSize: 12 }}>{roster.employee_detail?.employee_code || "-"}</div></Td>
              <Td><Badge label={roster.shift.replace("_", " ")} color={SHIFT_COLOR[roster.shift] || "var(--text-mute)"} /></Td>
              <Td>{roster.location.toUpperCase()}</Td>
              <Td>{roster.department || "-"}</Td>
              <Td>{roster.start_time || "-"} - {roster.end_time || "-"}</Td>
              <Td>{roster.assigned_by_name || "-"}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AttendanceTable({ attendance }) {
  if (!attendance.length) return <Empty icon="AT" message="No attendance records yet" />;
  return (
    <div className="table-shell" style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr>{["Date", "Employee", "Status", "Check In", "Check Out", "Recorded By", "Notes"].map((head) => <Th key={head}>{head}</Th>)}</tr></thead>
        <tbody>
          {attendance.map((record) => (
            <tr key={record.id} style={{ borderBottom: "1px solid var(--border-light)" }}>
              <Td>{record.attendance_date}</Td>
              <Td>{record.employee_detail?.user_detail?.full_name || "-"}</Td>
              <Td><Badge label={record.status.replace("_", " ")} color={ATTENDANCE_COLOR[record.status] || "var(--text-mute)"} /></Td>
              <Td>{record.check_in || "-"}</Td>
              <Td>{record.check_out || "-"}</Td>
              <Td>{record.recorded_by_name || "-"}</Td>
              <Td>{record.notes || "-"}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LeaveTable({ leaves, onApprove, onReject }) {
  if (!leaves.length) return <Empty icon="LV" message="No leave requests yet" />;
  return (
    <div className="table-shell" style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr>{["Employee", "Type", "Dates", "Status", "Reason", "Approved By", "Actions"].map((head) => <Th key={head}>{head}</Th>)}</tr></thead>
        <tbody>
          {leaves.map((leave) => (
            <tr key={leave.id} style={{ borderBottom: "1px solid var(--border-light)" }}>
              <Td>{leave.employee_detail?.user_detail?.full_name || "-"}</Td>
              <Td>{leave.leave_type}</Td>
              <Td>{leave.start_date} - {leave.end_date}</Td>
              <Td><Badge label={leave.status} color={LEAVE_STATUS_COLOR[leave.status] || "var(--text-mute)"} /></Td>
              <Td>{leave.reason || "-"}</Td>
              <Td>{leave.approved_by_name || "-"}</Td>
              <Td>
                {leave.status === "pending" ? (
                  <div style={{ display: "flex", gap: 6 }}>
                    <Btn size="sm" onClick={() => onApprove(leave)}>Approve</Btn>
                    <Btn size="sm" variant="danger" onClick={() => onReject(leave)}>Reject</Btn>
                  </div>
                ) : "-"}
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Metric({ label, value, color = "var(--teal)" }) {
  return <div><div style={{ fontSize: 24, fontWeight: 800, color, fontFamily: "var(--font-display)" }}>{value}</div><div style={{ color: "var(--text-mute)", fontSize: 12 }}>{label}</div></div>;
}

function Th({ children }) {
  return <th style={{ padding: "12px 16px", textAlign: "left", color: "var(--text-dim)", fontSize: 11, textTransform: "uppercase", letterSpacing: ".07em" }}>{children}</th>;
}

function Td({ children }) {
  return <td style={{ padding: "12px 16px", color: "var(--text-mute)", fontSize: 13 }}>{children}</td>;
}

function formatError(err) {
  const data = err.response?.data;
  if (!data) return "Operation failed.";
  if (typeof data === "string") return data;
  if (Array.isArray(data)) return data.join(" ");
  return Object.values(data).flat().join(" ");
}
