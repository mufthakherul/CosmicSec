import React, { Suspense, useEffect, useRef, useState } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { ProtectedRoute } from "./router/ProtectedRoute";
import { SkipLink } from "./components/ui/SkipLink";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { PageSkeleton } from "./components/PageSkeleton";
import { SWUpdateBanner } from "./components/SWUpdateBanner";
import { PWAInstallBanner } from "./components/PWAInstallBanner";
import { RouteProgressBar } from "./components/RouteProgressBar";

// Public pages (eagerly loaded — above the fold)
import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";

// Lazy-loaded pages — split into per-route chunks
const DemoSandboxPage = React.lazy(() =>
  import("./pages/DemoSandboxPage").then((m) => ({ default: m.DemoSandboxPage })),
);
const PricingPage = React.lazy(() =>
  import("./pages/PricingPage").then((m) => ({ default: m.PricingPage })),
);
const ForgotPasswordPage = React.lazy(() =>
  import("./pages/ForgotPasswordPage").then((m) => ({ default: m.ForgotPasswordPage })),
);
const TwoFactorPage = React.lazy(() =>
  import("./pages/TwoFactorPage").then((m) => ({ default: m.TwoFactorPage })),
);
const DashboardPage = React.lazy(() =>
  import("./pages/DashboardPage").then((m) => ({ default: m.DashboardPage })),
);
const AdminDashboardPage = React.lazy(() =>
  import("./pages/AdminDashboardPage").then((m) => ({ default: m.AdminDashboardPage })),
);
const Phase5OperationsPage = React.lazy(() =>
  import("./pages/Phase5OperationsPage").then((m) => ({ default: m.Phase5OperationsPage })),
);
const ScanPage = React.lazy(() =>
  import("./pages/ScanPage").then((m) => ({ default: m.ScanPage })),
);
const ScanDetailPage = React.lazy(() =>
  import("./pages/ScanDetailPage").then((m) => ({ default: m.ScanDetailPage })),
);
const ReconPage = React.lazy(() =>
  import("./pages/ReconPage").then((m) => ({ default: m.ReconPage })),
);
const AIAnalysisPage = React.lazy(() =>
  import("./pages/AIAnalysisPage").then((m) => ({ default: m.AIAnalysisPage })),
);
const ProfilePage = React.lazy(() =>
  import("./pages/ProfilePage").then((m) => ({ default: m.ProfilePage })),
);
const ReportsPage = React.lazy(() =>
  import("./pages/ReportsPage").then((m) => ({ default: m.ReportsPage })),
);
const BugBountyPage = React.lazy(() =>
  import("./pages/BugBountyPage").then((m) => ({ default: m.BugBountyPage })),
);
const TimelinePage = React.lazy(() =>
  import("./pages/TimelinePage").then((m) => ({ default: m.TimelinePage })),
);
const SettingsPage = React.lazy(() =>
  import("./pages/SettingsPage").then((m) => ({ default: m.SettingsPage })),
);
const AgentsPage = React.lazy(() =>
  import("./pages/AgentsPage").then((m) => ({ default: m.AgentsPage })),
);
const NotFoundPage = React.lazy(() =>
  import("./pages/NotFoundPage").then((m) => ({ default: m.NotFoundPage })),
);

export function App() {
  const location = useLocation();
  const mainRef = useRef<HTMLElement | null>(null);
  const [routeAnnouncement, setRouteAnnouncement] = useState("");

  useEffect(() => {
    const pageLabel = document.title || location.pathname;
    setRouteAnnouncement(`Navigated to ${pageLabel}`);
    if (location.hash) {
      return;
    }
    mainRef.current?.focus();
  }, [location.pathname, location.search, location.hash]);

  return (
    <ThemeProvider>
      <AuthProvider>
        <ErrorBoundary>
          <SkipLink />
          <RouteProgressBar />
          <SWUpdateBanner />
          <PWAInstallBanner />
          <div className="sr-only" aria-live="polite" aria-atomic="true">
            {routeAnnouncement}
          </div>
          <Suspense fallback={<PageSkeleton />}>
            <main
              id="main-content"
              key={`${location.pathname}${location.search}`}
              className="page-enter"
              ref={mainRef}
              tabIndex={-1}
            >
            <Routes location={location}>
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
            </main>
          </Suspense>
        </ErrorBoundary>
      </AuthProvider>
    </ThemeProvider>
  );
}

