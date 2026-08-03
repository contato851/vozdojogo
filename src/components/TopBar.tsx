import { useLocation, useNavigate } from 'react-router-dom';
import { ClipboardList, NotebookPen, Settings, Check } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import Logo from './Logo';

export default function TopBar() {
  const { liveState, startLive, savedIndicator } = useApp();
  const { signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname;

  const goLive = () => {
    if (liveState) {
      navigate('/ao-vivo');
    } else {
      startLive();
    }
  };

  const doLogout = async () => {
    await signOut();
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 0', marginBottom: 16, borderBottom: '1px solid var(--border)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Logo size="md" />
      </div>

      <div style={{ display: 'flex', gap: 4 }}>
        <NavBtn active={path === '/' || path === '/escalacao'} onClick={() => navigate('/escalacao')}><ClipboardList size={13} /> ESCALAÇÃO</NavBtn>
        <NavBtn active={path === '/notas'} onClick={() => navigate('/notas')}><NotebookPen size={13} /> NOTAS</NavBtn>
        <button
          onClick={goLive}
          style={{
            background: path === '/ao-vivo' ? 'rgba(214,40,34,0.15)' : 'rgba(214,40,34,0.08)',
            border: `1px solid ${path === '/ao-vivo' ? 'var(--red)' : 'rgba(214,40,34,0.25)'}`,
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
          <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 9, color: 'var(--green)', letterSpacing: 1, transition: 'opacity .3s' }}><Check size={11} /> Salvo</span>
        )}
        <button
          onClick={() => navigate('/configuracoes')}
          style={{
            background: 'none', border: '1px solid var(--border)', color: 'var(--text3)',
            fontSize: 10, padding: '4px 10px', borderRadius: 0, cursor: 'pointer',
            fontFamily: 'var(--font-body)', transition: 'all .2s'
          }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--green)'; e.currentTarget.style.borderColor = 'var(--green)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text3)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Settings size={12} /> Config</span>
        </button>
        <button
          onClick={doLogout}
          style={{
            background: 'none', border: '1px solid var(--border)', color: 'var(--text3)',
            fontSize: 10, padding: '4px 10px', borderRadius: 0, cursor: 'pointer',
            fontFamily: 'var(--font-body)', transition: 'all .2s'
          }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--red)'; e.currentTarget.style.borderColor = 'rgba(214,40,34,0.25)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text3)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
        >
          Sair
        </button>
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
