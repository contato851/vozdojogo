import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SubscriptionProvider, useSubscription } from './context/SubscriptionContext';
import { OnboardingProvider } from './context/OnboardingContext';
import { AppProvider } from './context/AppContext';
import TopBar from './components/TopBar';
import GraceBanner from './components/GraceBanner';
import LoginScreen from './components/LoginScreen';
import PaywallScreen from './components/PaywallScreen';
import SetupScreen from './components/SetupScreen';
import NotesScreen from './components/NotesScreen';
import LiveScreen from './components/LiveScreen';
import ViewerScreen from './components/ViewerScreen';
import NotFound from './pages/NotFound';

// Onboarding components
import LandingPage from './components/onboarding/LandingPage';
import QualificationStep from './components/onboarding/QualificationStep';
import ProfileSummary from './components/onboarding/ProfileSummary';
import CreateAccount from './components/onboarding/CreateAccount';
import FirstGameWizard from './components/onboarding/FirstGameWizard';

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
  if (!subscribed) return <PaywallScreen />;

  return (
    <AppProvider>
      <AppLayout />
    </AppProvider>
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

function SmartLanding() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (user) return <Navigate to="/escalacao" replace />;

  return <LandingPage />;
}

function AppShell() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <OnboardingProvider>
          <Routes>
            {/* Public viewer route */}
            <Route path="/ao-vivo/:shareCode" element={
              <AppProvider>
                <ViewerScreen />
              </AppProvider>
            } />

            {/* Landing page - redirects to app if already authenticated */}
            <Route path="/" element={<SmartLanding />} />

            {/* Login for existing users */}
            <Route path="/login" element={<LoginScreen />} />

            {/* Onboarding routes */}
            <Route path="/onboarding/1" element={<QualificationStep step={1} />} />
            <Route path="/onboarding/2" element={<QualificationStep step={2} />} />
            <Route path="/onboarding/3" element={<QualificationStep step={3} />} />
            <Route path="/onboarding/4" element={<QualificationStep step={4} />} />
            <Route path="/onboarding/resumo" element={<ProfileSummary />} />
            <Route path="/onboarding/criar-conta" element={<CreateAccount />} />
            <Route path="/onboarding/primeiro-jogo" element={<FirstGameWizard />} />

            {/* App routes - auth + subscription required */}
            <Route path="/escalacao" element={<ProtectedApp />} />
            <Route path="/notas" element={<ProtectedApp />} />
            <Route path="/ao-vivo" element={<ProtectedApp />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </OnboardingProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default AppShell;
