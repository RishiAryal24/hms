import api from "./axios";

export const getLabSummary = () => api.get("/lab/summary/");
export const getLabTests = (params) => api.get("/lab/tests/", { params });
export const createLabTest = (data) => api.post("/lab/tests/", data);
export const getLabOrders = (params) => api.get("/lab/orders/", { params });
export const createLabOrder = (data) => api.post("/lab/orders/", data);
export const getLabOrder = (id) => api.get(`/lab/orders/${id}/`);
export const collectLabSample = (id) => api.post(`/lab/orders/${id}/collect/`);
export const enterLabResult = (orderId, itemId, data) => api.patch(`/lab/orders/${orderId}/items/${itemId}/result/`, data);
