import Logo from './Logo';
import { useSubscription } from '../context/SubscriptionContext';

export default function PaywallScreen() {
  const { startCheckout, loading } = useSubscription();

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
          color: 'var(--text2)', fontSize: 13, marginBottom: 32, letterSpacing: 1
        }}>
          FERRAMENTA PROFISSIONAL PARA NARRADORES
        </div>

        <div style={{
          background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', padding: '32px 24px', marginBottom: 20
        }}>
          <div style={{
            fontFamily: 'var(--font-head)', fontSize: 22, fontWeight: 700,
            letterSpacing: 2, color: 'var(--text)', marginBottom: 8
          }}>
            ASSINE PARA CONTINUAR
          </div>
          <p style={{ color: 'var(--text2)', fontSize: 13, lineHeight: 1.6, marginBottom: 20 }}>
            Acesso completo a todas as funcionalidades: escalação, transmissão ao vivo, compartilhamento em tempo real e muito mais.
          </p>

          <div style={{
            display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 4, marginBottom: 20
          }}>
            <span style={{
              fontFamily: 'var(--font-head)', fontSize: 48, fontWeight: 700, color: 'var(--green)'
            }}>R$ 14,90</span>
            <span style={{ color: 'var(--text3)', fontSize: 14 }}>/mês</span>
          </div>

          <ul style={{
            listStyle: 'none', padding: 0, margin: '0 0 24px', textAlign: 'left',
            color: 'var(--text2)', fontSize: 13
          }}>
            {[
              '📋 Montagem de escalação com drag & drop',
              '📡 Compartilhamento ao vivo em tempo real',
              '⚽ Controle total de eventos da partida',
              '📝 Notas e curiosidades do narrador',
              '🔄 Importação/exportação de partidas'
            ].map((item, i) => (
              <li key={i} style={{ padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                {item}
              </li>
            ))}
          </ul>

          <button
            onClick={startCheckout}
            disabled={loading}
            style={{
              width: '100%', padding: 14, background: 'var(--green)',
              color: 'var(--bg)', fontSize: 16, fontWeight: 700,
              fontFamily: 'var(--font-body)', border: 'none',
              borderRadius: 'var(--radius)', cursor: loading ? 'not-allowed' : 'pointer',
              letterSpacing: 1, transition: 'all .2s',
              opacity: loading ? 0.5 : 1
            }}
          >
            {loading ? 'CARREGANDO...' : 'ASSINAR AGORA'}
          </button>
        </div>

        <p style={{ color: 'var(--text3)', fontSize: 10 }}>
          Pagamento seguro via Stripe. Cancele quando quiser.
        </p>
      </div>
    </div>
  );
}
