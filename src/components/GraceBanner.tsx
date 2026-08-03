import { AlertTriangle } from 'lucide-react';
import { useSubscription } from '../context/SubscriptionContext';

export default function GraceBanner() {
  const { gracePeriod, graceDaysRemaining, startCheckout } = useSubscription();

  if (!gracePeriod) return null;

  return (
    <div style={{
      background: graceDaysRemaining <= 3 ? 'rgba(214,40,34,0.08)' : 'rgba(156,100,0,0.08)',
      border: `1px solid ${graceDaysRemaining <= 3 ? 'rgba(214,40,34,0.3)' : 'rgba(156,100,0,0.25)'}`,
      borderRadius: 0,
      padding: '10px 16px',
      marginBottom: 12,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12
    }}>
      <div>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 13,
          color: graceDaysRemaining <= 3 ? 'var(--red)' : 'var(--gold)',
          letterSpacing: 1
        }}>
          <AlertTriangle size={14} /> PAGAMENTO PENDENTE
        </span>
        <span style={{ fontSize: 12, color: 'var(--text2)', marginLeft: 8 }}>
          {graceDaysRemaining === 1
            ? 'Sua conta será desativada amanhã.'
            : `Sua conta será desativada em ${graceDaysRemaining} dias.`}
        </span>
      </div>
      <button
        onClick={startCheckout}
        style={{
          background: 'var(--green)', color: '#fff', border: 'none',
          padding: '6px 16px', borderRadius: 0, fontSize: 11, fontWeight: 700,
          fontFamily: 'var(--font-body)', cursor: 'pointer', letterSpacing: 0.5,
          whiteSpace: 'nowrap', flexShrink: 0
        }}
      >
        REGULARIZAR
      </button>
    </div>
  );
}
