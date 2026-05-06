import api from "./axios";

export const getWards = (params) => api.get("/inpatient/wards/", { params });
export const createWard = (data) => api.post("/inpatient/wards/", data);
export const updateWard = (id, data) => api.patch(`/inpatient/wards/${id}/`, data);

export const getRooms = (params) => api.get("/inpatient/rooms/", { params });
export const createRoom = (data) => api.post("/inpatient/rooms/", data);

export const getBeds = (params) => api.get("/inpatient/beds/", { params });
export const createBed = (data) => api.post("/inpatient/beds/", data);
export const updateBed = (id, data) => api.patch(`/inpatient/beds/${id}/`, data);

export const getActiveAdmissions = (params) => api.get("/inpatient/admissions/", { params });
export const getBedAssignments = (params) => api.get("/inpatient/assignments/", { params });
export const assignBed = (data) => api.post("/inpatient/assignments/", data);
export const releaseBed = (id) => api.post(`/inpatient/assignments/${id}/release/`);
export const transferBed = (data) => api.post("/inpatient/transfers/create/", data);
export const getBedTransfers = (params) => api.get("/inpatient/transfers/", { params });
export const getNursingRounds = (admissionId) => api.get(`/inpatient/admissions/${admissionId}/nursing-rounds/`);
export const createNursingRound = (admissionId, data) => api.post(`/inpatient/admissions/${admissionId}/nursing-rounds/`, data);
export const getDoctorRounds = (admissionId) => api.get(`/inpatient/admissions/${admissionId}/doctor-rounds/`);
export const createDoctorRound = (admissionId, data) => api.post(`/inpatient/admissions/${admissionId}/doctor-rounds/`, data);
