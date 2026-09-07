import { useLocation, useNavigate } from 'react-router-dom';
import { ClipboardList, NotebookPen, Settings, Check, Radio } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useIsMobile } from '../hooks/useIsMobile';
import Logo from './Logo';

export default function TopBar() {
  const { liveState, startLive, savedIndicator } = useApp();
  const { signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname;
  const isMobile = useIsMobile();

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

  if (isMobile) {
    return (
      <>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 0', marginBottom: 16, borderBottom: '1px solid var(--border)'
        }}>
          <Logo size="md" />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {savedIndicator && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 9, color: 'var(--green)', letterSpacing: 1 }}><Check size={11} /> Salvo</span>
            )}
            <IconBtn onClick={() => navigate('/configuracoes')} title="Configurações"><Settings size={15} /></IconBtn>
            <IconBtn onClick={doLogout} title="Sair" hoverColor="var(--red)"><span style={{ fontSize: 11, fontWeight: 600 }}>Sair</span></IconBtn>
          </div>
        </div>

        {/* Bottom tab bar */}
        <div style={{
          position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 500,
          display: 'flex', background: 'var(--bg2)', borderTop: '1px solid var(--border)',
          paddingBottom: 'env(safe-area-inset-bottom)'
        }}>
          <TabBtn active={path === '/' || path === '/escalacao'} onClick={() => navigate('/escalacao')}>
            <ClipboardList size={18} /> Escalação
          </TabBtn>
          <TabBtn active={path === '/notas'} onClick={() => navigate('/notas')}>
            <NotebookPen size={18} /> Notas
          </TabBtn>
          <TabBtn active={path === '/ao-vivo'} onClick={goLive} color="var(--red)">
            <Radio size={18} /> Ao Vivo
          </TabBtn>
        </div>
        {/* Spacer so content isn't hidden behind the fixed tab bar */}
        <div style={{ height: 64 }} />
      </>
    );
  }

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
            padding: '8px 18px', borderRadius: 'var(--radius)', cursor: 'pointer',
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
            fontSize: 10, padding: '4px 10px', borderRadius: 'var(--radius)', cursor: 'pointer',
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
            fontSize: 10, padding: '4px 10px', borderRadius: 'var(--radius)', cursor: 'pointer',
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
        borderRadius: 'var(--radius)', cursor: 'pointer', fontFamily: 'var(--font-body)',
        transition: 'all .2s'
      }}
    >
      {children}
    </button>
  );
}

function TabBtn({ active, onClick, color, children }: { active: boolean; onClick: () => void; color?: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
        padding: '8px 4px 10px', background: 'none', border: 'none', cursor: 'pointer',
        color: active ? (color || 'var(--green)') : 'var(--text3)',
        fontSize: 10, fontWeight: 600, fontFamily: 'var(--font-body)', letterSpacing: 0.3,
        transition: 'color .15s'
      }}
    >
      {children}
    </button>
  );
}

function IconBtn({ onClick, title, hoverColor, children }: { onClick: () => void; title: string; hoverColor?: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        background: 'none', border: '1px solid var(--border)', color: 'var(--text3)',
        padding: '6px 10px', borderRadius: 'var(--radius)', cursor: 'pointer',
        fontFamily: 'var(--font-body)', transition: 'all .2s',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
        minWidth: 36, minHeight: 32
      }}
      onMouseEnter={e => { e.currentTarget.style.color = hoverColor || 'var(--green)'; }}
      onMouseLeave={e => { e.currentTarget.style.color = 'var(--text3)'; }}
    >
      {children}
    </button>
  );
}
