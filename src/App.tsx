import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SubscriptionProvider, useSubscription } from './context/SubscriptionContext';
import { AppProvider } from './context/AppContext';
import TopBar from './components/TopBar';
import GraceBanner from './components/GraceBanner';
import LandingPage from './components/LandingPage';
import LoginScreen from './components/LoginScreen';
import ResetPasswordScreen from './components/ResetPasswordScreen';
import PaywallScreen from './components/PaywallScreen';
import SetupScreen from './components/SetupScreen';
import NotesScreen from './components/NotesScreen';
import LiveScreen from './components/LiveScreen';
import ViewerScreen from './components/ViewerScreen';
import SettingsScreen from './components/SettingsScreen';
import NotFound from './pages/NotFound';
import DemoLayout from './components/DemoLayout';

function LoadingScreen() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', background: 'var(--bg)', color: 'var(--green)',
      fontFamily: 'var(--font-head)', fontSize: 24, letterSpacing: 3
    }}>
      CARREGANDO...
    </div>
  );
}

function AppLayout() {
  const location = useLocation();
  const path = location.pathname;

  let content;
  if (path === '/notas') content = <NotesScreen />;
  else if (path === '/ao-vivo') content = <LiveScreen />;
  else content = <SetupScreen />;

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '16px 20px', minHeight: '100vh' }}>
      <TopBar />
      <GraceBanner />
      {content}
    </div>
  );
}

function SubscriptionGate() {
  const { subscribed, loading } = useSubscription();

  if (loading) return <LoadingScreen />;
  // Paywall temporarily disabled while the Mercado Pago billing backend is
  // configured/tested end-to-end. Re-enable
  // `if (!subscribed) return <PaywallScreen />;` once ready to charge for real.

  return (
    <AppProvider>
      <AppLayout />
    </AppProvider>
  );
}

function ProtectedSettings() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <SubscriptionProvider>
      <SettingsScreen />
    </SubscriptionProvider>
  );
}

function ProtectedApp() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/" replace />;

  return (
    <SubscriptionProvider>
      <SubscriptionGate />
    </SubscriptionProvider>
  );
}

function AppShell() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public viewer route */}
          <Route path="/ao-vivo/:shareCode" element={
            <AppProvider>
              <ViewerScreen />
            </AppProvider>
          } />

          {/* Public demo route - no auth/subscription required */}
          <Route path="/demo/*" element={<DemoLayout />} />

          {/* Landing page - entry point at "/", explains the product + login */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginScreen />} />
          <Route path="/redefinir-senha" element={<ResetPasswordScreen />} />

          {/* Settings - auth required */}
          <Route path="/configuracoes" element={<ProtectedSettings />} />

          {/* App routes - auth + subscription required */}
          <Route path="/escalacao" element={<ProtectedApp />} />
          <Route path="/notas" element={<ProtectedApp />} />
          <Route path="/ao-vivo" element={<ProtectedApp />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default AppShell;
