import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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

function AppShell() {
  const [loggedIn] = useState(() => {
    try {
      const s = localStorage.getItem('vdj-session');
      if (s) { const p = JSON.parse(s); return !!(p && p.email); }
    } catch (e) { /* */ }
    return false;
  });

  return (
    <BrowserRouter>
      <AppProvider>
        <Routes>
          {/* Public viewer route - no auth required */}
          <Route path="/ao-vivo/:shareCode" element={<ViewerScreen />} />
          
          {/* App routes */}
          <Route path="*" element={
            loggedIn ? <AppLayout /> : (
              <Routes>
                <Route path="/login" element={<LoginScreen />} />
                <Route path="*" element={<Navigate to="/login" replace />} />
              </Routes>
            )
          } />
        </Routes>
      </AppProvider>
    </BrowserRouter>
  );
}

export default AppShell;
