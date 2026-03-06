import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import TopBar from './components/TopBar';
import LoginScreen from './components/LoginScreen';
import SetupScreen from './components/SetupScreen';
import NotesScreen from './components/NotesScreen';
import LiveScreen from './components/LiveScreen';
import ViewerScreen from './components/ViewerScreen';
import NotFound from './pages/NotFound';

function AppLayout() {
  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '16px 20px', minHeight: '100vh' }}>
      <TopBar />
      <Routes>
        <Route path="/" element={<SetupScreen />} />
        <Route path="/escalacao" element={<SetupScreen />} />
        <Route path="/notas" element={<NotesScreen />} />
        <Route path="/ao-vivo" element={<LiveScreen />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
}

function AuthGate() {
  const { user, loading } = useAuth();

  if (loading) {
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

  if (!user) return <LoginScreen />;

  return (
    <AppProvider>
      <AppLayout />
    </AppProvider>
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
          {/* All other routes go through auth */}
          <Route path="*" element={<AuthGate />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default AppShell;
