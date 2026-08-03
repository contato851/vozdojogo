import { Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { ClipboardList, NotebookPen, Check } from 'lucide-react';
import { AppProvider, useApp } from '../context/AppContext';
import Logo from './Logo';
import SetupScreen from './SetupScreen';
import NotesScreen from './NotesScreen';
import LiveScreen from './LiveScreen';

function DemoTopBar() {
  const { liveState, startLive, savedIndicator } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname;

  const goLive = () => {
    if (liveState) navigate('/demo/ao-vivo');
    else startLive();
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 0', marginBottom: 16, borderBottom: '1px solid var(--border)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Logo size="md" />
        <span style={{
          fontSize: 9, fontWeight: 700, letterSpacing: 1.5, padding: '3px 8px',
          background: 'var(--green-dim)', color: 'var(--green)', borderRadius: 0,
          border: '1px solid var(--green)'
        }}>
          DEMO
        </span>
      </div>

      <div style={{ display: 'flex', gap: 4 }}>
        <NavBtn active={path === '/demo' || path === '/demo/escalacao'} onClick={() => navigate('/demo/escalacao')}><ClipboardList size={13} /> ESCALAÇÃO</NavBtn>
        <NavBtn active={path === '/demo/notas'} onClick={() => navigate('/demo/notas')}><NotebookPen size={13} /> NOTAS</NavBtn>
        <button
          onClick={goLive}
          style={{
            background: path === '/demo/ao-vivo' ? 'rgba(214,40,34,0.15)' : 'rgba(214,40,34,0.08)',
            border: `1px solid ${path === '/demo/ao-vivo' ? 'var(--red)' : 'rgba(214,40,34,0.25)'}`,
            color: 'var(--red)', fontSize: 11, fontWeight: 600, letterSpacing: 1,
            padding: '8px 18px', borderRadius: 0, cursor: 'pointer',
            fontFamily: 'var(--font-body)', transition: 'all .2s'
          }}
        >
          <span style={{
            display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
            background: 'var(--red)', marginRight: 4, animation: 'pulse 1.5s infinite'
          }} />
          AO VIVO
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {savedIndicator && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 9, color: 'var(--green)', letterSpacing: 1 }}><Check size={11} /> Salvo</span>
        )}
        <span style={{ fontSize: 10, color: 'var(--text3)' }}>Modo demonstração</span>
      </div>
    </div>
  );
}

function NavBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        background: active ? 'var(--green-dim)' : 'var(--bg3)',
        border: `1px solid ${active ? 'var(--green)' : 'var(--border)'}`,
        color: active ? 'var(--green)' : 'var(--text2)',
        fontSize: 11, fontWeight: 600, letterSpacing: 1, padding: '8px 18px',
        borderRadius: 0, cursor: 'pointer', fontFamily: 'var(--font-body)',
        transition: 'all .2s'
      }}
    >
      {children}
    </button>
  );
}

function DemoShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '16px 20px', minHeight: '100vh' }}>
      <DemoTopBar />
      {children}
    </div>
  );
}

export default function DemoLayout() {
  return (
    <AppProvider>
      <Routes>
        <Route path="/" element={<Navigate to="/demo/escalacao" replace />} />
        <Route path="/escalacao" element={<DemoShell><SetupScreen /></DemoShell>} />
        <Route path="/notas" element={<DemoShell><NotesScreen /></DemoShell>} />
        <Route path="/ao-vivo" element={<DemoShell><LiveScreen /></DemoShell>} />
      </Routes>
    </AppProvider>
  );
}
