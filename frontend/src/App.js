import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import PWAInstallBanner from "./components/PWAInstallBanner";
import LandingPage from "./pages/LandingPage";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AdminDashboard from "./pages/AdminDashboard";
import MechanicDashboard from "./pages/MechanicDashboard";
import AddService from "./pages/AddService";
import ServicesAdmin from "./pages/ServicesAdmin";
import MechanicsAdmin from "./pages/MechanicsAdmin";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Billing from "./pages/Billing";
import PaymentResult from "./pages/PaymentResult";
import MyServices from "./pages/MyServices";

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-white text-sm font-medium" style={{ fontFamily: 'Outfit' }}>Carregando AutoGestão...</p>
      </div>
    </div>
  );
}

function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={user.role === "admin" ? "/admin/dashboard" : "/mechanic/dashboard"} replace />;
  }
  return children;
}

function DashboardRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === "admin") return <Navigate to="/admin/dashboard" replace />;
  return <Navigate to="/mechanic/dashboard" replace />;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}

function App() {
  return (
    <AuthProvider>
      <div className="app-container">
        <BrowserRouter>
          <PWAInstallBanner />
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

            {/* Redirect */}
            <Route path="/dashboard" element={<DashboardRedirect />} />

            {/* Admin Routes */}
            <Route path="/admin/dashboard" element={<ProtectedRoute allowedRoles={["admin"]}><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/services" element={<ProtectedRoute allowedRoles={["admin"]}><ServicesAdmin /></ProtectedRoute>} />
            <Route path="/admin/mechanics" element={<ProtectedRoute allowedRoles={["admin"]}><MechanicsAdmin /></ProtectedRoute>} />
            <Route path="/admin/reports" element={<ProtectedRoute allowedRoles={["admin"]}><Reports /></ProtectedRoute>} />
            <Route path="/admin/settings" element={<ProtectedRoute allowedRoles={["admin"]}><Settings /></ProtectedRoute>} />
            <Route path="/admin/billing" element={<ProtectedRoute allowedRoles={["admin"]}><Billing /></ProtectedRoute>} />
            <Route path="/admin/add-service" element={<ProtectedRoute allowedRoles={["admin"]}><AddService /></ProtectedRoute>} />

            {/* Mechanic Routes */}
            <Route path="/mechanic/dashboard" element={<ProtectedRoute allowedRoles={["mechanic"]}><MechanicDashboard /></ProtectedRoute>} />
            <Route path="/mechanic/add-service" element={<ProtectedRoute allowedRoles={["mechanic"]}><AddService /></ProtectedRoute>} />
            <Route path="/mechanic/services" element={<ProtectedRoute allowedRoles={["mechanic"]}><MyServices /></ProtectedRoute>} />

            {/* Payment Result - Public routes after Asaas redirect */}
            <Route path="/billing/success" element={<PaymentResult />} />
            <Route path="/billing/failed" element={<PaymentResult />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </div>
    </AuthProvider>
  );
}

export default App;
