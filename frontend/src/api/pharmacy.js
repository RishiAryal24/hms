import api from "./axios";

export const getPharmacySummary = () => api.get("/pharmacy/summary/");
export const getPharmacyItems = (params) => api.get("/pharmacy/items/", { params });
export const createPharmacyItem = (data) => api.post("/pharmacy/items/", data);
export const updatePharmacyItem = (id, data) => api.patch(`/pharmacy/items/${id}/`, data);
export const getStockMovements = (params) => api.get("/pharmacy/movements/", { params });
export const createStockMovement = (data) => api.post("/pharmacy/movements/", data);
