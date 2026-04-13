import { Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ProtectedRoute } from "./router/ProtectedRoute";

// Public pages
import { LandingPage } from "./pages/LandingPage";
import { DemoSandboxPage } from "./pages/DemoSandboxPage";
import { PricingPage } from "./pages/PricingPage";

// Auth pages
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { TwoFactorPage } from "./pages/TwoFactorPage";

// Protected dashboard pages
import { AdminDashboardPage } from "./pages/AdminDashboardPage";
import { Phase5OperationsPage } from "./pages/Phase5OperationsPage";
import { ScanPage } from "./pages/ScanPage";
import { ScanDetailPage } from "./pages/ScanDetailPage";
import { ReconPage } from "./pages/ReconPage";
import { AIAnalysisPage } from "./pages/AIAnalysisPage";
import { ProfilePage } from "./pages/ProfilePage";

export function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* ------------------------------------------------------------------ */}
        {/* Public routes — no auth required */}
        {/* ------------------------------------------------------------------ */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/demo" element={<DemoSandboxPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/auth/login" element={<LoginPage />} />
        <Route path="/auth/register" element={<RegisterPage />} />
        <Route path="/auth/forgot" element={<ForgotPasswordPage />} />
        <Route path="/auth/2fa" element={<TwoFactorPage />} />

        {/* ------------------------------------------------------------------ */}
        {/* Protected routes — requires authentication */}
        {/* ------------------------------------------------------------------ */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/phase5"
          element={
            <ProtectedRoute>
              <Phase5OperationsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/scans"
          element={
            <ProtectedRoute>
              <ScanPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/scans/:id"
          element={
            <ProtectedRoute>
              <ScanDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/recon"
          element={
            <ProtectedRoute>
              <ReconPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ai"
          element={
            <ProtectedRoute>
              <AIAnalysisPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </AuthProvider>
  );
}

