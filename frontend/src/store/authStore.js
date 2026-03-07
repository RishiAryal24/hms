// LOCATION: HMS/frontend/src/store/authStore.js

import { create } from "zustand";

const useAuthStore = create((set) => ({
  user:    JSON.parse(localStorage.getItem("user") || "null"),
  access:  localStorage.getItem("access")  || null,
  refresh: localStorage.getItem("refresh") || null,

  setAuth: (user, access, refresh) => {
    localStorage.setItem("user",    JSON.stringify(user));
    localStorage.setItem("access",  access);
    localStorage.setItem("refresh", refresh);
    set({ user, access, refresh });
  },

  clearAuth: () => {
    localStorage.clear();
    set({ user: null, access: null, refresh: null });
  },
}));

export default useAuthStore;
