import { useEffect, useMemo, useState } from "react";
import {
  collectLabSample,
  createLabOrder,
  createLabTest,
  enterLabResult,
  getLabOrders,
  getLabSummary,
  getLabTests,
} from "../../api/lab";
import { getPatients } from "../../api/patients";
import { Alert, Badge, Btn, Card, Empty, Field, Modal, Spinner, Tabs } from "../../components/ui";
import useAuthStore from "../../store/authStore";

const CATEGORIES = [
  "hematology", "biochemistry", "microbiology", "serology", "radiology", "pathology", "other",
].map((value) => ({ value, label: value }));

const PRIORITIES = [
  { value: "routine", label: "Routine" },
  { value: "urgent", label: "Urgent" },
  { value: "stat", label: "STAT" },
];

const STATUS_COLOR = {
  ordered: "var(--blue)",
  sample_collected: "var(--amber)",
  processing: "var(--purple)",
  completed: "var(--green)",
  cancelled: "var(--red)",
};

const emptyTest = { code: "", name: "", category: "other", sample_type: "", normal_range: "", unit: "", price: "0", turnaround_hours: "24", description: "" };
const emptyOrder = { patient: "", admission: "", priority: "routine", clinical_notes: "", tests: [] };
const emptyResult = { orderId: "", itemId: "", testName: "", result_value: "", result_notes: "", is_abnormal: false };

export default function Lab() {
  const { user } = useAuthStore();
  const [tab, setTab] = useState("orders");
  const [summary, setSummary] = useState(null);
  const [tests, setTests] = useState([]);
  const [orders, setOrders] = useState([]);
  const [patients, setPatients] = useState([]);
  const [orderModal, setOrderModal] = useState(false);
  const [testModal, setTestModal] = useState(false);
  const [resultModal, setResultModal] = useState(false);
  const [orderForm, setOrderForm] = useState(emptyOrder);
  const [testForm, setTestForm] = useState(emptyTest);
  const [resultForm, setResultForm] = useState(emptyResult);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const canConfigure = !!(user?.is_tenant_admin || user?.is_superuser);
  const canProcess = user?.role === "lab_technician" || canConfigure;

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [summaryRes, testRes, orderRes, patientRes] = await Promise.all([
        getLabSummary(),
        getLabTests({ is_active: true }),
        getLabOrders(),
        getPatients({ page_size: 200 }),
      ]);
      setSummary(summaryRes.data);
      setTests(testRes.data.results || testRes.data);
      setOrders(orderRes.data.results || orderRes.data);
      setPatients(patientRes.data.results || patientRes.data);
    } catch {
      setError("Unable to load lab data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const patientOptions = patients.map((patient) => ({
    value: patient.id,
    label: `${patient.full_name} (${patient.patient_id})`,
  }));

  const testOptions = tests.map((test) => ({
    value: test.id,
    label: `${test.code} - ${test.name} / Rs. ${test.price}`,
  }));

  const selectedTests = useMemo(
    () => tests.filter((test) => orderForm.tests.includes(String(test.id))),
    [tests, orderForm.tests],
  );
  const selectedTotal = selectedTests.reduce((sum, test) => sum + Number(test.price || 0), 0);

  const handleOrder = (event) => {
    if (event.target.name === "tests") {
      const values = Array.from(event.target.selectedOptions).map((option) => option.value);
      setOrderForm((current) => ({ ...current, tests: values }));
      return;
    }
    setOrderForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleTest = (event) => setTestForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const handleResult = (event) => {
    const { name, value, type, checked } = event.target;
    setResultForm((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
  };

  const saveOrder = async () => {
    setSaving(true);
    setError("");
    try {
      await createLabOrder({ ...orderForm, admission: orderForm.admission || null });
      setOrderModal(false);
      setOrderForm(emptyOrder);
      setSuccess("Lab order created and billing charges added.");
      load();
    } catch (err) {
      setError(formatError(err));
    } finally {
      setSaving(false);
    }
  };

  const saveTest = async () => {
    setSaving(true);
    setError("");
    try {
      await createLabTest(testForm);
      setTestModal(false);
      setTestForm(emptyTest);
      setSuccess("Lab test created.");
      load();
    } catch (err) {
      setError(formatError(err));
    } finally {
      setSaving(false);
    }
  };

  const collectSample = async (order) => {
    try {
      await collectLabSample(order.id);
      setSuccess("Sample collected.");
      load();
    } catch {
      setError("Unable to collect sample.");
    }
  };

  const openResult = (order, item) => {
    setResultForm({
      ...emptyResult,
      orderId: order.id,
      itemId: item.id,
      testName: item.test_detail?.name || "Lab result",
      result_value: item.result_value || "",
      result_notes: item.result_notes || "",
      is_abnormal: item.is_abnormal || false,
    });
    setResultModal(true);
  };

  const saveResult = async () => {
    setSaving(true);
    setError("");
    try {
      await enterLabResult(resultForm.orderId, resultForm.itemId, {
        result_value: resultForm.result_value,
        result_notes: resultForm.result_notes,
        is_abnormal: resultForm.is_abnormal,
      });
      setResultModal(false);
      setResultForm(emptyResult);
      setSuccess("Result entered.");
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
          <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "var(--font-display)" }}>Lab</div>
          <div style={{ fontSize: 13, color: "var(--text-mute)", marginTop: 2 }}>Tests, samples, results, and lab billing</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {canConfigure && <Btn variant="secondary" onClick={() => setTestModal(true)}>Add Test</Btn>}
          <Btn onClick={() => setOrderModal(true)}>New Lab Order</Btn>
        </div>
      </div>

      {error && <Alert message={error} />}
      {success && <Alert message={success} type="success" />}

      <div className="dashboard-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        <Card><Metric label="Active Tests" value={summary?.tests || 0} /></Card>
        <Card><Metric label="Ordered" value={summary?.ordered || 0} color="var(--blue)" /></Card>
        <Card><Metric label="Processing" value={summary?.processing || 0} color="var(--amber)" /></Card>
        <Card><Metric label="Completed" value={summary?.completed || 0} color="var(--green)" /></Card>
      </div>

      <Tabs tabs={[{ key: "orders", label: "Orders" }, { key: "tests", label: "Test Catalog" }]} active={tab} onChange={setTab} />

      {loading ? <Spinner /> : tab === "orders" ? (
        <OrdersTable orders={orders} canProcess={canProcess} onCollect={collectSample} onResult={openResult} />
      ) : (
        <TestsTable tests={tests} />
      )}

      <Modal open={orderModal} onClose={() => setOrderModal(false)} title="New Lab Order" width={620}>
        <Field label="Patient" name="patient" value={orderForm.patient} onChange={handleOrder} options={patientOptions} required />
        <Field label="Priority" name="priority" value={orderForm.priority} onChange={handleOrder} options={PRIORITIES} />
        <div className="field">
          <label className="field-label">Tests <span className="required">*</span></label>
          <select name="tests" value={orderForm.tests} onChange={handleOrder} className="field-control" multiple style={{ minHeight: 150 }}>
            {testOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </div>
        {selectedTests.length > 0 && (
          <Alert
            type={selectedTotal > 0 ? "info" : "warning"}
            message={`${selectedTests.length} tests selected. Billing total: Rs. ${selectedTotal}. Tests priced at Rs. 0 will not create payable charges.`}
          />
        )}
        <Field label="Clinical Notes" name="clinical_notes" value={orderForm.clinical_notes} onChange={handleOrder} />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <Btn variant="secondary" onClick={() => setOrderModal(false)}>Cancel</Btn>
          <Btn onClick={saveOrder} disabled={saving || !orderForm.patient || orderForm.tests.length === 0}>Create Order</Btn>
        </div>
      </Modal>

      <Modal open={testModal} onClose={() => setTestModal(false)} title="Add Lab Test" width={560}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Code" name="code" value={testForm.code} onChange={handleTest} required />
          <Field label="Name" name="name" value={testForm.name} onChange={handleTest} required />
          <Field label="Category" name="category" value={testForm.category} onChange={handleTest} options={CATEGORIES} />
          <Field label="Sample Type" name="sample_type" value={testForm.sample_type} onChange={handleTest} />
          <Field label="Normal Range" name="normal_range" value={testForm.normal_range} onChange={handleTest} />
          <Field label="Unit" name="unit" value={testForm.unit} onChange={handleTest} />
          <Field label="Price" name="price" value={testForm.price} onChange={handleTest} type="number" />
          <Field label="TAT Hours" name="turnaround_hours" value={testForm.turnaround_hours} onChange={handleTest} type="number" />
        </div>
        <Field label="Description" name="description" value={testForm.description} onChange={handleTest} />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <Btn variant="secondary" onClick={() => setTestModal(false)}>Cancel</Btn>
          <Btn onClick={saveTest} disabled={saving || !testForm.code || !testForm.name}>Save Test</Btn>
        </div>
      </Modal>

      <Modal open={resultModal} onClose={() => setResultModal(false)} title={`Result - ${resultForm.testName}`} width={520}>
        <Field label="Result Value" name="result_value" value={resultForm.result_value} onChange={handleResult} required />
        <Field label="Result Notes" name="result_notes" value={resultForm.result_notes} onChange={handleResult} />
        <label style={{ display: "flex", alignItems: "center", gap: 8, margin: "8px 0 16px", color: "var(--text-mute)", fontSize: 13 }}>
          <input type="checkbox" name="is_abnormal" checked={resultForm.is_abnormal} onChange={handleResult} />
          Mark as abnormal
        </label>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <Btn variant="secondary" onClick={() => setResultModal(false)}>Cancel</Btn>
          <Btn onClick={saveResult} disabled={saving || !resultForm.result_value}>Save Result</Btn>
        </div>
      </Modal>
    </div>
  );
}

function OrdersTable({ orders, canProcess, onCollect, onResult }) {
  if (!orders.length) return <Empty icon="LB" message="No lab orders yet" />;
  return (
    <div style={{ display: "grid", gap: 12 }}>
      {orders.map((order) => (
        <Card key={order.id}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, marginBottom: 12 }}>
            <div>
              <div style={{ fontWeight: 800 }}>{order.order_number}</div>
              <div style={{ color: "var(--text-mute)", fontSize: 12 }}>{order.patient_detail?.full_name || "-"} / {order.patient_detail?.patient_id || ""}</div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <Badge label={order.priority} color={order.priority === "stat" ? "var(--red)" : "var(--blue)"} />
              <Badge label={order.status.replace("_", " ")} color={STATUS_COLOR[order.status] || "var(--text-mute)"} />
              {canProcess && order.status === "ordered" && <Btn size="sm" onClick={() => onCollect(order)}>Collect</Btn>}
            </div>
          </div>
          <div className="table-shell" style={{ border: "1px solid var(--border-light)", borderRadius: 8, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr>{["Test", "Sample", "Result", "Range", "Status", "Action"].map((head) => <Th key={head}>{head}</Th>)}</tr></thead>
              <tbody>
                {order.items.map((item) => (
                  <tr key={item.id} style={{ borderBottom: "1px solid var(--border-light)" }}>
                    <Td>{item.test_detail?.name}</Td>
                    <Td>{item.test_detail?.sample_type || "-"}</Td>
                    <Td>{item.result_value || "-"}</Td>
                    <Td>{item.test_detail?.normal_range || "-"}</Td>
                    <Td><Badge label={item.status.replace("_", " ")} color={STATUS_COLOR[item.status] || "var(--text-mute)"} /></Td>
                    <Td>{canProcess && item.status !== "completed" ? <Btn size="sm" variant="secondary" onClick={() => onResult(order, item)}>Result</Btn> : "-"}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ))}
    </div>
  );
}

function TestsTable({ tests }) {
  if (!tests.length) return <Empty icon="TS" message="No lab tests configured" />;
  return (
    <div className="table-shell" style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr>{["Code", "Name", "Category", "Sample", "Range", "Price"].map((head) => <Th key={head}>{head}</Th>)}</tr></thead>
        <tbody>
          {tests.map((test) => (
            <tr key={test.id} style={{ borderBottom: "1px solid var(--border-light)" }}>
              <Td>{test.code}</Td>
              <Td>{test.name}</Td>
              <Td>{test.category}</Td>
              <Td>{test.sample_type || "-"}</Td>
              <Td>{test.normal_range || "-"}</Td>
              <Td>Rs. {test.price}</Td>
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
