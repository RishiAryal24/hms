import api from "./axios";

export const getHRSummary = () => api.get("/hr/summary/");
export const getHROptions = () => api.get("/hr/options/");

export const getEmployees = (params) => api.get("/hr/employees/", { params });
export const createEmployee = (data) => api.post("/hr/employees/", data);
export const updateEmployee = (id, data) => api.patch(`/hr/employees/${id}/`, data);

export const getRosters = (params) => api.get("/hr/rosters/", { params });
export const createRoster = (data) => api.post("/hr/rosters/", data);
export const updateRoster = (id, data) => api.patch(`/hr/rosters/${id}/`, data);
