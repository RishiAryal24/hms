import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import useAuthStore from "./store/authStore";
import AppLayout from "./layouts/AppLayout";
import Login from "./pages/auth/Login";

import ReceptionDashboard from "./pages/reception/index";
import ReceptionPatients from "./pages/reception/Patients";
import ReceptionAppts from "./pages/reception/Appointments";

import DoctorDashboard from "./pages/doctor/index";
import DoctorPatients from "./pages/doctor/Patients";
import DoctorAppts from "./pages/doctor/Appointments";
import PatientDetail from "./pages/doctor/PatientDetail";

import AdminDashboard from "./pages/admin/index";
import Staff from "./pages/admin/Staff";

function getRole(user) {
  if (!user) return null;
  return user.is_tenant_admin ? "hospital_admin" : user.role;
}

function getDefaultRoute(user) {
  const role = getRole(user);
  const map = {
    hospital_admin: "/admin",
    doctor: "/doctor",
    nurse: "/doctor",
    receptionist: "/reception",
  };
  return map[role] || "/reception";
}

function RequireAuth({ children }) {
  const { user } = useAuthStore();
  return user ? children : <Navigate to="/login" replace />;
}

function RequireRole({ allowed, children }) {
  const { user } = useAuthStore();
  const role = getRole(user);
  return allowed.includes(role) ? children : <Navigate to={getDefaultRoute(user)} replace />;
}

export default function App() {
  const { user } = useAuthStore();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={!user ? <Login /> : <Navigate to={getDefaultRoute(user)} replace />} />

        <Route path="/" element={<RequireAuth><AppLayout /></RequireAuth>}>
          <Route index element={<Navigate to={getDefaultRoute(user)} replace />} />

          <Route path="reception" element={<RequireRole allowed={["receptionist", "hospital_admin"]}><ReceptionDashboard /></RequireRole>} />
          <Route path="reception/patients" element={<RequireRole allowed={["receptionist", "hospital_admin"]}><ReceptionPatients /></RequireRole>} />
          <Route path="reception/appointments" element={<RequireRole allowed={["receptionist", "hospital_admin"]}><ReceptionAppts /></RequireRole>} />

          <Route path="doctor" element={<RequireRole allowed={["doctor", "nurse", "hospital_admin"]}><DoctorDashboard /></RequireRole>} />
          <Route path="doctor/patients" element={<RequireRole allowed={["doctor", "nurse", "hospital_admin"]}><DoctorPatients /></RequireRole>} />
          <Route path="doctor/patients/:id" element={<RequireRole allowed={["doctor", "nurse", "hospital_admin"]}><PatientDetail /></RequireRole>} />
          <Route path="doctor/appointments" element={<RequireRole allowed={["doctor", "nurse", "hospital_admin"]}><DoctorAppts /></RequireRole>} />

          <Route path="admin" element={<RequireRole allowed={["hospital_admin"]}><AdminDashboard /></RequireRole>} />
          <Route path="admin/staff" element={<RequireRole allowed={["hospital_admin"]}><Staff /></RequireRole>} />
          <Route path="admin/patients" element={<RequireRole allowed={["hospital_admin"]}><DoctorPatients /></RequireRole>} />
          <Route path="admin/patients/:id" element={<RequireRole allowed={["hospital_admin"]}><PatientDetail /></RequireRole>} />
          <Route path="admin/appointments" element={<RequireRole allowed={["hospital_admin"]}><ReceptionAppts /></RequireRole>} />
        </Route>

        <Route path="*" element={<Navigate to={user ? getDefaultRoute(user) : "/login"} replace />} />
      </Routes>
    </BrowserRouter>
  );
}
