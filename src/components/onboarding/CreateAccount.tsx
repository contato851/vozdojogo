import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useOnboarding } from '../../context/OnboardingContext';
import Logo from '../Logo';

export default function CreateAccount() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data: onboardingData } = useOnboarding();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [shake, setShake] = useState(false);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!fullName.trim()) errs.fullName = 'Nome obrigatório';
    if (!email.trim()) errs.email = 'E-mail obrigatório';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'E-mail inválido';
    if (password.length < 6) errs.password = 'Mínimo 6 caracteres';
    if (password !== confirmPassword) errs.confirmPassword = 'Senhas não coincidem';
    return errs;
  };

  const handleSubmit = async () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      setShake(true);
      setTimeout(() => setShake(false), 400);
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { full_name: fullName.trim() } }
      });

      if (signUpError) throw signUpError;

      const userId = signUpData.user?.id;
      if (!userId) throw new Error('Erro ao criar conta');

      // Save profile
      const sessionId = searchParams.get('session_id');
      const { error: profileError } = await supabase.from('user_profiles').insert({
        user_id: userId,
        full_name: fullName.trim(),
        narration_type: onboardingData.narrationTypes,
        frequency: onboardingData.frequency,
        level: onboardingData.level,
        main_difficulty: onboardingData.mainDifficulty,
        stripe_customer_id: null,
        onboarding_completed: false,
      });

      if (profileError) console.error('Profile save error:', profileError);

      navigate('/onboarding/primeiro-jogo');
    } catch (err: any) {
      console.error('Signup error:', err);
      setErrors({ general: err.message || 'Erro ao criar conta' });
      setShake(true);
      setTimeout(() => setShake(false), 400);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit();
  };

  const inputStyle = (field: string) => ({
    width: '100%', background: 'var(--bg3)',
    border: `2px solid ${errors[field] ? 'var(--red)' : 'var(--border)'}`,
    borderRadius: 8, padding: '14px 18px', color: 'var(--text)',
    fontSize: 15, fontFamily: 'var(--font-body)', outline: 'none',
    marginBottom: 4, transition: 'border-color .3s'
  });

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '40px 20px', animation: 'fadeUp .3s ease-out'
    }}>
      <div style={{ maxWidth: 440, width: '100%', textAlign: 'center' }}>
        {/* Check animation */}
        <div style={{
          width: 64, height: 64, borderRadius: '50%', background: 'var(--green-dim)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px', animation: 'bounceIn .5s ease-out',
          border: '2px solid var(--green)'
        }}>
          <span style={{ fontSize: 32, color: 'var(--green)' }}>✓</span>
        </div>

        <h2 style={{
          fontFamily: 'var(--font-head)', fontSize: 32, fontWeight: 700,
          color: 'var(--green)', letterSpacing: 1, marginBottom: 8
        }}>
          Pagamento confirmado!
        </h2>
        <p style={{
          fontSize: 14, color: 'var(--text2)', marginBottom: 32
        }}>
          Agora crie sua conta para acessar o VOZ DO JOGO.
        </p>

        {/* Form */}
        <div className={shake ? 'shake-anim' : ''} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ textAlign: 'left' }}>
            <input
              type="text" placeholder="Seu nome" value={fullName}
              onChange={e => setFullName(e.target.value)} onKeyDown={handleKeyDown}
              style={inputStyle('fullName')}
            />
            {errors.fullName && <span style={{ fontSize: 11, color: 'var(--red)' }}>{errors.fullName}</span>}
          </div>

          <div style={{ textAlign: 'left' }}>
            <input
              type="email" placeholder="E-mail" value={email}
              onChange={e => setEmail(e.target.value)} onKeyDown={handleKeyDown}
              style={inputStyle('email')}
            />
            {errors.email && <span style={{ fontSize: 11, color: 'var(--red)' }}>{errors.email}</span>}
          </div>

          <div style={{ textAlign: 'left' }}>
            <input
              type="password" placeholder="Crie uma senha" value={password}
              onChange={e => setPassword(e.target.value)} onKeyDown={handleKeyDown}
              style={inputStyle('password')}
            />
            {errors.password && <span style={{ fontSize: 11, color: 'var(--red)' }}>{errors.password}</span>}
          </div>

          <div style={{ textAlign: 'left' }}>
            <input
              type="password" placeholder="Confirme a senha" value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)} onKeyDown={handleKeyDown}
              style={inputStyle('confirmPassword')}
            />
            {errors.confirmPassword && <span style={{ fontSize: 11, color: 'var(--red)' }}>{errors.confirmPassword}</span>}
          </div>

          <button
            onClick={handleSubmit} disabled={loading}
            style={{
              width: '100%', padding: 14, marginTop: 8,
              background: loading ? 'var(--bg3)' : 'var(--green)',
              color: loading ? 'var(--text3)' : 'var(--bg)',
              fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-head)',
              border: 'none', borderRadius: 8,
              cursor: loading ? 'not-allowed' : 'pointer',
              letterSpacing: 2, transition: 'all .2s'
            }}
          >
            {loading ? 'CRIANDO...' : 'CRIAR CONTA E ENTRAR'}
          </button>

          {errors.general && (
            <p style={{ fontSize: 13, color: 'var(--red)', marginTop: 8 }}>{errors.general}</p>
          )}
        </div>
      </div>
    </div>
  );
}
