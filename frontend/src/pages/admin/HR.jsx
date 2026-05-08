import { useCallback, useEffect, useState } from "react";
import {
  createEmployee,
  createRoster,
  getEmployees,
  getHROptions,
  getHRSummary,
  getRosters,
} from "../../api/hr";
import { Alert, Badge, Btn, Card, Empty, Field, Modal, Spinner, Tabs } from "../../components/ui";
import useAuthStore from "../../store/authStore";

const EMPLOYMENT_TYPES = [
  "permanent", "contract", "visiting", "intern", "other",
].map((value) => ({ value, label: value.replace("_", " ") }));

const EMPLOYMENT_STATUSES = [
  "active", "on_leave", "suspended", "resigned",
].map((value) => ({ value, label: value.replace("_", " ") }));

const SHIFTS = [
  "morning", "evening", "night", "on_call",
].map((value) => ({ value, label: value.replace("_", " ") }));

const LOCATIONS = [
  "opd", "ipd", "lab", "pharmacy", "ot", "reception", "billing", "admin", "other",
].map((value) => ({ value, label: value.toUpperCase() }));

const STATUS_COLOR = {
  active: "var(--green)",
  on_leave: "var(--amber)",
  suspended: "var(--red)",
  resigned: "var(--text-mute)",
};

const SHIFT_COLOR = {
  morning: "var(--blue)",
  evening: "var(--amber)",
  night: "var(--purple)",
  on_call: "var(--green)",
};

const emptyEmployee = {
  user: "",
  employee_code: "",
  employment_type: "permanent",
  status: "active",
  joining_date: "",
  designation: "",
  emergency_contact: "",
  address: "",
  notes: "",
};

const emptyRoster = {
  employee: "",
  duty_date: "",
  shift: "morning",
  location: "opd",
  department: "",
  start_time: "",
  end_time: "",
  notes: "",
};

export default function HR() {
  const { user } = useAuthStore();
  const [tab, setTab] = useState("employees");
  const [summary, setSummary] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [rosters, setRosters] = useState([]);
  const [staffOptions, setStaffOptions] = useState([]);
  const [employeeModal, setEmployeeModal] = useState(false);
  const [rosterModal, setRosterModal] = useState(false);
  const [employeeForm, setEmployeeForm] = useState(emptyEmployee);
  const [rosterForm, setRosterForm] = useState(emptyRoster);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const canManage = !!(user?.is_tenant_admin || user?.is_superuser);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [summaryRes, employeeRes, rosterRes, optionRes] = await Promise.all([
        getHRSummary(),
        getEmployees(),
        getRosters(),
        getHROptions(),
      ]);
      setSummary(summaryRes.data);
      setEmployees(employeeRes.data.results || employeeRes.data);
      setRosters(rosterRes.data.results || rosterRes.data);
      setStaffOptions(optionRes.data.staff || []);
    } catch {
      setError("Unable to load HR data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const staffChoices = staffOptions.map((staff) => ({
    value: staff.id,
    label: `${staff.full_name || staff.username} (${staff.role_display || staff.role_name || "Staff"})`,
  }));

  const employeeChoices = employees
    .filter((employee) => employee.status === "active" || employee.status === "on_leave")
    .map((employee) => ({
      value: employee.id,
      label: `${employee.user_detail?.full_name || employee.employee_code} (${employee.employee_code})`,
    }));

  const handleEmployee = (event) => setEmployeeForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const handleRoster = (event) => setRosterForm((current) => ({ ...current, [event.target.name]: event.target.value }));

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
      await createRoster({
        ...rosterForm,
        start_time: rosterForm.start_time || null,
        end_time: rosterForm.end_time || null,
      });
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

  return (
    <div className="page-enter" style={{ padding: 28 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "var(--font-display)" }}>HR</div>
          <div style={{ fontSize: 13, color: "var(--text-mute)", marginTop: 2 }}>Employee profiles, employment status, and duty rosters</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {canManage && <Btn variant="secondary" onClick={() => setEmployeeModal(true)}>Add Employee</Btn>}
          {canManage && <Btn onClick={() => setRosterModal(true)}>Assign Duty</Btn>}
        </div>
      </div>

      {error && <Alert message={error} />}
      {success && <Alert message={success} type="success" />}

      <div className="dashboard-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        <Card><Metric label="Employees" value={summary?.employees || 0} /></Card>
        <Card><Metric label="Active" value={summary?.active || 0} color="var(--green)" /></Card>
        <Card><Metric label="On Leave" value={summary?.on_leave || 0} color="var(--amber)" /></Card>
        <Card><Metric label="Roster Entries" value={summary?.rosters || 0} color="var(--blue)" /></Card>
      </div>

      <Tabs tabs={[{ key: "employees", label: "Employees" }, { key: "rosters", label: "Duty Roster" }]} active={tab} onChange={setTab} />

      {loading ? <Spinner /> : tab === "employees" ? (
        <EmployeesTable employees={employees} />
      ) : (
        <RostersTable rosters={rosters} />
      )}

      <Modal open={employeeModal} onClose={() => setEmployeeModal(false)} title="Add Employee Profile" width={640}>
        <Field label="Staff User" name="user" value={employeeForm.user} onChange={handleEmployee} options={staffChoices} required />
        {!staffChoices.length && <Alert type="warning" message="All active staff already have HR profiles. Create staff from Staff module first." />}
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
              <Td>
                <div style={{ fontWeight: 700, color: "var(--card-ink)" }}>{employee.user_detail?.full_name || employee.user_detail?.username}</div>
                <div style={{ color: "var(--text-mute)", fontSize: 12 }}>{employee.user_detail?.email || "-"}</div>
              </Td>
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
              <Td>
                <div style={{ fontWeight: 700, color: "var(--card-ink)" }}>{roster.employee_detail?.user_detail?.full_name || "-"}</div>
                <div style={{ color: "var(--text-mute)", fontSize: 12 }}>{roster.employee_detail?.employee_code || "-"}</div>
              </Td>
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

function Metric({ label, value, color = "var(--teal)" }) {
  return (
    <div>
      <div style={{ fontSize: 24, fontWeight: 800, color, fontFamily: "var(--font-display)" }}>{value}</div>
      <div style={{ color: "var(--text-mute)", fontSize: 12 }}>{label}</div>
    </div>
  );
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
