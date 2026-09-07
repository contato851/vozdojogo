import { useState } from 'react';
import { Users, Target, Activity, Video } from 'lucide-react';
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
    title: 'Visualize no seu estilo',
    desc: 'Veja os jogadores em lista ou campo tático. Ajuste como quiser.',
  },
  {
    icon: Activity,
    title: 'Controle total ao vivo',
    desc: 'Gols, cartões, substituições e cronômetro. Tudo com um clique.',
  },
];

export default function LandingPage() {
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  const goToAuth = (mode: 'login' | 'signup') => {
    setAuthMode(mode);
    document.getElementById('entrar')?.scrollIntoView({ behavior: 'smooth' });
  };

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
          Tudo que você precisa pra narrar.
        </h1>
        <p style={{
          fontSize: 16, color: 'var(--text2)', maxWidth: 480,
          margin: '0 auto 32px', lineHeight: 1.6
        }}>
          Escalação, substituições, cartões, gols e cronômetro — numa tela só.
          Feito por narradores, pra narradores.
        </p>

        <div style={{
          display: 'flex', gap: 32, justifyContent: 'center', alignItems: 'flex-start',
          flexWrap: 'wrap'
        }}>
          <div>
            <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 10 }}>
              Já tem uma assinatura?
            </div>
            <button
              onClick={() => goToAuth('login')}
              className="btn-green"
              style={{
                padding: '14px 40px', fontSize: 15,
                letterSpacing: 1, border: 'none', cursor: 'pointer'
              }}
            >
              ENTRAR
            </button>
          </div>
          <div>
            <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 10 }}>
              Pronto pra subir de nível?
            </div>
            <button
              onClick={() => goToAuth('signup')}
              style={{
                padding: '14px 40px', fontSize: 15, letterSpacing: 1,
                background: 'transparent', color: 'var(--green)',
                border: '2px solid var(--green)', borderRadius: 'var(--radius)',
                cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 700
              }}
            >
              QUERO ASSINAR
            </button>
          </div>
        </div>

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
        <LoginScreen embedded initialMode={authMode} />
      </div>

      {/* === VÍDEO === */}
      <div style={{ borderTop: '1px solid var(--border)', padding: '56px 20px', textAlign: 'center' }}>
        <div style={{
          fontFamily: 'var(--font-head)', fontSize: 22, fontWeight: 700,
          color: 'var(--text)', letterSpacing: 0.5, marginBottom: 24
        }}>
          Veja como funciona
        </div>
        <div style={{
          maxWidth: 720, margin: '0 auto', aspectRatio: '16 / 9',
          background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 10
        }}>
          <Video size={32} color="var(--text2)" />
          <div style={{ fontSize: 13, color: 'var(--text2)' }}>Vídeo em breve</div>
        </div>
      </div>
    </div>
  );
}
