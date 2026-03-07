import { useNavigate } from 'react-router-dom';
import Logo from '../Logo';

const benefits = [
  { emoji: '⚽', title: 'Monte a escalação em segundos', desc: 'Selecione o time, preencha os jogadores e pronto.' },
  { emoji: '📊', title: 'Campo tático interativo', desc: 'Arraste os jogadores no campo. Veja a formação em tempo real.' },
  { emoji: '🔴', title: 'Controle total ao vivo', desc: 'Gols, cartões, substituições e cronômetro. Tudo com um clique.' },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: '40px 20px',
      animation: 'fadeUp .4s ease-out'
    }}>
      <div style={{ maxWidth: 700, width: '100%', textAlign: 'center' }}>
        {/* Logo */}
        <div style={{ marginBottom: -56, display: 'flex', justifyContent: 'center' }}>
          <Logo size="lg" />
        </div>

        {/* Headline */}
        <h1 style={{
          fontFamily: 'var(--font-head)', fontSize: 42, fontWeight: 700,
          color: 'var(--text)', letterSpacing: 2, lineHeight: 1.1, margin: '0 0 12px'
        }}>
          Tudo que você precisa para narrar.<br />Na palma da mão.
        </h1>

        {/* Subheadline */}
        <p style={{
          fontFamily: 'var(--font-body)', fontSize: 16, color: 'var(--text2)',
          lineHeight: 1.6, margin: '0 0 40px', maxWidth: 520, marginLeft: 'auto', marginRight: 'auto'
        }}>
          Escalação, substituições, cartões, gols e cronômetro — tudo em uma tela. Feito por narradores, para narradores.
        </p>

        {/* Benefits */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16, marginBottom: 40
        }}>
          {benefits.map((b, i) => (
            <div key={i} style={{
              background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12,
              padding: '24px 20px', textAlign: 'center'
            }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>{b.emoji}</div>
              <div style={{
                fontFamily: 'var(--font-head)', fontSize: 18, fontWeight: 600,
                color: 'var(--green)', letterSpacing: 1, marginBottom: 6
              }}>{b.title}</div>
              <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.5 }}>{b.desc}</div>
            </div>
          ))}
        </div>

        {/* Social proof */}
        <p style={{
          fontSize: 12, color: 'var(--text3)', letterSpacing: 2,
          textTransform: 'uppercase', marginBottom: 32
        }}>
          Usado por narradores em todo o Brasil
        </p>

        {/* Price card */}
        <div style={{
          background: 'var(--bg2)', border: '2px solid var(--green)',
          borderRadius: 16, padding: '32px 28px', maxWidth: 380,
          margin: '0 auto 32px', textAlign: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 4, marginBottom: 4 }}>
            <span style={{
              fontFamily: 'var(--font-head)', fontSize: 56, fontWeight: 700, color: 'var(--green)'
            }}>R$ 14,90</span>
            <span style={{ color: 'var(--text2)', fontSize: 16 }}>/mês</span>
          </div>
          <p style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 24 }}>
            Cancele quando quiser. Sem fidelidade.
          </p>
          <button
            onClick={() => navigate('/onboarding/1')}
            style={{
              width: '100%', padding: 16, background: 'var(--green)',
              color: 'var(--bg)', fontSize: 20, fontWeight: 700,
              fontFamily: 'var(--font-head)', border: 'none', borderRadius: 8,
              cursor: 'pointer', letterSpacing: 2, transition: 'all .2s'
            }}
            onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.15)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { e.currentTarget.style.filter = 'none'; e.currentTarget.style.transform = 'none'; }}
          >
            COMEÇAR AGORA
          </button>
        </div>

        {/* Existing user login link */}
        <button
          onClick={() => navigate('/login')}
          style={{
            background: 'none', border: 'none', color: 'var(--text3)',
            fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-body)',
            textDecoration: 'underline', marginBottom: 40
          }}
        >
          Já tem conta? Entrar
        </button>

        {/* Footer */}
        <p style={{ fontSize: 10, color: 'var(--text3)' }}>
          VOZ DO JOGO © 2026 — Todos os direitos reservados
        </p>
      </div>
    </div>
  );
}
