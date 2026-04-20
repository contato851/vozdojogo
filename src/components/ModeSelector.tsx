import { useCopaMode } from '../context/CopaModeContext';
import Logo from './Logo';

export default function ModeSelector() {
  const { setMode } = useCopaMode();

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '40px 20px', gap: 32,
    }}>
      <Logo size="lg" />

      <h1 style={{
        fontFamily: 'var(--font-head)', fontSize: 36, letterSpacing: 3,
        color: 'var(--text)', textAlign: 'center', margin: 0,
      }}>
        COMO VOCÊ QUER NARRAR HOJE?
      </h1>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 360px))',
        gap: 24, maxWidth: 800, width: '100%', justifyContent: 'center',
      }}>
        <ModeCard
          icon="⚽"
          title="Partida Normal"
          subtitle="Qualquer campeonato, qualquer time"
          hoverColor="var(--green)"
          onClick={() => setMode('normal')}
        />
        <ModeCard
          icon="🏆"
          title="Copa do Mundo 2026"
          subtitle="48 seleções, elencos e jogos pré-carregados"
          hoverColor="#d4af37"
          highlight
          badge="NOVO"
          onClick={() => setMode('copa')}
        />
      </div>

      <p style={{
        fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-body)',
        letterSpacing: 1, textAlign: 'center', marginTop: 16,
      }}>
        Você poderá trocar de modo a qualquer momento.
      </p>
    </div>
  );
}

interface ModeCardProps {
  icon: string;
  title: string;
  subtitle: string;
  hoverColor: string;
  highlight?: boolean;
  badge?: string;
  onClick: () => void;
}

function ModeCard({ icon, title, subtitle, hoverColor, highlight, badge, onClick }: ModeCardProps) {
  return (
    <button
      onClick={onClick}
      style={{
        background: highlight
          ? 'linear-gradient(160deg, rgba(212,175,55,0.08), var(--bg2))'
          : 'var(--bg2)',
        border: `2px solid ${highlight ? 'rgba(212,175,55,0.3)' : 'var(--border)'}`,
        borderRadius: 12, padding: '32px 24px', cursor: 'pointer',
        textAlign: 'center', transition: 'all .25s', position: 'relative',
        fontFamily: 'var(--font-body)', color: 'var(--text)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = hoverColor;
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = `0 12px 32px -8px ${hoverColor}55`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = highlight ? 'rgba(212,175,55,0.3)' : 'var(--border)';
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {badge && (
        <span style={{
          position: 'absolute', top: 12, right: 12,
          background: '#d4af37', color: '#000',
          fontSize: 10, fontWeight: 700, letterSpacing: 1.2,
          padding: '3px 8px', borderRadius: 4,
        }}>{badge}</span>
      )}
      <div style={{ fontSize: 56, lineHeight: 1 }}>{icon}</div>
      <div style={{
        fontFamily: 'var(--font-head)', fontSize: 26, letterSpacing: 2,
        color: highlight ? '#d4af37' : 'var(--text)',
      }}>
        {title.toUpperCase()}
      </div>
      <div style={{ fontSize: 13, color: 'var(--text2)', maxWidth: 260 }}>
        {subtitle}
      </div>
    </button>
  );
}
