import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import Logo from './Logo';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen({ embedded = false, initialMode = 'login' }: { embedded?: boolean; initialMode?: 'login' | 'signup' }) {
  const { user, loading: authLoading, signIn, signUp, resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: 'error' | 'success' } | null>(null);
  const [shake, setShake] = useState(false);
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>(initialMode);

  useEffect(() => {
    setMode(initialMode);
    setMsg(null);
  }, [initialMode]);

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

    const { error } = mode === 'signup' ? await signUp(email, password) : await signIn(email, password);

    if (error) {
      setMsg({ text: error, type: 'error' });
      setShake(true);
      setTimeout(() => setShake(false), 400);
    } else if (mode === 'signup') {
      setMsg({ text: 'Conta criada! Se pedir confirmação, verifique seu e-mail.', type: 'success' });
    } else {
      setMsg({ text: 'Login realizado!', type: 'success' });
    }
    setSubmitting(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') (mode === 'reset' ? doReset() : doAction());
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
            {mode === 'signup' ? 'CRIAR SUA CONTA' : 'ENTRAR NA SUA CONTA'}
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
        {mode !== 'reset' && (
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
          onClick={mode === 'reset' ? doReset : doAction}
          disabled={submitting}
          style={{
            width: '100%', marginTop: 6, padding: 14, background: 'var(--green)',
            color: 'var(--green-text)', fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-body)',
            border: 'none', borderRadius: 'var(--radius)', cursor: submitting ? 'not-allowed' : 'pointer',
            transition: 'all .2s', letterSpacing: 1, opacity: submitting ? 0.5 : 1
          }}
        >
          {mode === 'reset'
            ? (submitting ? 'ENVIANDO...' : 'ENVIAR LINK DE REDEFINIÇÃO')
            : mode === 'signup'
              ? (submitting ? 'CRIANDO CONTA...' : 'CRIAR CONTA')
              : (submitting ? 'ENTRANDO...' : 'ENTRAR')}
        </button>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 14, marginTop: 14, flexWrap: 'wrap' }}>
          {mode !== 'reset' && (
            <div
              onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setMsg(null); }}
              style={{
                fontSize: 12, color: 'var(--text2)', cursor: 'pointer',
                textDecoration: 'underline', textUnderlineOffset: 3
              }}
            >
              {mode === 'login' ? 'Não tem conta? Criar conta' : 'Já tem conta? Entrar'}
            </div>
          )}
          {mode !== 'signup' && (
            <div
              onClick={() => { setMode(mode === 'reset' ? 'login' : 'reset'); setMsg(null); }}
              style={{
                fontSize: 12, color: 'var(--text2)', cursor: 'pointer',
                textDecoration: 'underline', textUnderlineOffset: 3
              }}
            >
              {mode === 'reset' ? 'Voltar para o login' : 'Esqueci minha senha'}
            </div>
          )}
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
