import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import Logo from './Logo';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen() {
  const { user, loading: authLoading, signIn, signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: 'error' | 'success' } | null>(null);
  const [shake, setShake] = useState(false);

  if (authLoading) return null;
  if (user) return <Navigate to="/escalacao" replace />;

  const doAction = async () => {
    if (!email || !password) {
      setMsg({ text: 'Preencha todos os campos.', type: 'error' });
      setShake(true);
      setTimeout(() => setShake(false), 400);
      return;
    }
    if (password.length < 6) {
      setMsg({ text: 'A senha deve ter pelo menos 6 caracteres.', type: 'error' });
      return;
    }
    setSubmitting(true);
    setMsg(null);

    const { error } = isSignUp ? await signUp(email, password) : await signIn(email, password);

    if (error) {
      setMsg({ text: error, type: 'error' });
      setShake(true);
      setTimeout(() => setShake(false), 400);
    } else {
      setMsg({ text: isSignUp ? '✓ Conta criada com sucesso!' : '✓ Login realizado!', type: 'success' });
    }
    setLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') doAction();
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', padding: 20
    }}>
      <div style={{ textAlign: 'center', maxWidth: 400, width: '100%' }}>
        <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'center' }}>
          <Logo size="lg" />
        </div>
        <div style={{
          color: 'var(--text2)', fontSize: 13, marginBottom: 32,
          letterSpacing: 1
        }}>
          FERRAMENTA PROFISSIONAL PARA NARRADORES
        </div>

        <input
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
          onClick={doAction}
          disabled={loading}
          style={{
            width: '100%', marginTop: 6, padding: 14, background: 'var(--green)',
            color: 'var(--bg)', fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-body)',
            border: 'none', borderRadius: 'var(--radius)', cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all .2s', letterSpacing: 1, opacity: loading ? 0.5 : 1
          }}
        >
          {loading ? (isSignUp ? 'CRIANDO...' : 'ENTRANDO...') : (isSignUp ? 'CRIAR CONTA' : 'ENTRAR')}
        </button>

        <button
          onClick={() => { setIsSignUp(!isSignUp); setMsg(null); }}
          style={{
            marginTop: 16, background: 'none', border: 'none', color: 'var(--text2)',
            fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-body)',
            textDecoration: 'underline', transition: 'color .2s'
          }}
        >
          {isSignUp ? 'Já tem conta? Entrar' : 'Não tem conta? Criar conta'}
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
