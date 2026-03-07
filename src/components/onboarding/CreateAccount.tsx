import { useState, useEffect } from 'react';
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
  const [stripeCustomerId, setStripeCustomerId] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingEmail, setFetchingEmail] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [shake, setShake] = useState(false);
  const [userExists, setUserExists] = useState(false);

  const sessionId = searchParams.get('session_id');

  // Fetch email from Stripe checkout session with retry
  useEffect(() => {
    if (!sessionId) {
      setFetchingEmail(false);
      setErrors({ general: 'Sessão de pagamento não encontrada. Faça o pagamento primeiro.' });
      return;
    }

    let retryCount = 0;
    const maxRetries = 5;
    let timeoutId: ReturnType<typeof setTimeout>;
    let cancelled = false;

    const fetchEmail = async () => {
      try {
        console.log(`[CreateAccount] Fetching checkout email, attempt ${retryCount + 1}, session_id: ${sessionId}`);
        const { data, error } = await supabase.functions.invoke('retrieve-checkout-email', {
          body: { session_id: sessionId },
        });

        if (cancelled) return;

        console.log('[CreateAccount] Response:', JSON.stringify(data), 'Error:', error);

        if (error) throw error;

        if (data?.error === 'payment_not_completed') {
          retryCount++;
          if (retryCount < maxRetries) {
            console.log(`[CreateAccount] Payment not completed yet, retrying in ${retryCount * 2}s...`);
            timeoutId = setTimeout(fetchEmail, retryCount * 2000);
            return;
          }
          setErrors({ general: 'Pagamento ainda não confirmado. Aguarde alguns instantes e recarregue a página.' });
          setFetchingEmail(false);
          return;
        }

        if (data?.email) {
          console.log('[CreateAccount] Email retrieved:', data.email);
          setEmail(data.email);
          setStripeCustomerId(data.stripe_customer_id || '');
          setUserExists(data.user_exists || false);
        } else {
          setErrors({ general: 'Não foi possível recuperar o e-mail do pagamento.' });
        }
        setFetchingEmail(false);
      } catch (err: any) {
        if (cancelled) return;
        console.error('Error fetching checkout email:', err);
        retryCount++;
        if (retryCount < maxRetries) {
          timeoutId = setTimeout(fetchEmail, retryCount * 2000);
          return;
        }
        setErrors({ general: 'Erro ao verificar pagamento. Tente recarregar a página.' });
        setFetchingEmail(false);
      }
    };

    fetchEmail();

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [sessionId]);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!fullName.trim()) errs.fullName = 'Nome obrigatório';
    if (!email.trim()) errs.email = 'E-mail obrigatório';
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
      const { error: profileError } = await supabase.from('user_profiles').insert({
        user_id: userId,
        full_name: fullName.trim(),
        narration_type: onboardingData.narrationTypes,
        frequency: onboardingData.frequency,
        level: onboardingData.level,
        main_difficulty: onboardingData.mainDifficulty,
        stripe_customer_id: stripeCustomerId || null,
        onboarding_completed: false,
      });

      if (profileError) console.error('Profile save error:', profileError);

      // Link billing_customer to auth user
      if (stripeCustomerId) {
        const supabaseAdmin = supabase;
        // Use edge function or direct update - the webhook already created the billing_customer
        // We just need to link it to the auth user via a service call
        await supabase.functions.invoke('link-billing-user', {
          body: { stripe_customer_id: stripeCustomerId },
        }).catch(() => {
          // Non-critical, check-subscription will sync this
          console.log('link-billing-user not available, will sync on subscription check');
        });
      }

      navigate('/onboarding/primeiro-jogo');
    } catch (err: any) {
      console.error('Signup error:', err);
      let errorMsg = err.message || 'Erro ao criar conta';
      if (err.message?.includes('already registered')) {
        errorMsg = 'Este e-mail já está cadastrado. Faça login.';
      }
      setErrors({ general: errorMsg });
      setShake(true);
      setTimeout(() => setShake(false), 400);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit();
  };

  const inputStyle = (field: string, disabled?: boolean) => ({
    width: '100%', background: disabled ? 'var(--bg2)' : 'var(--bg3)',
    border: `2px solid ${errors[field] ? 'var(--red)' : 'var(--border)'}`,
    borderRadius: 8, padding: '14px 18px', color: disabled ? 'var(--text2)' : 'var(--text)',
    fontSize: 15, fontFamily: 'var(--font-body)', outline: 'none',
    marginBottom: 4, transition: 'border-color .3s',
    cursor: disabled ? 'not-allowed' : 'text',
    opacity: disabled ? 0.7 : 1,
  });

  if (fetchingEmail) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '40px 20px'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 16, animation: 'pulse 1.5s infinite' }}>⏳</div>
          <p style={{ color: 'var(--text2)', fontSize: 15 }}>Verificando pagamento...</p>
        </div>
      </div>
    );
  }

  if (userExists) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '40px 20px', animation: 'fadeUp .3s ease-out'
      }}>
        <div style={{ maxWidth: 440, width: '100%', textAlign: 'center' }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%', background: 'var(--green-dim)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px', border: '2px solid var(--green)'
          }}>
            <span style={{ fontSize: 32, color: 'var(--green)' }}>✓</span>
          </div>
          <h2 style={{
            fontFamily: 'var(--font-head)', fontSize: 28, fontWeight: 700,
            color: 'var(--green)', letterSpacing: 1, marginBottom: 8
          }}>
            Pagamento confirmado!
          </h2>
          <p style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 24 }}>
            Já existe uma conta com o e-mail <strong style={{ color: 'var(--text)' }}>{email}</strong>.
            <br />Faça login para continuar.
          </p>
          <button
            onClick={() => navigate('/login')}
            style={{
              width: '100%', padding: 14, background: 'var(--green)',
              color: 'var(--bg)', fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-head)',
              border: 'none', borderRadius: 8, cursor: 'pointer', letterSpacing: 2
            }}
          >
            FAZER LOGIN
          </button>
        </div>
      </div>
    );
  }

  if (!sessionId) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '40px 20px'
      }}>
        <div style={{ maxWidth: 440, width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <h2 style={{
            fontFamily: 'var(--font-head)', fontSize: 28, fontWeight: 700,
            color: 'var(--red)', letterSpacing: 1, marginBottom: 8
          }}>
            Pagamento necessário
          </h2>
          <p style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 24 }}>
            Você precisa fazer o pagamento antes de criar sua conta.
          </p>
          <button
            onClick={() => navigate('/')}
            style={{
              width: '100%', padding: 14, background: 'var(--green)',
              color: 'var(--bg)', fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-head)',
              border: 'none', borderRadius: 8, cursor: 'pointer', letterSpacing: 2
            }}
          >
            VOLTAR AO INÍCIO
          </button>
        </div>
      </div>
    );
  }

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
        <p style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 8 }}>
          Agora crie sua conta para acessar o VOZ DO JOGO.
        </p>
        <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 32 }}>
          Use o mesmo e-mail do pagamento: <strong style={{ color: 'var(--green)' }}>{email}</strong>
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
            <div style={{ position: 'relative' }}>
              <input
                type="email" placeholder="E-mail" value={email}
                readOnly
                style={inputStyle('email', true)}
              />
              <span style={{
                position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                fontSize: 16, color: 'var(--green)'
              }}>🔒</span>
            </div>
            <span style={{ fontSize: 11, color: 'var(--text3)' }}>
              E-mail vinculado ao pagamento (não pode ser alterado)
            </span>
            {errors.email && <span style={{ fontSize: 11, color: 'var(--red)', display: 'block' }}>{errors.email}</span>}
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
