import { Users, Target, Activity } from 'lucide-react';
import Logo from './Logo';
import LoginScreen from './LoginScreen';

const FEATURES = [
  {
    icon: Users,
    title: 'Monte a escalação em segundos',
    desc: 'Selecione o time, preencha os jogadores e está pronto.',
  },
  {
    icon: Target,
    title: 'Campo tático interativo',
    desc: 'Arraste os jogadores no campo. Veja a formação em tempo real.',
  },
  {
    icon: Activity,
    title: 'Controle total ao vivo',
    desc: 'Gols, cartões, substituições e cronômetro. Tudo com um clique.',
  },
];

export default function LandingPage() {
  return (
    <div>
      {/* === HERO === */}
      <div style={{ padding: '64px 20px 56px', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
          <Logo size="lg" />
        </div>
        <h1 style={{
          fontFamily: 'var(--font-head)', fontSize: 40, fontWeight: 700,
          color: 'var(--text)', letterSpacing: 1, lineHeight: 1.15,
          maxWidth: 640, margin: '0 auto 16px'
        }}>
          Tudo que você precisa pra narrar. Na palma da mão.
        </h1>
        <p style={{
          fontSize: 16, color: 'var(--text2)', maxWidth: 480,
          margin: '0 auto 32px', lineHeight: 1.6
        }}>
          Escalação, substituições, cartões, gols e cronômetro — numa tela só.
          Feito por narradores, pra narradores.
        </p>
        <a
          href="#entrar"
          className="btn-green"
          style={{
            display: 'inline-block', padding: '14px 40px', fontSize: 15,
            letterSpacing: 1, textDecoration: 'none'
          }}
        >
          ENTRAR
        </a>

        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16, maxWidth: 900, margin: '56px auto 0', textAlign: 'left'
        }}>
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} style={{
              background: 'var(--bg2)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius)', padding: 20
            }}>
              <Icon size={22} color="var(--green)" style={{ marginBottom: 12 }} />
              <div style={{
                fontFamily: 'var(--font-head)', fontSize: 18, fontWeight: 700,
                color: 'var(--text)', letterSpacing: 0.5, marginBottom: 6
              }}>
                {title}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.5 }}>
                {desc}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* === LOGIN === */}
      <div id="entrar" style={{ borderTop: '1px solid var(--border)' }}>
        <LoginScreen embedded />
      </div>
    </div>
  );
}
