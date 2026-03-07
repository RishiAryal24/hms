// LOCATION: HMS/frontend/src/api/auth.js

import api from "./axios";

export const login       = (data)     => api.post("/auth/login/", data);
export const logout      = (refresh)  => api.post("/auth/logout/", { refresh });
export const getMe       = ()         => api.get("/auth/me/");
export const changePassword = (data)  => api.post("/auth/change-password/", data);
export const getStaff    = (params)   => api.get("/auth/staff/", { params });
export const createStaff = (data)     => api.post("/auth/staff/", data);
export const updateStaff = (id, data) => api.patch(`/auth/staff/${id}/`, data);
export const deleteStaff = (id)       => api.delete(`/auth/staff/${id}/`);
export const resetPassword = (id, data) => api.post(`/auth/staff/${id}/reset-password/`, data);
export const getRoles    = ()         => api.get("/auth/roles/");
