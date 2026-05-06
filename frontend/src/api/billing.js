import api from "./axios";

export const getBillingSummary = () => api.get("/billing/summary/");
export const getChargeItems = (params) => api.get("/billing/charges/", { params });
export const createChargeItem = (data) => api.post("/billing/charges/", data);

export const getInvoices = (params) => api.get("/billing/invoices/", { params });
export const createInvoice = (data) => api.post("/billing/invoices/", data);
export const getInvoice = (id) => api.get(`/billing/invoices/${id}/`);
export const issueInvoice = (id) => api.post(`/billing/invoices/${id}/issue/`);
export const cancelInvoice = (id) => api.post(`/billing/invoices/${id}/cancel/`);

export const addInvoiceLine = (invoiceId, data) => api.post(`/billing/invoices/${invoiceId}/lines/`, data);
export const updateInvoiceLine = (invoiceId, lineId, data) => api.patch(`/billing/invoices/${invoiceId}/lines/${lineId}/`, data);
export const deleteInvoiceLine = (invoiceId, lineId) => api.delete(`/billing/invoices/${invoiceId}/lines/${lineId}/`);

export const getPayments = (invoiceId) => api.get(`/billing/invoices/${invoiceId}/payments/`);
export const createPayment = (invoiceId, data) => api.post(`/billing/invoices/${invoiceId}/payments/create/`, data);
