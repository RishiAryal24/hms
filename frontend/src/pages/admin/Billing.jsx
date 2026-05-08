import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addInvoiceLine,
  createChargeItem,
  createInvoice,
  createPayment,
  getBillingSummary,
  getChargeItems,
  getInvoice,
  getInvoices,
  getPatientStatement,
  issueInvoice,
} from "../../api/billing";
import { getPatients } from "../../api/patients";
import { Alert, Badge, Btn, Card, Empty, Field, Modal, Spinner, Tabs } from "../../components/ui";
import useAuthStore from "../../store/authStore";

const CATEGORY_OPTIONS = [
  "consultation", "ipd", "lab", "pharmacy", "theater", "procedure", "other",
].map((value) => ({ value, label: value.replace("_", " ") }));

const PAYMENT_METHODS = [
  "cash", "card", "online", "insurance", "bank_transfer", "other",
].map((value) => ({ value, label: value.replace("_", " ") }));

const STATUS_COLOR = {
  draft: "var(--text-mute)",
  issued: "var(--blue)",
  partial: "var(--amber)",
  paid: "var(--green)",
  cancelled: "var(--red)",
};

const emptyInvoice = { patient: "", due_date: "", discount_amount: "0", tax_amount: "0", notes: "" };
const emptyCharge = { code: "", name: "", category: "other", default_price: "", description: "" };
const emptyLine = { charge_item: "", description: "", category: "other", quantity: "1", unit_price: "" };
const emptyPayment = { amount: "", method: "cash", reference: "", notes: "" };

export default function Billing() {
  const { user } = useAuthStore();
  const [tab, setTab] = useState("invoices");
  const [summary, setSummary] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [charges, setCharges] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [detailInvoice, setDetailInvoice] = useState(null);
  const [statement, setStatement] = useState(null);
  const [patientFilter, setPatientFilter] = useState("");
  const [statementPatient, setStatementPatient] = useState("");
  const [invoiceModal, setInvoiceModal] = useState(false);
  const [detailModal, setDetailModal] = useState(false);
  const [statementModal, setStatementModal] = useState(false);
  const [chargeModal, setChargeModal] = useState(false);
  const [lineModal, setLineModal] = useState(false);
  const [paymentModal, setPaymentModal] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState(emptyInvoice);
  const [chargeForm, setChargeForm] = useState(emptyCharge);
  const [lineForm, setLineForm] = useState(emptyLine);
  const [paymentForm, setPaymentForm] = useState(emptyPayment);
  const [saving, setSaving] = useState(false);

  const canConfigureCharges = !!(user?.is_tenant_admin || user?.is_superuser);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [summaryRes, invoiceRes, chargeRes, patientRes] = await Promise.all([
        getBillingSummary(),
        getInvoices({ patient: patientFilter || undefined }),
        getChargeItems(),
        getPatients({ page_size: 200 }),
      ]);
      setSummary(summaryRes.data);
      setInvoices(invoiceRes.data.results || invoiceRes.data);
      setCharges(chargeRes.data.results || chargeRes.data);
      setPatients(patientRes.data.results || patientRes.data);
    } catch {
      setError("Unable to load billing data.");
    } finally {
      setLoading(false);
    }
  }, [patientFilter]);

  useEffect(() => { load(); }, [load]);

  const patientOptions = patients.map((patient) => ({
    value: patient.id,
    label: `${patient.full_name} (${patient.patient_id})`,
  }));

  const chargeOptions = charges.filter((charge) => charge.is_active).map((charge) => ({
    value: charge.id,
    label: `${charge.code} - ${charge.name}`,
  }));

  const selectedCharge = useMemo(
    () => charges.find((charge) => String(charge.id) === String(lineForm.charge_item)),
    [charges, lineForm.charge_item],
  );

  const handleInvoice = (event) => setInvoiceForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const handleCharge = (event) => setChargeForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const handleLine = (event) => {
    const next = { ...lineForm, [event.target.name]: event.target.value };
    if (event.target.name === "charge_item") {
      const charge = charges.find((item) => String(item.id) === String(event.target.value));
      if (charge) {
        next.description = charge.name;
        next.category = charge.category;
        next.unit_price = charge.default_price;
      }
    }
    setLineForm(next);
  };
  const handlePayment = (event) => setPaymentForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  const saveInvoice = async () => {
    setSaving(true);
    setError("");
    try {
      await createInvoice({ ...invoiceForm, due_date: invoiceForm.due_date || null });
      setInvoiceModal(false);
      setInvoiceForm(emptyInvoice);
      setSuccess("Invoice created.");
      load();
    } catch (err) {
      setError(formatError(err));
    } finally {
      setSaving(false);
    }
  };

  const saveCharge = async () => {
    setSaving(true);
    setError("");
    try {
      await createChargeItem(chargeForm);
      setChargeModal(false);
      setChargeForm(emptyCharge);
      setSuccess("Charge item created.");
      load();
    } catch (err) {
      setError(formatError(err));
    } finally {
      setSaving(false);
    }
  };

  const saveLine = async () => {
    setSaving(true);
    setError("");
    try {
      await addInvoiceLine(selectedInvoice.id, lineForm);
      setLineModal(false);
      setLineForm(emptyLine);
      setSuccess("Line item added.");
      load();
    } catch (err) {
      setError(formatError(err));
    } finally {
      setSaving(false);
    }
  };

  const savePayment = async () => {
    setSaving(true);
    setError("");
    try {
      await createPayment(selectedInvoice.id, paymentForm);
      setPaymentModal(false);
      setPaymentForm(emptyPayment);
      setSuccess("Payment recorded.");
      load();
    } catch (err) {
      setError(formatError(err));
    } finally {
      setSaving(false);
    }
  };

  const markIssued = async (invoice) => {
    setError("");
    try {
      await issueInvoice(invoice.id);
      setSuccess("Invoice issued.");
      load();
    } catch (err) {
      setError(formatError(err));
    }
  };

  const openLineModal = (invoice) => {
    setSelectedInvoice(invoice);
    setLineForm(emptyLine);
    setLineModal(true);
  };

  const openPaymentModal = (invoice) => {
    setSelectedInvoice(invoice);
    setPaymentForm({ ...emptyPayment, amount: invoice.balance_amount || "" });
    setPaymentModal(true);
  };

  const openDetailModal = async (invoice) => {
    setError("");
    try {
      const { data } = await getInvoice(invoice.id);
      setDetailInvoice(data);
      setDetailModal(true);
    } catch {
      setError("Unable to load invoice details.");
    }
  };

  const printInvoice = (invoice) => {
    const rows = (invoice.lines || []).map((line) => `
      <tr>
        <td>${line.description}</td>
        <td>${line.category}</td>
        <td>${line.quantity}</td>
        <td>Rs. ${line.unit_price}</td>
        <td>Rs. ${line.line_total}</td>
      </tr>
    `).join("");
    const payments = (invoice.payments || []).map((payment) => `
      <tr>
        <td>${new Date(payment.received_at).toLocaleString()}</td>
        <td>${payment.method}</td>
        <td>${payment.reference || "-"}</td>
        <td>Rs. ${payment.amount}</td>
      </tr>
    `).join("");
    const popup = window.open("", "_blank", "width=900,height=700");
    popup.document.write(`
      <html>
        <head>
          <title>${invoice.invoice_number}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 28px; color: #111827; }
            h1 { margin: 0 0 4px; font-size: 24px; }
            .muted { color: #6b7280; font-size: 13px; }
            .top { display: flex; justify-content: space-between; gap: 24px; margin-bottom: 24px; }
            table { width: 100%; border-collapse: collapse; margin-top: 14px; }
            th, td { border-bottom: 1px solid #e5e7eb; padding: 10px; text-align: left; font-size: 13px; }
            th { color: #6b7280; text-transform: uppercase; font-size: 11px; }
            .totals { margin-left: auto; width: 280px; margin-top: 18px; }
            .totals div { display: flex; justify-content: space-between; padding: 6px 0; }
            @media print { button { display: none; } }
          </style>
        </head>
        <body>
          <button onclick="window.print()">Print</button>
          <div class="top">
            <div>
              <h1>Butwal Hospital</h1>
              <div class="muted">Invoice / Receipt</div>
            </div>
            <div>
              <div><strong>${invoice.invoice_number}</strong></div>
              <div class="muted">Status: ${invoice.status}</div>
              <div class="muted">Date: ${new Date(invoice.created_at).toLocaleString()}</div>
            </div>
          </div>
          <div><strong>Patient:</strong> ${invoice.patient_detail?.full_name || "-"} (${invoice.patient_detail?.patient_id || "-"})</div>
          <table>
            <thead><tr><th>Description</th><th>Category</th><th>Qty</th><th>Rate</th><th>Total</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
          <div class="totals">
            <div><span>Subtotal</span><strong>Rs. ${invoice.subtotal}</strong></div>
            <div><span>Discount</span><strong>Rs. ${invoice.discount_amount}</strong></div>
            <div><span>Tax</span><strong>Rs. ${invoice.tax_amount}</strong></div>
            <div><span>Total</span><strong>Rs. ${invoice.total_amount}</strong></div>
            <div><span>Paid</span><strong>Rs. ${invoice.paid_amount}</strong></div>
            <div><span>Balance</span><strong>Rs. ${invoice.balance_amount}</strong></div>
          </div>
          <h2>Payments</h2>
          <table>
            <thead><tr><th>Date</th><th>Method</th><th>Reference</th><th>Amount</th></tr></thead>
            <tbody>${payments || "<tr><td colspan='4'>No payments recorded</td></tr>"}</tbody>
          </table>
        </body>
      </html>
    `);
    popup.document.close();
  };

  const loadStatement = async () => {
    if (!statementPatient) return;
    setError("");
    try {
      const { data } = await getPatientStatement(statementPatient);
      setStatement(data);
      setStatementModal(true);
    } catch {
      setError("Unable to load patient statement.");
    }
  };

  const printStatement = (data) => {
    const categoryBlocks = (data.categories || []).map((category) => `
      <h2>${category.category}</h2>
      <table>
        <thead><tr><th>Date</th><th>Invoice</th><th>Description</th><th>Qty</th><th>Rate</th><th>Total</th></tr></thead>
        <tbody>
          ${category.lines.map((line) => `
            <tr>
              <td>${new Date(line.date).toLocaleDateString()}</td>
              <td>${line.invoice_number}</td>
              <td>${line.description}</td>
              <td>${line.quantity}</td>
              <td>Rs. ${line.unit_price}</td>
              <td>Rs. ${line.line_total}</td>
            </tr>
          `).join("")}
        </tbody>
        <tfoot><tr><td colspan="5"><strong>${category.category} total</strong></td><td><strong>Rs. ${category.total}</strong></td></tr></tfoot>
      </table>
    `).join("");
    const popup = window.open("", "_blank", "width=980,height=760");
    popup.document.write(`
      <html>
        <head>
          <title>Patient Statement</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 28px; color: #111827; }
            h1 { margin: 0 0 4px; font-size: 24px; }
            h2 { margin-top: 26px; font-size: 17px; text-transform: capitalize; }
            .muted { color: #6b7280; font-size: 13px; }
            .top { display: flex; justify-content: space-between; gap: 24px; margin-bottom: 24px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border-bottom: 1px solid #e5e7eb; padding: 9px; text-align: left; font-size: 13px; }
            th { color: #6b7280; text-transform: uppercase; font-size: 11px; }
            tfoot td { background: #f9fafb; }
            .totals { margin-left: auto; width: 300px; margin-top: 24px; }
            .totals div { display: flex; justify-content: space-between; padding: 7px 0; border-bottom: 1px solid #e5e7eb; }
            @media print { button { display: none; } }
          </style>
        </head>
        <body>
          <button onclick="window.print()">Print</button>
          <div class="top">
            <div>
              <h1>Butwal Hospital</h1>
              <div class="muted">Patient Statement</div>
            </div>
            <div>
              <strong>${data.patient?.full_name || "-"}</strong>
              <div class="muted">${data.patient?.patient_id || ""}</div>
              <div class="muted">${new Date().toLocaleString()}</div>
            </div>
          </div>
          ${categoryBlocks || "<p>No billable charges found.</p>"}
          <div class="totals">
            <div><span>Total billed</span><strong>Rs. ${data.totals?.billed || 0}</strong></div>
            <div><span>Total paid</span><strong>Rs. ${data.totals?.paid || 0}</strong></div>
            <div><span>Amount due</span><strong>Rs. ${data.totals?.balance || 0}</strong></div>
          </div>
        </body>
      </html>
    `);
    popup.document.close();
  };

  return (
    <div className="page-enter" style={{ padding: 28 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "var(--font-display)" }}>Billing</div>
          <div style={{ fontSize: 13, color: "var(--text-mute)", marginTop: 2 }}>Invoices, charges, and payments</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn variant="secondary" onClick={() => setStatementModal(true)}>Patient Statement</Btn>
          {canConfigureCharges && <Btn variant="secondary" onClick={() => setChargeModal(true)}>Add Charge</Btn>}
          <Btn onClick={() => setInvoiceModal(true)}>New Invoice</Btn>
        </div>
      </div>

      {error && <Alert message={error} />}
      {success && <Alert message={success} type="success" />}

      <div className="dashboard-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        <Card><Metric label="Billed" value={`Rs. ${summary?.total_billed || 0}`} /></Card>
        <Card><Metric label="Collected" value={`Rs. ${summary?.total_paid || 0}`} color="var(--green)" /></Card>
        <Card><Metric label="Balance" value={`Rs. ${summary?.total_balance || 0}`} color="var(--amber)" /></Card>
        <Card><Metric label="Unpaid Bills" value={summary?.unpaid_count || 0} color="var(--blue)" /></Card>
      </div>

      <Tabs tabs={[{ key: "invoices", label: "Invoices" }, { key: "charges", label: "Charge Master" }]} active={tab} onChange={setTab} />

      {tab === "invoices" && (
        <div style={{ display: "flex", gap: 10, marginBottom: 16, maxWidth: 420 }}>
          <Field label="" name="patient_filter" value={patientFilter} onChange={(event) => setPatientFilter(event.target.value)} options={patientOptions} />
          <Btn variant="secondary" onClick={() => setPatientFilter("")} disabled={!patientFilter}>Clear</Btn>
        </div>
      )}

      {loading ? <Spinner /> : tab === "invoices" ? (
        <InvoicesTable invoices={invoices} onIssue={markIssued} onAddLine={openLineModal} onPayment={openPaymentModal} onView={openDetailModal} />
      ) : (
        <ChargesTable charges={charges} />
      )}

      <Modal open={invoiceModal} onClose={() => setInvoiceModal(false)} title="New Invoice" width={520}>
        <Field label="Patient" name="patient" value={invoiceForm.patient} onChange={handleInvoice} options={patientOptions} required />
        <Field label="Due Date" name="due_date" type="date" value={invoiceForm.due_date} onChange={handleInvoice} />
        <Field label="Discount" name="discount_amount" type="number" value={invoiceForm.discount_amount} onChange={handleInvoice} />
        <Field label="Tax" name="tax_amount" type="number" value={invoiceForm.tax_amount} onChange={handleInvoice} />
        <Field label="Notes" name="notes" value={invoiceForm.notes} onChange={handleInvoice} />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <Btn variant="secondary" onClick={() => setInvoiceModal(false)}>Cancel</Btn>
          <Btn onClick={saveInvoice} disabled={saving || !invoiceForm.patient}>Create</Btn>
        </div>
      </Modal>

      <Modal open={chargeModal} onClose={() => setChargeModal(false)} title="Add Charge Item" width={520}>
        <Field label="Code" name="code" value={chargeForm.code} onChange={handleCharge} required />
        <Field label="Name" name="name" value={chargeForm.name} onChange={handleCharge} required />
        <Field label="Category" name="category" value={chargeForm.category} onChange={handleCharge} options={CATEGORY_OPTIONS} />
        <Field label="Default Price" name="default_price" type="number" value={chargeForm.default_price} onChange={handleCharge} required />
        <Field label="Description" name="description" value={chargeForm.description} onChange={handleCharge} />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <Btn variant="secondary" onClick={() => setChargeModal(false)}>Cancel</Btn>
          <Btn onClick={saveCharge} disabled={saving || !chargeForm.code || !chargeForm.name || !chargeForm.default_price}>Save</Btn>
        </div>
      </Modal>

      <Modal open={lineModal} onClose={() => setLineModal(false)} title={`Add Line - ${selectedInvoice?.invoice_number || ""}`} width={520}>
        <Field label="Charge Item" name="charge_item" value={lineForm.charge_item} onChange={handleLine} options={chargeOptions} />
        <Field label="Description" name="description" value={lineForm.description} onChange={handleLine} required />
        <Field label="Category" name="category" value={lineForm.category} onChange={handleLine} options={CATEGORY_OPTIONS} />
        <Field label="Quantity" name="quantity" type="number" value={lineForm.quantity} onChange={handleLine} />
        <Field label="Unit Price" name="unit_price" type="number" value={lineForm.unit_price} onChange={handleLine} />
        {selectedCharge && <Alert type="info" message={`Using price from ${selectedCharge.code}. You can still edit quantity or unit price.`} />}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <Btn variant="secondary" onClick={() => setLineModal(false)}>Cancel</Btn>
          <Btn onClick={saveLine} disabled={saving || !lineForm.description || !lineForm.unit_price}>Add Line</Btn>
        </div>
      </Modal>

      <Modal open={paymentModal} onClose={() => setPaymentModal(false)} title={`Record Payment - ${selectedInvoice?.invoice_number || ""}`} width={460}>
        <Field label="Amount" name="amount" type="number" value={paymentForm.amount} onChange={handlePayment} required />
        <Field label="Method" name="method" value={paymentForm.method} onChange={handlePayment} options={PAYMENT_METHODS} />
        <Field label="Reference" name="reference" value={paymentForm.reference} onChange={handlePayment} />
        <Field label="Notes" name="notes" value={paymentForm.notes} onChange={handlePayment} />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <Btn variant="secondary" onClick={() => setPaymentModal(false)}>Cancel</Btn>
          <Btn onClick={savePayment} disabled={saving || !paymentForm.amount}>Record Payment</Btn>
        </div>
      </Modal>

      <Modal open={detailModal} onClose={() => setDetailModal(false)} title={`Invoice ${detailInvoice?.invoice_number || ""}`} width={860}>
        {detailInvoice && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
              <Card><Metric label="Total" value={`Rs. ${detailInvoice.total_amount}`} color="var(--blue)" /></Card>
              <Card><Metric label="Paid" value={`Rs. ${detailInvoice.paid_amount}`} color="var(--green)" /></Card>
              <Card><Metric label="Balance" value={`Rs. ${detailInvoice.balance_amount}`} color="var(--amber)" /></Card>
              <Card><Metric label="Status" value={detailInvoice.status} color={STATUS_COLOR[detailInvoice.status] || "var(--text-mute)"} /></Card>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16, marginBottom: 14 }}>
              <div>
                <div style={{ fontWeight: 700 }}>{detailInvoice.patient_detail?.full_name || "-"}</div>
                <div style={{ color: "var(--text-mute)", fontSize: 12 }}>{detailInvoice.patient_detail?.patient_id || ""}</div>
              </div>
              <Btn variant="secondary" onClick={() => printInvoice(detailInvoice)}>Print</Btn>
            </div>
            <InvoiceLines lines={detailInvoice.lines || []} />
            <PaymentsTable payments={detailInvoice.payments || []} />
          </>
        )}
      </Modal>

      <Modal open={statementModal} onClose={() => setStatementModal(false)} title="Patient Statement" width={920}>
        <div style={{ display: "flex", gap: 10, alignItems: "end", marginBottom: 18 }}>
          <div style={{ flex: 1 }}>
            <Field label="Patient" name="statement_patient" value={statementPatient} onChange={(event) => setStatementPatient(event.target.value)} options={patientOptions} />
          </div>
          <Btn onClick={loadStatement} disabled={!statementPatient}>Load</Btn>
          {statement && <Btn variant="secondary" onClick={() => printStatement(statement)}>Print</Btn>}
        </div>
        {statement ? <StatementView statement={statement} /> : <Empty icon="ST" message="Select a patient to view statement" />}
      </Modal>
    </div>
  );
}

function Metric({ label, value, color = "var(--teal)" }) {
  return (
    <div>
      <div style={{ fontSize: 22, fontWeight: 800, color, fontFamily: "var(--font-display)" }}>{value}</div>
      <div style={{ color: "var(--text-mute)", fontSize: 12 }}>{label}</div>
    </div>
  );
}

function InvoicesTable({ invoices, onIssue, onAddLine, onPayment, onView }) {
  if (!invoices.length) return <Empty icon="BL" message="No invoices yet" />;
  return (
    <div className="table-shell" style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr>{["Invoice", "Patient", "Status", "Total", "Paid", "Balance", "Actions"].map((head) => <Th key={head}>{head}</Th>)}</tr></thead>
        <tbody>
          {invoices.map((invoice) => (
            <tr key={invoice.id} style={{ borderBottom: "1px solid var(--border-light)" }}>
              <Td>{invoice.invoice_number}</Td>
              <Td>{invoice.patient_detail?.full_name || "-"}</Td>
              <Td><Badge label={invoice.status} color={STATUS_COLOR[invoice.status] || "var(--text-mute)"} /></Td>
              <Td>Rs. {invoice.total_amount}</Td>
              <Td>Rs. {invoice.paid_amount}</Td>
              <Td>Rs. {invoice.balance_amount}</Td>
              <Td>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {invoice.status === "draft" && <Btn size="sm" variant="secondary" onClick={() => onIssue(invoice)}>Issue</Btn>}
                  <Btn size="sm" variant="ghost" onClick={() => onView(invoice)}>View</Btn>
                  <Btn size="sm" variant="ghost" onClick={() => onAddLine(invoice)}>Line</Btn>
                  <Btn size="sm" onClick={() => onPayment(invoice)} disabled={invoice.status === "paid" || invoice.status === "cancelled"}>Pay</Btn>
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ChargesTable({ charges }) {
  if (!charges.length) return <Empty icon="CH" message="No charge items configured" />;
  return (
    <div className="table-shell" style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr>{["Code", "Name", "Category", "Price", "Status"].map((head) => <Th key={head}>{head}</Th>)}</tr></thead>
        <tbody>
          {charges.map((charge) => (
            <tr key={charge.id} style={{ borderBottom: "1px solid var(--border-light)" }}>
              <Td>{charge.code}</Td>
              <Td>{charge.name}</Td>
              <Td>{charge.category}</Td>
              <Td>Rs. {charge.default_price}</Td>
              <Td><Badge label={charge.is_active ? "active" : "inactive"} color={charge.is_active ? "var(--green)" : "var(--text-mute)"} /></Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function InvoiceLines({ lines }) {
  if (!lines.length) return <Empty icon="LN" message="No line items yet" />;
  return (
    <div className="table-shell" style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden", marginBottom: 18 }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr>{["Description", "Category", "Qty", "Rate", "Total"].map((head) => <Th key={head}>{head}</Th>)}</tr></thead>
        <tbody>
          {lines.map((line) => (
            <tr key={line.id} style={{ borderBottom: "1px solid var(--border-light)" }}>
              <Td>{line.description}</Td>
              <Td>{line.category}</Td>
              <Td>{line.quantity}</Td>
              <Td>Rs. {line.unit_price}</Td>
              <Td>Rs. {line.line_total}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PaymentsTable({ payments }) {
  return (
    <div>
      <div style={{ fontWeight: 800, marginBottom: 8 }}>Payments</div>
      {!payments.length ? <Empty icon="PY" message="No payments recorded" /> : (
        <div className="table-shell" style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>{["Date", "Method", "Reference", "Amount"].map((head) => <Th key={head}>{head}</Th>)}</tr></thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id} style={{ borderBottom: "1px solid var(--border-light)" }}>
                  <Td>{new Date(payment.received_at).toLocaleString()}</Td>
                  <Td>{payment.method}</Td>
                  <Td>{payment.reference || "-"}</Td>
                  <Td>Rs. {payment.amount}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatementView({ statement }) {
  const categories = statement.categories || [];
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 18 }}>
        <Card><Metric label="Billed" value={`Rs. ${statement.totals?.billed || 0}`} color="var(--blue)" /></Card>
        <Card><Metric label="Paid" value={`Rs. ${statement.totals?.paid || 0}`} color="var(--green)" /></Card>
        <Card><Metric label="Due" value={`Rs. ${statement.totals?.balance || 0}`} color="var(--amber)" /></Card>
      </div>
      {!categories.length ? <Empty icon="BL" message="No billable charges found" /> : categories.map((category) => (
        <div key={category.category} style={{ marginBottom: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <div style={{ fontWeight: 800, textTransform: "capitalize" }}>{category.category}</div>
            <div style={{ fontWeight: 800, color: "var(--teal)" }}>Rs. {category.total}</div>
          </div>
          <div className="table-shell" style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr>{["Date", "Invoice", "Description", "Qty", "Rate", "Total"].map((head) => <Th key={head}>{head}</Th>)}</tr></thead>
              <tbody>
                {category.lines.map((line) => (
                  <tr key={line.id} style={{ borderBottom: "1px solid var(--border-light)" }}>
                    <Td>{new Date(line.date).toLocaleDateString()}</Td>
                    <Td>{line.invoice_number}</Td>
                    <Td>{line.description}</Td>
                    <Td>{line.quantity}</Td>
                    <Td>Rs. {line.unit_price}</Td>
                    <Td>Rs. {line.line_total}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
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
