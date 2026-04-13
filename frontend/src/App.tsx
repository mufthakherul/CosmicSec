import { Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { ProtectedRoute } from "./router/ProtectedRoute";
import { SkipLink } from "./components/ui/SkipLink";
import { ErrorBoundary } from "./components/ErrorBoundary";

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
import { DashboardPage } from "./pages/DashboardPage";
import { AdminDashboardPage } from "./pages/AdminDashboardPage";
import { Phase5OperationsPage } from "./pages/Phase5OperationsPage";
import { ScanPage } from "./pages/ScanPage";
import { ScanDetailPage } from "./pages/ScanDetailPage";
import { ReconPage } from "./pages/ReconPage";
import { AIAnalysisPage } from "./pages/AIAnalysisPage";
import { ProfilePage } from "./pages/ProfilePage";
import { ReportsPage } from "./pages/ReportsPage";
import { BugBountyPage } from "./pages/BugBountyPage";
import { TimelinePage } from "./pages/TimelinePage";
import { SettingsPage } from "./pages/SettingsPage";
import { AgentsPage } from "./pages/AgentsPage";
import { NotFoundPage } from "./pages/NotFoundPage";

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ErrorBoundary>
          <SkipLink />
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
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
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
            <Route
              path="/reports"
              element={
                <ProtectedRoute>
                  <ReportsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/bugbounty"
              element={
                <ProtectedRoute>
                  <BugBountyPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/timeline"
              element={
                <ProtectedRoute>
                  <TimelinePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <SettingsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/agents"
              element={
                <ProtectedRoute>
                  <AgentsPage />
                </ProtectedRoute>
              }
            />

            {/* ------------------------------------------------------------------ */}
            {/* 404 catch-all */}
            {/* ------------------------------------------------------------------ */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </ErrorBoundary>
      </AuthProvider>
    </ThemeProvider>
  );
}

