import { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import TopBar from './components/TopBar';
import LoginScreen from './components/LoginScreen';
import SetupScreen from './components/SetupScreen';
import NotesScreen from './components/NotesScreen';
import LiveScreen from './components/LiveScreen';

function AppContent() {
  const { screen } = useApp();

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '16px 20px', minHeight: '100vh' }}>
      <TopBar />
      {screen === 'setup' && <SetupScreen />}
      {screen === 'notes' && <NotesScreen />}
      {screen === 'live' && <LiveScreen />}
    </div>
  );
}

function AppShell() {
  const [loggedIn, setLoggedIn] = useState(() => {
    try {
      const s = localStorage.getItem('vdj-session');
      if (s) { const p = JSON.parse(s); return !!(p && p.email); }
    } catch (e) { /* */ }
    return false;
  });

  if (!loggedIn) {
    return (
      <AppProvider>
        <LoginScreen />
      </AppProvider>
    );
  }

  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default AppShell;
