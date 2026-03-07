// LOCATION: HMS/frontend/src/App.jsx — REPLACE entire file

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import useAuthStore from "./store/authStore";
import AppLayout from "./layouts/AppLayout";
import Login from "./pages/auth/Login";

// Reception
import ReceptionDashboard from "./pages/reception/index";
import ReceptionPatients  from "./pages/reception/Patients";
import ReceptionAppts     from "./pages/reception/Appointments";

// Doctor
import DoctorDashboard    from "./pages/doctor/index";
import DoctorPatients     from "./pages/doctor/Patients";
import DoctorAppts        from "./pages/doctor/Appointments";
import PatientDetail      from "./pages/doctor/PatientDetail";

// Admin
import AdminDashboard     from "./pages/admin/index";
import Staff              from "./pages/admin/Staff";

function RequireAuth({ children }) {
  const { user } = useAuthStore();
  return user ? children : <Navigate to="/login" replace />;
}

function getRole(user) {
  if (!user) return null;
  return user.is_tenant_admin ? "hospital_admin" : user.role;
}

function getDefaultRoute(user) {
  const role = getRole(user);
  const map = {
    hospital_admin: "/admin",
    doctor:         "/doctor",
    nurse:          "/doctor",
    receptionist:   "/reception",
  };
  return map[role] || "/reception";
}

export default function App() {
  const { user } = useAuthStore();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={!user ? <Login /> : <Navigate to={getDefaultRoute(user)} replace />} />

        <Route path="/" element={<RequireAuth><AppLayout /></RequireAuth>}>
          <Route index element={<Navigate to={getDefaultRoute(user)} replace />} />

          {/* Reception */}
          <Route path="reception"              element={<ReceptionDashboard />} />
          <Route path="reception/patients"     element={<ReceptionPatients />} />
          <Route path="reception/appointments" element={<ReceptionAppts />} />

          {/* Doctor */}
          <Route path="doctor"                    element={<DoctorDashboard />} />
          <Route path="doctor/patients"           element={<DoctorPatients />} />
          <Route path="doctor/patients/:id"       element={<PatientDetail />} />
          <Route path="doctor/appointments"       element={<DoctorAppts />} />

          {/* Admin — also has access to doctor views */}
          <Route path="admin"                     element={<AdminDashboard />} />
          <Route path="admin/staff"               element={<Staff />} />
          <Route path="admin/patients"            element={<DoctorPatients />} />
          <Route path="admin/patients/:id"        element={<PatientDetail />} />
          <Route path="admin/appointments"        element={<ReceptionAppts />} />
        </Route>

        <Route path="*" element={<Navigate to={user ? getDefaultRoute(user) : "/login"} replace />} />
      </Routes>
    </BrowserRouter>
  );
}