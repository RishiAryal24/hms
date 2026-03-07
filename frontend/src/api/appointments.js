// LOCATION: HMS/frontend/src/api/appointments.js

import api from "./axios";

export const getAppointments    = (params)   => api.get("/appointments/", { params });
export const getTodayAppointments = (params) => api.get("/appointments/today/", { params });
export const bookAppointment    = (data)     => api.post("/appointments/book/", data);
export const getAppointment     = (id)       => api.get(`/appointments/${id}/`);
export const updateAppointment  = (id, data) => api.patch(`/appointments/${id}/update/`, data);
export const cancelAppointment  = (id, data) => api.post(`/appointments/${id}/cancel/`, data);
export const completeAppointment= (id, data) => api.post(`/appointments/${id}/complete/`, data);
export const checkAvailability  = (params)   => api.get("/appointments/availability/", { params });
export const getSchedules       = ()         => api.get("/appointments/schedules/");
export const createSchedule     = (data)     => api.post("/appointments/schedules/", data);
export const updateSchedule     = (id, data) => api.patch(`/appointments/schedules/${id}/`, data);
export const deleteSchedule     = (id)       => api.delete(`/appointments/schedules/${id}/`);
export const getLeaves          = ()         => api.get("/appointments/leaves/");
export const createLeave        = (data)     => api.post("/appointments/leaves/", data);
export const getQueue           = (params)   => api.get("/appointments/queue/", { params });
export const updateQueue        = (id, data) => api.post(`/appointments/queue/${id}/update/`, data);
