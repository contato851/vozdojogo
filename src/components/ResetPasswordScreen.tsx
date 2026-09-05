import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import Logo from './Logo';
import { useAuth } from '../context/AuthContext';

export default function ResetPasswordScreen() {
  const { updatePassword } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: 'error' | 'success' } | null>(null);

  const doUpdate = async () => {
    if (password.length < 6) {
      setMsg({ text: 'A senha deve ter pelo menos 6 caracteres.', type: 'error' });
      return;
    }
    if (password !== confirm) {
      setMsg({ text: 'As senhas não coincidem.', type: 'error' });
      return;
    }
    setSubmitting(true);
    setMsg(null);
    const { error } = await updatePassword(password);
    if (error) {
      setMsg({ text: error, type: 'error' });
      setSubmitting(false);
    } else {
      setMsg({ text: 'Senha atualizada! Redirecionando...', type: 'success' });
      setTimeout(() => navigate('/escalacao'), 1500);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') doUpdate();
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
          fontFamily: 'var(--font-head)', fontSize: 22, fontWeight: 700,
          color: 'var(--text)', letterSpacing: 1, marginBottom: 24
        }}>
          DEFINA SUA NOVA SENHA
        </div>

        <input
          type="password"
          placeholder="Nova senha"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={handleKeyDown}
          style={{
            width: '100%', background: 'var(--bg2)', border: '2px solid var(--border2)',
            borderRadius: 'var(--radius)', padding: '14px 18px', color: 'var(--text)',
            fontSize: 15, fontFamily: 'var(--font-body)', outline: 'none',
            marginBottom: 10, transition: 'border-color .3s'
          }}
        />
        <input
          type="password"
          placeholder="Confirme a nova senha"
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          onKeyDown={handleKeyDown}
          style={{
            width: '100%', background: 'var(--bg2)', border: '2px solid var(--border2)',
            borderRadius: 'var(--radius)', padding: '14px 18px', color: 'var(--text)',
            fontSize: 15, fontFamily: 'var(--font-body)', outline: 'none',
            marginBottom: 10, transition: 'border-color .3s'
          }}
        />
        <button
          onClick={doUpdate}
          disabled={submitting}
          style={{
            width: '100%', marginTop: 6, padding: 14, background: 'var(--green)',
            color: 'var(--green-text)', fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-body)',
            border: 'none', borderRadius: 'var(--radius)', cursor: submitting ? 'not-allowed' : 'pointer',
            transition: 'all .2s', letterSpacing: 1, opacity: submitting ? 0.5 : 1
          }}
        >
          {submitting ? 'SALVANDO...' : 'SALVAR NOVA SENHA'}
        </button>

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
