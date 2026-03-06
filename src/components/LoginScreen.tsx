import { useState, useRef } from 'react';
import Logo from './Logo';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: 'error' | 'success' } | null>(null);
  const [shake, setShake] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  const doLogin = async () => {
    if (!email || !password) {
      setMsg({ text: 'Preencha todos os campos.', type: 'error' });
      setShake(true);
      setTimeout(() => setShake(false), 400);
      return;
    }
    setLoading(true);
    setMsg(null);

    // Dev mode - accept any login
    setTimeout(() => {
      localStorage.setItem('vdj-session', JSON.stringify({ email }));
      setMsg({ text: '✓ Modo desenvolvimento — acesso liberado.', type: 'success' });
      setTimeout(() => {
        setLoading(false);
        window.location.reload();
      }, 600);
    }, 500);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') doLogin();
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', padding: 20
    }}>
      <div style={{ textAlign: 'center', maxWidth: 400, width: '100%' }}>
        <div style={{ marginBottom: 12 }}>
          <Logo size="lg" />
        </div>
        <div style={{
          color: 'var(--text2)', fontSize: 13, marginBottom: 32,
          letterSpacing: 1
        }}>
          FERRAMENTA PROFISSIONAL PARA NARRADORES ESPORTIVOS
        </div>

        <input
          ref={emailRef}
          type="email"
          placeholder="E-mail"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={handleKeyDown}
          className={shake ? 'shake-anim' : ''}
          style={{
            width: '100%', background: 'var(--bg2)', border: '2px solid var(--border2)',
            borderRadius: 'var(--radius)', padding: '14px 18px', color: 'var(--text)',
            fontSize: 15, fontFamily: 'var(--font-body)', outline: 'none',
            marginBottom: 10, transition: 'border-color .3s'
          }}
        />
        <input
          type="password"
          placeholder="Senha"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={handleKeyDown}
          className={shake ? 'shake-anim' : ''}
          style={{
            width: '100%', background: 'var(--bg2)', border: '2px solid var(--border2)',
            borderRadius: 'var(--radius)', padding: '14px 18px', color: 'var(--text)',
            fontSize: 15, fontFamily: 'var(--font-body)', outline: 'none',
            marginBottom: 10, transition: 'border-color .3s'
          }}
        />
        <button
          onClick={doLogin}
          disabled={loading}
          style={{
            width: '100%', marginTop: 6, padding: 14, background: 'var(--green)',
            color: 'var(--bg)', fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-body)',
            border: 'none', borderRadius: 'var(--radius)', cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all .2s', letterSpacing: 1, opacity: loading ? 0.5 : 1
          }}
        >
          {loading ? 'ENTRANDO...' : 'ENTRAR'}
        </button>

        {msg && (
          <div style={{
            marginTop: 12, fontSize: 13, minHeight: 20,
            color: msg.type === 'error' ? 'var(--red)' : 'var(--green)'
          }}>
            {msg.text}
          </div>
        )}
      </div>
    </div>
  );
}
