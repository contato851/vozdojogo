import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import Logo from './Logo';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen({ embedded = false }: { embedded?: boolean }) {
  const { user, loading: authLoading, signIn, resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: 'error' | 'success' } | null>(null);
  const [shake, setShake] = useState(false);
  const [mode, setMode] = useState<'login' | 'reset'>('login');

  if (authLoading) return null;
  if (user) return <Navigate to="/escalacao" replace />;

  const doReset = async () => {
    if (!email) {
      setMsg({ text: 'Informe seu e-mail.', type: 'error' });
      return;
    }
    setSubmitting(true);
    setMsg(null);
    const { error } = await resetPassword(email);
    if (error) {
      setMsg({ text: error, type: 'error' });
    } else {
      setMsg({ text: 'Enviamos um link de redefinição para seu e-mail.', type: 'success' });
    }
    setSubmitting(false);
  };

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

    const { error } = await signIn(email, password);

    if (error) {
      setMsg({ text: error, type: 'error' });
      setShake(true);
      setTimeout(() => setShake(false), 400);
    } else {
      setMsg({ text: 'Login realizado!', type: 'success' });
    }
    setSubmitting(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') (mode === 'login' ? doAction() : doReset());
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', padding: 20
    }}>
      <div style={{ textAlign: 'center', maxWidth: 400, width: '100%' }}>
        {!embedded && (
          <>
            <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'center' }}>
              <Logo size="lg" />
            </div>
            <div style={{
              color: 'var(--text2)', fontSize: 13, marginBottom: 32,
              letterSpacing: 1
            }}>
              FERRAMENTA PROFISSIONAL PARA NARRADORES
            </div>
          </>
        )}
        {embedded && (
          <div style={{
            fontFamily: 'var(--font-head)', fontSize: 24, fontWeight: 700,
            color: 'var(--text)', letterSpacing: 1, marginBottom: 24
          }}>
            ENTRAR NA SUA CONTA
          </div>
        )}

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
        {mode === 'login' && (
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
        )}
        <button
          onClick={mode === 'login' ? doAction : doReset}
          disabled={submitting}
          style={{
            width: '100%', marginTop: 6, padding: 14, background: 'var(--green)',
            color: 'var(--green-text)', fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-body)',
            border: 'none', borderRadius: 'var(--radius)', cursor: submitting ? 'not-allowed' : 'pointer',
            transition: 'all .2s', letterSpacing: 1, opacity: submitting ? 0.5 : 1
          }}
        >
          {mode === 'login'
            ? (submitting ? 'ENTRANDO...' : 'ENTRAR')
            : (submitting ? 'ENVIANDO...' : 'ENVIAR LINK DE REDEFINIÇÃO')}
        </button>

        <div
          onClick={() => { setMode(mode === 'login' ? 'reset' : 'login'); setMsg(null); }}
          style={{
            marginTop: 14, fontSize: 12, color: 'var(--text2)', cursor: 'pointer',
            textDecoration: 'underline', textUnderlineOffset: 3
          }}
        >
          {mode === 'login' ? 'Esqueci minha senha' : 'Voltar para o login'}
        </div>

        {msg && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            marginTop: 12, fontSize: 13, minHeight: 20,
            color: msg.type === 'error' ? 'var(--red)' : 'var(--green)'
          }}>
            {msg.type === 'success' && <Check size={14} />}
            {msg.text}
          </div>
        )}
      </div>
    </div>
  );
}
