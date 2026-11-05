
/**
 * @file App.tsx
 * @description Componente radice dell'applicazione che imposta il routing, il layout generale e il provider di contesto.
 * Utilizza HashRouter per massima compatibilità in ambienti di anteprima e sandbox.
 */

import React, { useState, Suspense, lazy } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';

import { AppProviders, useFetchData, useAppState } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ExportProvider } from './context/ExportContext';
import { ToastProvider } from './context/ToastContext';
import { ThemeProvider } from './context/ThemeContext';
import { RoutesProvider, useRoutesManifest } from './context/RoutesContext';
import { KnowledgeBaseProvider } from './context/KnowledgeBaseContext';
import LoadingSkeleton from './components/LoadingSkeleton';
import Sidebar from './components/Sidebar';
import BottomNavBar from './components/BottomNavBar';
import HeaderActions from './components/HeaderActions';
import SearchWidget from './components/SearchWidget';
import { SpinnerIcon } from './components/icons';
import { FormFieldFeedback } from './components/forms';

// Lazy load all page components
const GlobalSearchPage = lazy(() => import('./pages/GlobalSearchPage'));
const StaffingPage = lazy(() => import('./pages/StaffingPage').then(module => ({ default: module.StaffingPage })));
const ResourcesPage = lazy(() => import('./pages/ResourcesPage'));
const ProjectsPage = lazy(() => import('./pages/ProjectsPage'));
const ClientsPage = lazy(() => import('./pages/ClientsPage'));
const RolesPage = lazy(() => import('./pages/RolesPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ExportPage = lazy(() => import('./pages/ExportPage'));
const ConfigPage = lazy(() => import('./pages/ConfigPage'));
const RateCardsPage = lazy(() => import('./pages/RateCardsPage'));
const ImportPage = lazy(() => import('./pages/ImportPage'));
const ForecastingPage = lazy(() => import('./pages/ForecastingPage'));
const SimulationPage = lazy(() => import('./pages/SimulationPage'));
const GanttPage = lazy(() => import('./pages/GanttPage'));
const CalendarPage = lazy(() => import('./pages/CalendarPage'));
const WorkloadPage = lazy(() => import('./pages/WorkloadPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const AdminSettingsPage = lazy(() => import('./pages/AdminSettingsPage'));
const SecurityCenterPage = lazy(() => import('./pages/SecurityCenterPage'));
const DbInspectorPage = lazy(() => import('./pages/DbInspectorPage'));
const StaffingVisualizationPage = lazy(() => import('./pages/StaffingVisualizationPage'));
const UserManualPage = lazy(() => import('./pages/UserManualPage'));
const SimpleUserManualPage = lazy(() => import('./pages/SimpleUserManualPage'));
const InterviewsPage = lazy(() => import('./pages/InterviewsPage'));
const SkillsMapPage = lazy(() => import('./pages/SkillsMapPage'));
const SkillsPage = lazy(() => import('./pages/SkillsPage'));
const SkillAnalysisPage = lazy(() => import('./pages/SkillAnalysisPage'));
const CertificationsPage = lazy(() => import('./pages/CertificationsPage'));
const LeavePage = lazy(() => import('./pages/LeavePage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const NotificationSettingsPage = lazy(() => import('./pages/NotificationSettingsPage'));
const ResourceRequestPage = lazy(() => import('./pages/ResourceRequestPage').then(module => ({ default: module.ResourceRequestPage })));
const ContractsPage = lazy(() => import('./pages/ContractsPage').then(module => ({ default: module.ContractsPage })));
const WbsAllocationPage = lazy(() => import('./pages/WbsAllocationPage').then(module => ({ default: module.WbsAllocationPage })));
const RevenuePage = lazy(() => import('./pages/RevenuePage').then(module => ({ default: module.RevenuePage })));
const PerformanceTimelinePage = lazy(() => import('./pages/PerformanceTimeline').then(module => ({ default: module.PerformanceTimelinePage })));
const OrgChartPage = lazy(() => import('./pages/OrgChartPage'));
const KnowledgeBasePage = lazy(() => import('./pages/KnowledgeBasePage'));

interface HeaderProps {
  onToggleSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const location = useLocation();
  const { getBreadcrumb } = useRoutesManifest();
  const breadcrumbs = getBreadcrumb(location.pathname);
  
  return (
    <header className="flex-shrink-0 bg-surface border-b border-outline-variant sticky top-0 z-30">
      <div className="flex items-center justify-between p-4 h-20">
        <button
          onClick={onToggleSidebar}
          className="text-on-surface-variant focus:outline-none md:hidden p-2 rounded-full hover:bg-surface-container"
          aria-label="Apri menu"
        >
          <span className="material-symbols-outlined">menu</span>
        </button>
        
        <nav aria-label="breadcrumb" className="flex-1 min-w-0">
          <div className="flex items-center gap-4">
            <ol className="flex items-center space-x-1 text-sm md:text-base truncate">
              {breadcrumbs.map((crumb, index) => (
                <li key={crumb.path} className="flex items-center">
                  {index > 0 && (
                    <span className="material-symbols-outlined text-on-surface-variant text-base mx-1">chevron_right</span>
                  )}
                  {index === breadcrumbs.length - 1 ? (
                    <span className="font-semibold text-on-surface truncate" aria-current="page">{crumb.label}</span>
                  ) : (
                    <Link to={crumb.path} className="text-on-surface-variant hover:text-on-surface hover:underline">
                      {crumb.label}
                    </Link>
                  )}
                </li>
              ))}
            </ol>
          </div>
        </nav>

        <HeaderActions />
      </div>
    </header>
  );
};

// RBAC Protected Route Wrapper
const DynamicRoute: React.FC<{ path: string; children: React.ReactElement }> = ({ path, children }) => {
  const { isLoginProtectionEnabled, hasPermission } = useAuth();

  if (!isLoginProtectionEnabled) {
    return children;
  }

  if (!hasPermission(path)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

// Dynamic Home Redirect Component
const HomeRedirect: React.FC = () => {
  const { user, isLoginProtectionEnabled } = useAuth();
  const { loading } = useAppState();
  const { getHomeForRole } = useRoutesManifest();

  if (loading) return <LoadingSkeleton />;

  if (!isLoginProtectionEnabled) {
    return <Navigate to={getHomeForRole()} replace />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const target = getHomeForRole(user.role);
  return <Navigate to={target} replace />;
};

const ErrorScreen: React.FC<{ message: string; onRetry: () => void }> = ({ message, onRetry }) => (
  <div className="flex flex-col items-center justify-center h-full p-6 gap-4 text-center">
    <span className="material-symbols-outlined text-4xl text-error">error</span>
    <h2 className="text-lg font-semibold text-on-surface">Errore di caricamento</h2>
    <p className="text-sm text-on-surface-variant max-w-md">{message}</p>
    <button onClick={onRetry} className="px-6 py-2 bg-primary text-on-primary rounded-full font-medium hover:opacity-90">Riprova</button>
  </div>
);

interface AppContentProps {
  onToggleSidebar: () => void;
}

const AppContent: React.FC<AppContentProps> = ({ onToggleSidebar }) => {
  const { loading, fetchError } = useAppState();
  const fetchData = useFetchData();

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (fetchError) {
    return <ErrorScreen message={fetchError} onRetry={fetchData} />;
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden transition-all duration-300">
      <Header onToggleSidebar={onToggleSidebar} />

      <main className="flex-1 overflow-y-auto bg-background pb-20 md:pb-0">
        <div className="w-full max-w-none px-4 sm:px-6 py-4 sm:py-6">
          <Suspense fallback={<LoadingSkeleton variant="content" />}>
            <Routes>
              <Route path="/" element={<HomeRedirect />} />
              <Route path="/global-search" element={<DynamicRoute path="/global-search"><GlobalSearchPage /></DynamicRoute>} />
              <Route path="/staffing" element={<DynamicRoute path="/staffing"><StaffingPage /></DynamicRoute>} />
              <Route path="/resources" element={<DynamicRoute path="/resources"><ResourcesPage /></DynamicRoute>} />
              <Route path="/skills" element={<DynamicRoute path="/skills"><SkillsPage /></DynamicRoute>} />
              <Route path="/certifications" element={<DynamicRoute path="/certifications"><CertificationsPage /></DynamicRoute>} />
              <Route path="/projects" element={<DynamicRoute path="/projects"><ProjectsPage /></DynamicRoute>} />
              <Route path="/clients" element={<DynamicRoute path="/clients"><ClientsPage /></DynamicRoute>} />
              <Route path="/roles" element={<DynamicRoute path="/roles"><RolesPage /></DynamicRoute>} />
              <Route path="/contracts" element={<DynamicRoute path="/contracts"><ContractsPage /></DynamicRoute>} />
              <Route path="/wbs-analysis" element={<DynamicRoute path="/wbs-analysis"><WbsAllocationPage /></DynamicRoute>} />
              <Route path="/dashboard" element={<DynamicRoute path="/dashboard"><DashboardPage /></DynamicRoute>} />
              <Route path="/forecasting" element={<DynamicRoute path="/forecasting"><ForecastingPage /></DynamicRoute>} />
              <Route path="/simulation" element={<DynamicRoute path="/simulation"><SimulationPage /></DynamicRoute>} />
              <Route path="/workload" element={<DynamicRoute path="/workload"><WorkloadPage /></DynamicRoute>} />
              <Route path="/gantt" element={<DynamicRoute path="/gantt"><GanttPage /></DynamicRoute>} />
              <Route path="/calendar" element={<DynamicRoute path="/calendar"><CalendarPage /></DynamicRoute>} />
              <Route path="/export" element={<DynamicRoute path="/export"><ExportPage /></DynamicRoute>} />
              <Route path="/import" element={<DynamicRoute path="/import"><ImportPage /></DynamicRoute>} />
              <Route path="/config" element={<DynamicRoute path="/config"><ConfigPage /></DynamicRoute>} />
              <Route path="/rate-cards" element={<DynamicRoute path="/rate-cards"><RateCardsPage /></DynamicRoute>} />
              <Route path="/reports" element={<DynamicRoute path="/reports"><ReportsPage /></DynamicRoute>} />
              <Route path="/resource-requests" element={<DynamicRoute path="/resource-requests"><ResourceRequestPage /></DynamicRoute>} />
              <Route path="/interviews" element={<DynamicRoute path="/interviews"><InterviewsPage /></DynamicRoute>} />
              <Route path="/skills-map" element={<DynamicRoute path="/skills-map"><SkillsMapPage /></DynamicRoute>} />
              <Route path="/skill-analysis" element={<DynamicRoute path="/skill-analysis"><SkillAnalysisPage /></DynamicRoute>} />
              <Route path="/staffing-visualization" element={<DynamicRoute path="/staffing-visualization"><StaffingVisualizationPage /></DynamicRoute>} />
              <Route path="/manuale-utente" element={<DynamicRoute path="/manuale-utente"><UserManualPage /></DynamicRoute>} />
              <Route path="/simple-user-manual" element={<DynamicRoute path="/simple-user-manual"><SimpleUserManualPage /></DynamicRoute>} />
              <Route path="/leaves" element={<DynamicRoute path="/leaves"><LeavePage /></DynamicRoute>} />
              <Route path="/notifications" element={<DynamicRoute path="/notifications"><NotificationsPage /></DynamicRoute>} />
              <Route path="/revenue" element={<DynamicRoute path="/revenue"><RevenuePage /></DynamicRoute>} />
              <Route path="/performance" element={<DynamicRoute path="/performance"><PerformanceTimelinePage /></DynamicRoute>} />
              <Route path="/org-chart" element={<DynamicRoute path="/org-chart"><OrgChartPage /></DynamicRoute>} />
              <Route path="/knowledge-base" element={<DynamicRoute path="/knowledge-base"><KnowledgeBasePage /></DynamicRoute>} />

              <Route path="/admin-settings" element={<DynamicRoute path="/admin-settings"><AdminSettingsPage /></DynamicRoute>} />
              <Route path="/security-center" element={<DynamicRoute path="/security-center"><SecurityCenterPage /></DynamicRoute>} />
              <Route path="/notification-settings" element={<DynamicRoute path="/notification-settings"><NotificationSettingsPage /></DynamicRoute>} />
              <Route path="/db-inspector" element={<DynamicRoute path="/db-inspector"><DbInspectorPage /></DynamicRoute>} />
              
              <Route path="*" element={<HomeRedirect />} />
            </Routes>
          </Suspense>
        </div>
      </main>
      
      {/* Search Palette Portal */}
      <SearchWidget />
    </div>
  );
};

const ForcePasswordChange: React.FC = () => {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { changePassword, logout } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (newPassword.length < 8) { setError('La password deve essere di almeno 8 caratteri.'); return; }
        if (newPassword !== confirmPassword) { setError('Le password non coincidono.'); return; }
        setLoading(true);
        try { await changePassword(newPassword); } catch (e) { setError('Errore durante il cambio password.'); } finally { setLoading(false); }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
            <div className="w-full max-w-md p-8 bg-surface rounded-2xl shadow-lg border border-outline-variant">
                <div className="text-center mb-6">
                    <span className="material-symbols-outlined text-5xl text-primary mb-2">lock_reset</span>
                    <h1 className="text-2xl font-bold text-on-surface">Cambio Password Obbligatorio</h1>
                    <p className="text-sm text-on-surface-variant mt-2">Per motivi di sicurezza, devi cambiare la tua password al primo accesso.</p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-on-surface-variant mb-1">Nuova Password</label>
                        <input type="password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="form-input w-full" placeholder="Minimo 8 caratteri"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-on-surface-variant mb-1">Conferma Password</label>
                        <input type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="form-input w-full" placeholder="Ripeti password"/>
                    </div>
                    {error && <div className="text-error text-sm text-center font-medium">{error}</div>}
                    <button type="submit" disabled={loading} className="w-full py-2 px-4 bg-primary text-on-primary rounded-full font-bold hover:opacity-90 disabled:opacity-50 flex justify-center items-center">
                        {loading ? <SpinnerIcon className="w-5 h-5" /> : 'Cambia Password e Accedi'}
                    </button>
                </form>
                <button onClick={logout} className="mt-4 text-sm text-on-surface-variant hover:text-on-surface w-full text-center">Torna al Login</button>
            </div>
        </div>
    );
};

const MainLayout: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { user } = useAuth();
  if (user?.mustChangePassword) return <ForcePasswordChange />;
  return (
    <>
      {isSidebarOpen && <div className="fixed inset-0 bg-scrim bg-opacity-50 z-40 md:hidden" onClick={() => setIsSidebarOpen(false)}/>}
      <div className="flex h-screen w-screen overflow-hidden bg-background">
        <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
        <AppContent onToggleSidebar={() => setIsSidebarOpen(true)} />
        <BottomNavBar onMenuClick={() => setIsSidebarOpen(true)} />
      </div>
    </>
  );
};

const ProtectedRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { isAuthLoading, isLoginProtectionEnabled, isAuthenticated } = useAuth();
  if (isAuthLoading) return <LoadingSkeleton />;
  if (isLoginProtectionEnabled && !isAuthenticated) return <Navigate to="/login" replace />;
  return children;
};

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<Suspense fallback={<LoadingSkeleton />}><LoginPage /></Suspense>} />
      <Route path="/*" element={<ProtectedRoute><MainLayout /></ProtectedRoute>} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <HashRouter>
      <ThemeProvider>
        <ToastProvider>
          <AppProviders>
            <AuthProvider>
              <ExportProvider>
                <RoutesProvider>
                  <KnowledgeBaseProvider>
                    <AppRoutes />
                  </KnowledgeBaseProvider>
                </RoutesProvider>
              </ExportProvider>
            </AuthProvider>
          </AppProviders>
        </ToastProvider>
      </ThemeProvider>
    </HashRouter>
  );
};

export default App;
