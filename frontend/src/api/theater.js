import api from "./axios";

export const getTheaterSummary = () => api.get("/theater/summary/");
export const getTheaterOptions = () => api.get("/theater/options/");

export const getProcedures = (params) => api.get("/theater/procedures/", { params });
export const createProcedure = (data) => api.post("/theater/procedures/", data);

export const getOperatingRooms = (params) => api.get("/theater/rooms/", { params });
export const createOperatingRoom = (data) => api.post("/theater/rooms/", data);

export const getTheaterBookings = (params) => api.get("/theater/bookings/", { params });
export const createTheaterBooking = (data) => api.post("/theater/bookings/", data);
export const getTheaterBooking = (id) => api.get(`/theater/bookings/${id}/`);
export const startTheaterBooking = (id) => api.post(`/theater/bookings/${id}/start/`);
export const completeTheaterBooking = (id, data) => api.patch(`/theater/bookings/${id}/complete/`, data);
export const cancelTheaterBooking = (id, data) => api.post(`/theater/bookings/${id}/cancel/`, data);
