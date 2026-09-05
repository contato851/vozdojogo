import { Lock, RefreshCw } from 'lucide-react';
import Logo from './Logo';
import { useSubscription } from '../context/SubscriptionContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function PaywallScreen() {
  const { startCheckout, checkSubscription, loading } = useSubscription();
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', padding: 20
    }}>
      <div style={{ textAlign: 'center', maxWidth: 440, width: '100%' }}>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center' }}>
          <Logo size="lg" />
        </div>

        <div style={{
          background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', padding: '32px 24px', marginBottom: 20
        }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12, color: 'var(--text2)' }}><Lock size={40} /></div>
          <div style={{
            fontFamily: 'var(--font-head)', fontSize: 22, fontWeight: 700,
            letterSpacing: 2, color: 'var(--text)', marginBottom: 8
          }}>
            ASSINATURA NECESSÁRIA
          </div>
          <p style={{ color: 'var(--text2)', fontSize: 13, lineHeight: 1.6, marginBottom: 20 }}>
            Sua assinatura não está ativa. Regularize para continuar usando o VOZ DO JOGO.
          </p>

          <button
            onClick={startCheckout}
            disabled={loading}
            style={{
              width: '100%', padding: 14, marginBottom: 10, background: 'var(--green)',
              color: 'var(--green-text)', fontSize: 16, fontWeight: 700,
              fontFamily: 'var(--font-body)', border: 'none',
              borderRadius: 'var(--radius)', cursor: loading ? 'not-allowed' : 'pointer',
              letterSpacing: 1, transition: 'all .2s',
              opacity: loading ? 0.5 : 1
            }}
          >
            {loading ? 'CARREGANDO...' : 'ASSINAR POR R$ 14,90/MÊS'}
          </button>

          <button
            onClick={() => checkSubscription()}
            style={{
              width: '100%', padding: 12, background: 'var(--bg3)',
              color: 'var(--text2)', fontSize: 13, fontWeight: 600,
              fontFamily: 'var(--font-body)', border: '1px solid var(--border2)',
              borderRadius: 'var(--radius)', cursor: 'pointer', transition: 'all .2s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
            }}
          >
            <RefreshCw size={13} /> Já paguei — verificar novamente
          </button>
        </div>

        <button
          onClick={handleLogout}
          style={{
            background: 'none', border: 'none', color: 'var(--text3)',
            fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-body)',
            textDecoration: 'underline'
          }}
        >
          Sair da conta
        </button>

        <p style={{ color: 'var(--text3)', fontSize: 10, marginTop: 12 }}>
          Pagamento seguro via Mercado Pago. Cancele quando quiser.
        </p>
      </div>
    </div>
  );
}
