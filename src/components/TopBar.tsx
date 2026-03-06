import { useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import Logo from './Logo';

export default function TopBar() {
  const { liveState, startLive, savedIndicator } = useApp();
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

  const doLogout = () => {
    localStorage.removeItem('vdj-session');
    window.location.reload();
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 0', marginBottom: 16, borderBottom: '1px solid var(--border)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Logo size="md" />
      </div>

      <div style={{ display: 'flex', gap: 4 }}>
        <NavBtn active={path === '/' || path === '/escalacao'} onClick={() => navigate('/escalacao')}>📋 ESCALAÇÃO</NavBtn>
        <NavBtn active={path === '/notas'} onClick={() => navigate('/notas')}>📝 NOTAS</NavBtn>
        <button
          onClick={goLive}
          style={{
            background: path === '/ao-vivo' ? 'rgba(255,61,61,0.2)' : 'rgba(255,61,61,0.1)',
            border: `1px solid ${path === '/ao-vivo' ? 'var(--red)' : 'rgba(255,61,61,0.3)'}`,
            color: 'var(--red)', fontSize: 11, fontWeight: 600, letterSpacing: 1,
            padding: '8px 18px', borderRadius: 6, cursor: 'pointer',
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
          <span style={{ fontSize: 9, color: 'var(--green)', letterSpacing: 1, transition: 'opacity .3s' }}>✓ Salvo</span>
        )}
        <button
          onClick={doLogout}
          style={{
            background: 'none', border: '1px solid var(--border)', color: 'var(--text3)',
            fontSize: 10, padding: '4px 10px', borderRadius: 4, cursor: 'pointer',
            fontFamily: 'var(--font-body)', transition: 'all .2s'
          }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--red)'; e.currentTarget.style.borderColor = 'rgba(255,61,61,0.3)'; }}
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
        background: active ? 'var(--green-dim)' : 'var(--bg3)',
        border: `1px solid ${active ? 'var(--green)' : 'var(--border)'}`,
        color: active ? 'var(--green)' : 'var(--text2)',
        fontSize: 11, fontWeight: 600, letterSpacing: 1, padding: '8px 18px',
        borderRadius: 6, cursor: 'pointer', fontFamily: 'var(--font-body)',
        transition: 'all .2s'
      }}
    >
      {children}
    </button>
  );
}
