import { useSubscription } from '../context/SubscriptionContext';

export default function GraceBanner() {
  const { gracePeriod, graceDaysRemaining, startCheckout } = useSubscription();

  if (!gracePeriod) return null;

  return (
    <div style={{
      background: graceDaysRemaining <= 3 ? 'rgba(255,61,61,0.15)' : 'rgba(255,215,64,0.12)',
      border: `1px solid ${graceDaysRemaining <= 3 ? 'rgba(255,61,61,0.4)' : 'rgba(255,215,64,0.3)'}`,
      borderRadius: 'var(--radius)',
      padding: '10px 16px',
      marginBottom: 12,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12
    }}>
      <div>
        <span style={{
          fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 13,
          color: graceDaysRemaining <= 3 ? 'var(--red)' : 'var(--gold)',
          letterSpacing: 1
        }}>
          ⚠️ PAGAMENTO PENDENTE
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
          background: 'var(--green)', color: 'var(--bg)', border: 'none',
          padding: '6px 16px', borderRadius: 6, fontSize: 11, fontWeight: 700,
          fontFamily: 'var(--font-body)', cursor: 'pointer', letterSpacing: 0.5,
          whiteSpace: 'nowrap', flexShrink: 0
        }}
      >
        REGULARIZAR
      </button>
    </div>
  );
}
