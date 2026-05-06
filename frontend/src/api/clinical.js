import api from "./axios";

export const getClinicalOptions = () => api.get("/clinical/options/");

export const getDoctorProfiles = (params) => api.get("/clinical/doctors/", { params });
export const createDoctorProfile = (data) => api.post("/clinical/doctors/", data);
export const updateDoctorProfile = (id, data) => api.patch(`/clinical/doctors/${id}/`, data);

export const getNurseProfiles = (params) => api.get("/clinical/nurses/", { params });
export const createNurseProfile = (data) => api.post("/clinical/nurses/", data);
export const updateNurseProfile = (id, data) => api.patch(`/clinical/nurses/${id}/`, data);
