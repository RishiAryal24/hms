import { useEffect, useMemo, useState } from "react";
import { getPatients } from "../../api/patients";
import {
  createPharmacyItem,
  createStockMovement,
  getPharmacyItems,
  getPharmacySummary,
  getStockMovements,
} from "../../api/pharmacy";
import { Alert, Badge, Btn, Card, Empty, Field, Modal, Spinner, Tabs } from "../../components/ui";
import useAuthStore from "../../store/authStore";

const CATEGORIES = [
  { value: "medicine", label: "Medicine" },
  { value: "consumable", label: "Consumable" },
  { value: "equipment", label: "Equipment" },
  { value: "other", label: "Other" },
];

const emptyItem = {
  code: "",
  name: "",
  category: "medicine",
  generic_name: "",
  strength: "",
  unit: "pcs",
  supplier: "",
  batch_number: "",
  expiry_date: "",
  purchase_price: "0",
  selling_price: "0",
  stock_quantity: "0",
  reorder_level: "0",
  notes: "",
};

const emptyMovement = {
  item: "",
  movement_type: "stock_in",
  quantity: "",
  unit_price: "",
  patient: "",
  admission: "",
  reference: "",
  notes: "",
};

const MOVEMENT_COLOR = {
  stock_in: "var(--green)",
  dispense: "var(--blue)",
  adjustment: "var(--amber)",
};

const INVOICE_STATUS_COLOR = {
  draft: "var(--text-mute)",
  issued: "var(--blue)",
  partial: "var(--amber)",
  paid: "var(--green)",
  cancelled: "var(--red)",
};

export default function Pharmacy() {
  const { user } = useAuthStore();
  const [tab, setTab] = useState("items");
  const [summary, setSummary] = useState(null);
  const [items, setItems] = useState([]);
  const [movements, setMovements] = useState([]);
  const [patients, setPatients] = useState([]);
  const [itemModal, setItemModal] = useState(false);
  const [movementModal, setMovementModal] = useState(false);
  const [itemForm, setItemForm] = useState(emptyItem);
  const [movementForm, setMovementForm] = useState(emptyMovement);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const canManage = user?.role === "pharmacist" || user?.is_tenant_admin || user?.is_superuser;

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [summaryRes, itemRes, movementRes, patientRes] = await Promise.all([
        getPharmacySummary(),
        getPharmacyItems({ is_active: true }),
        getStockMovements(),
        getPatients({ page_size: 200 }),
      ]);
      setSummary(summaryRes.data);
      setItems(itemRes.data.results || itemRes.data);
      setMovements(movementRes.data.results || movementRes.data);
      setPatients(patientRes.data.results || patientRes.data);
    } catch {
      setError("Unable to load pharmacy data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const itemOptions = items.map((item) => ({
    value: item.id,
    label: `${item.name} ${item.strength || ""} (${item.stock_quantity} ${item.unit})`,
  }));

  const patientOptions = patients.map((patient) => ({
    value: patient.id,
    label: `${patient.full_name} (${patient.patient_id})`,
  }));

  const selectedItem = useMemo(
    () => items.find((item) => String(item.id) === String(movementForm.item)),
    [items, movementForm.item],
  );

  const handleItem = (event) => setItemForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const handleMovement = (event) => {
    const next = { ...movementForm, [event.target.name]: event.target.value };
    if (event.target.name === "item") {
      const item = items.find((entry) => String(entry.id) === String(event.target.value));
      if (item) next.unit_price = movementForm.movement_type === "dispense" ? item.selling_price : item.purchase_price;
    }
    if (event.target.name === "movement_type" && selectedItem) {
      next.unit_price = event.target.value === "dispense" ? selectedItem.selling_price : selectedItem.purchase_price;
    }
    setMovementForm(next);
  };

  const saveItem = async () => {
    setSaving(true);
    setError("");
    try {
      await createPharmacyItem({ ...itemForm, expiry_date: itemForm.expiry_date || null });
      setItemModal(false);
      setItemForm(emptyItem);
      setSuccess("Pharmacy item created.");
      load();
    } catch (err) {
      setError(formatError(err));
    } finally {
      setSaving(false);
    }
  };

  const saveMovement = async () => {
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...movementForm,
        patient: movementForm.movement_type === "dispense" ? movementForm.patient : null,
        admission: movementForm.admission || null,
      };
      const { data } = await createStockMovement(payload);
      setMovementModal(false);
      setMovementForm(emptyMovement);
      setSuccess(
        payload.movement_type === "dispense"
          ? `Dispensed and added to ${data.invoice_number || "the patient bill"}.`
          : "Stock movement recorded.",
      );
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
          <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "var(--font-display)" }}>Pharmacy</div>
          <div style={{ fontSize: 13, color: "var(--text-mute)", marginTop: 2 }}>Inventory, dispensing, expiry, and pharmacy billing</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {canManage && <Btn variant="secondary" onClick={() => setItemModal(true)}>Add Item</Btn>}
          {canManage && <Btn onClick={() => setMovementModal(true)}>Stock / Dispense</Btn>}
        </div>
      </div>

      {error && <Alert message={error} />}
      {success && <Alert message={success} type="success" />}

      <div className="dashboard-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        <Card><Metric label="Active Items" value={summary?.items || 0} /></Card>
        <Card><Metric label="Low Stock" value={summary?.low_stock || 0} color="var(--amber)" /></Card>
        <Card><Metric label="Expired" value={summary?.expired || 0} color="var(--red)" /></Card>
        <Card><Metric label="Dispensed Today" value={summary?.dispensed_today || 0} color="var(--green)" /></Card>
      </div>

      <Tabs tabs={[{ key: "items", label: "Items" }, { key: "movements", label: "Stock Movements" }]} active={tab} onChange={setTab} />

      {loading ? <Spinner /> : tab === "items" ? (
        <ItemsTable items={items} />
      ) : (
        <MovementsTable movements={movements} />
      )}

      <Modal open={itemModal} onClose={() => setItemModal(false)} title="Add Pharmacy Item" width={680}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Code" name="code" value={itemForm.code} onChange={handleItem} required />
          <Field label="Name" name="name" value={itemForm.name} onChange={handleItem} required />
          <Field label="Category" name="category" value={itemForm.category} onChange={handleItem} options={CATEGORIES} />
          <Field label="Generic Name" name="generic_name" value={itemForm.generic_name} onChange={handleItem} />
          <Field label="Strength" name="strength" value={itemForm.strength} onChange={handleItem} />
          <Field label="Unit" name="unit" value={itemForm.unit} onChange={handleItem} />
          <Field label="Supplier" name="supplier" value={itemForm.supplier} onChange={handleItem} />
          <Field label="Batch" name="batch_number" value={itemForm.batch_number} onChange={handleItem} />
          <Field label="Expiry" name="expiry_date" value={itemForm.expiry_date} onChange={handleItem} type="date" />
          <Field label="Opening Stock" name="stock_quantity" value={itemForm.stock_quantity} onChange={handleItem} type="number" />
          <Field label="Purchase Price" name="purchase_price" value={itemForm.purchase_price} onChange={handleItem} type="number" />
          <Field label="Selling Price" name="selling_price" value={itemForm.selling_price} onChange={handleItem} type="number" />
          <Field label="Reorder Level" name="reorder_level" value={itemForm.reorder_level} onChange={handleItem} type="number" />
        </div>
        <Field label="Notes" name="notes" value={itemForm.notes} onChange={handleItem} />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <Btn variant="secondary" onClick={() => setItemModal(false)}>Cancel</Btn>
          <Btn onClick={saveItem} disabled={saving || !itemForm.code || !itemForm.name}>Save Item</Btn>
        </div>
      </Modal>

      <Modal open={movementModal} onClose={() => setMovementModal(false)} title="Stock / Dispense" width={560}>
        <Field label="Item" name="item" value={movementForm.item} onChange={handleMovement} options={itemOptions} required />
        <Field label="Type" name="movement_type" value={movementForm.movement_type} onChange={handleMovement} options={[
          { value: "stock_in", label: "Stock In" },
          { value: "dispense", label: "Dispense to Patient" },
          { value: "adjustment", label: "Adjustment" },
        ]} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Quantity" name="quantity" value={movementForm.quantity} onChange={handleMovement} type="number" required />
          <Field label="Unit Price" name="unit_price" value={movementForm.unit_price} onChange={handleMovement} type="number" />
        </div>
        {movementForm.movement_type === "dispense" && (
          <Field label="Patient" name="patient" value={movementForm.patient} onChange={handleMovement} options={patientOptions} required />
        )}
        <Field label="Reference" name="reference" value={movementForm.reference} onChange={handleMovement} />
        <Field label="Notes" name="notes" value={movementForm.notes} onChange={handleMovement} />
        {movementForm.movement_type === "dispense" && <Alert type="info" message="Dispensing will reduce stock and add the charge to the patient's billing statement." />}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <Btn variant="secondary" onClick={() => setMovementModal(false)}>Cancel</Btn>
          <Btn onClick={saveMovement} disabled={saving || !movementForm.item || !movementForm.quantity || (movementForm.movement_type === "dispense" && !movementForm.patient)}>Save</Btn>
        </div>
      </Modal>
    </div>
  );
}

function ItemsTable({ items }) {
  if (!items.length) return <Empty icon="RX" message="No pharmacy items configured" />;
  return (
    <div className="table-shell" style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr>{["Code", "Item", "Category", "Stock", "Price", "Expiry", "Status"].map((head) => <Th key={head}>{head}</Th>)}</tr></thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} style={{ borderBottom: "1px solid var(--border-light)" }}>
              <Td>{item.code}</Td>
              <Td>
                <div style={{ fontWeight: 700, color: "var(--card-ink)" }}>{item.name}</div>
                <div style={{ color: "var(--text-mute)", fontSize: 12 }}>{item.generic_name || item.strength || "-"}</div>
              </Td>
              <Td>{item.category}</Td>
              <Td>{item.stock_quantity} {item.unit}</Td>
              <Td>Rs. {item.selling_price}</Td>
              <Td>{item.expiry_date || "-"}</Td>
              <Td>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {item.is_low_stock && <Badge label="low stock" color="var(--amber)" />}
                  {item.is_expired && <Badge label="expired" color="var(--red)" />}
                  {!item.is_low_stock && !item.is_expired && <Badge label="ok" color="var(--green)" />}
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MovementsTable({ movements }) {
  if (!movements.length) return <Empty icon="MV" message="No stock movements yet" />;
  return (
    <div className="table-shell" style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr>{["Date", "Type", "Item", "Patient", "Qty", "Amount", "Billing"].map((head) => <Th key={head}>{head}</Th>)}</tr></thead>
        <tbody>
          {movements.map((movement) => (
            <tr key={movement.id} style={{ borderBottom: "1px solid var(--border-light)" }}>
              <Td>{new Date(movement.created_at).toLocaleString()}</Td>
              <Td><Badge label={movement.movement_type.replace("_", " ")} color={MOVEMENT_COLOR[movement.movement_type] || "var(--text-mute)"} /></Td>
              <Td>{movement.item_detail?.name || "-"}</Td>
              <Td>{movement.patient_detail?.full_name || "-"}</Td>
              <Td>{movement.quantity}</Td>
              <Td>Rs. {movement.line_total}</Td>
              <Td>
                {movement.invoice_number ? (
                  <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                    <span>{movement.invoice_number}</span>
                    <Badge label={movement.invoice_status || "draft"} color={INVOICE_STATUS_COLOR[movement.invoice_status] || "var(--text-mute)"} />
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
