import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOnboarding } from '../../context/OnboardingContext';
import { supabase } from '@/integrations/supabase/client';
import Logo from '../Logo';

const NARRATION_LABELS: Record<string, string> = {
  radio: 'Rádio', tv: 'TV', internet: 'Internet/Streaming',
  estadio: 'Estádio', esports: 'E-sports'
};

const FREQUENCY_LABELS: Record<string, string> = {
  '1-4': '1 a 4 jogos/mês', '5-12': '5 a 12 jogos/mês',
  '13-20': '13 a 20 jogos/mês', '20+': 'Mais de 20 jogos/mês'
};

const LEVEL_LABELS: Record<string, string> = {
  amador: 'Amador / Universitário', estadual: 'Estadual / Regional',
  'serie-cd': 'Série C ou D', 'serie-ab': 'Série A ou B',
  internacional: 'Copa do Brasil / Libertadores / Internacional'
};

const FREQ_MAX: Record<string, number> = { '1-4': 4, '5-12': 12, '13-20': 20, '20+': 20 };

export default function ProfileSummary() {
  const navigate = useNavigate();
  const { data } = useOnboarding();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const narrationLabel = data.narrationTypes.map(t => NARRATION_LABELS[t] || t).join(' e ');
  const frequencyLabel = FREQUENCY_LABELS[data.frequency] || data.frequency;
  const levelLabel = LEVEL_LABELS[data.level] || data.level;

  const maxGames = FREQ_MAX[data.frequency] || 4;
  const pricePerGame = (14.9 / maxGames).toFixed(2).replace('.', ',');
  const gamesDisplay = data.frequency === '20+' ? '20+' : String(maxGames);

  const handleCheckout = async () => {
    setLoading(true);
    setError('');
    try {
      const { data: result, error: fnError } = await supabase.functions.invoke('create-onboarding-checkout');
      if (fnError) throw fnError;
      if (result?.url) {
        window.location.href = result.url;
      } else {
        throw new Error('URL de checkout não retornada');
      }
    } catch (err: any) {
      console.error('Checkout error:', err);
      setError('Erro ao iniciar checkout. Tente novamente.');
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '40px 20px', animation: 'slideLeft .3s ease-out'
    }}>
      <div style={{ maxWidth: 540, width: '100%' }}>
        {/* Logo */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
          <Logo size="sm" />
        </div>

        {/* Title */}
        <h2 style={{
          fontFamily: 'var(--font-head)', fontSize: 28, fontWeight: 700,
          color: 'var(--text)', letterSpacing: 1, marginBottom: 24, textAlign: 'center'
        }}>
          Perfeito! Montamos seu perfil:
        </h2>

        {/* Profile card */}
        <div style={{
          background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: 12, padding: 24, marginBottom: 24
        }}>
          <ProfileRow label="Tipo" value={`Narrador de ${narrationLabel}`} />
          <ProfileRow label="Frequência" value={frequencyLabel} />
          <ProfileRow label="Nível" value={levelLabel} last />
        </div>

        {/* Value trigger */}
        <p style={{
          fontSize: 14, color: 'var(--text2)', lineHeight: 1.6, marginBottom: 16, textAlign: 'center'
        }}>
          Com o <strong style={{ color: 'var(--green)' }}>VOZ DO JOGO</strong>, cada um dos seus{' '}
          <strong style={{ color: 'var(--text)' }}>{gamesDisplay}</strong> jogos por mês vai ter escalação organizada,
          cronômetro preciso e campo tático na sua tela.
        </p>

        {/* Value calculation */}
        <div style={{
          background: 'var(--green-dim)', border: '1px solid rgba(0,200,83,0.2)',
          borderRadius: 10, padding: '14px 20px', marginBottom: 32, textAlign: 'center'
        }}>
          <span style={{ fontSize: 15, color: 'var(--green)', fontWeight: 600 }}>
            Isso dá menos de R$ {pricePerGame} por jogo. Menos que uma água no estádio.
          </span>
        </div>

        {/* CTA */}
        <button
          onClick={handleCheckout}
          disabled={loading}
          style={{
            width: '100%', padding: 16, background: loading ? 'var(--bg3)' : 'var(--green)',
            color: loading ? 'var(--text3)' : 'var(--bg)',
            fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-head)',
            border: 'none', borderRadius: 8, cursor: loading ? 'not-allowed' : 'pointer',
            letterSpacing: 2, transition: 'all .2s', marginBottom: 12
          }}
          onMouseEnter={e => { if (!loading) { e.currentTarget.style.filter = 'brightness(1.15)'; e.currentTarget.style.transform = 'translateY(-2px)'; } }}
          onMouseLeave={e => { e.currentTarget.style.filter = 'none'; e.currentTarget.style.transform = 'none'; }}
        >
          {loading ? 'REDIRECIONANDO...' : 'ASSINAR POR R$14,90/MÊS'}
        </button>

        {error && (
          <p style={{ fontSize: 13, color: 'var(--red)', textAlign: 'center', marginTop: 8 }}>{error}</p>
        )}

        <button
          onClick={() => navigate('/onboarding/4')}
          style={{
            background: 'none', border: 'none', color: 'var(--text3)',
            fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-body)',
            textDecoration: 'underline', display: 'block', margin: '8px auto 0'
          }}
        >
          ← Voltar
        </button>
      </div>
    </div>
  );
}

function ProfileRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 0', borderBottom: last ? 'none' : '1px solid var(--border)'
    }}>
      <span style={{ color: 'var(--green)', fontSize: 18 }}>✓</span>
      <div>
        <div style={{ fontSize: 10, color: 'var(--text3)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 15, color: 'var(--text)', fontWeight: 500 }}>{value}</div>
      </div>
    </div>
  );
}
