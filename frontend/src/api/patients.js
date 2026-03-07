// LOCATION: HMS/frontend/src/api/patients.js

import api from "./axios";

export const getPatients    = (params)   => api.get("/patients/", { params });
export const getPatient     = (id)       => api.get(`/patients/${id}/`);
export const registerPatient = (data)    => api.post("/patients/register/", data);
export const updatePatient  = (id, data) => api.patch(`/patients/${id}/update/`, data);
export const getPatientSummary = (id)    => api.get(`/patients/${id}/summary/`);

export const getVitals      = (pid)      => api.get(`/patients/${pid}/vitals/`);
export const addVital       = (pid, data)=> api.post(`/patients/${pid}/vitals/`, data);

export const getAllergies    = (pid)      => api.get(`/patients/${pid}/allergies/`);
export const addAllergy     = (pid, data)=> api.post(`/patients/${pid}/allergies/`, data);

export const getMedications = (pid)      => api.get(`/patients/${pid}/medications/`);
export const addMedication  = (pid, data)=> api.post(`/patients/${pid}/medications/`, data);

export const getNotes       = (pid)      => api.get(`/patients/${pid}/notes/`);
export const addNote        = (pid, data)=> api.post(`/patients/${pid}/notes/`, data);

export const getAdmissions  = (pid)      => api.get(`/patients/${pid}/admissions/`);
export const admitPatient   = (pid, data)=> api.post(`/patients/${pid}/admissions/`, data);
