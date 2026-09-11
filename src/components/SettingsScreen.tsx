import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, XCircle, RefreshCw, CreditCard } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
import Logo from './Logo';

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const { subscribed, subscriptionEnd, subscriptionStatus, gracePeriod, graceDaysRemaining, startCheckout, cancelSubscription, checkSubscription } = useSubscription();
  const navigate = useNavigate();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const handleStartCheckout = async () => {
    setCheckoutLoading(true);
    try {
      await startCheckout();
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!window.confirm('Cancelar sua assinatura? Você perde o acesso ao fim do período já pago.')) return;
    setCancelLoading(true);
    setCancelError(null);
    try {
      const { error } = await cancelSubscription();
      if (error) setCancelError(error);
    } finally {
      setCancelLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await checkSubscription();
    } finally {
      setRefreshing(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit', month: 'long', year: 'numeric'
    });
  };

  const getStatusLabel = (status: string | null) => {
    switch (status) {
      case 'authorized': return { text: 'Ativa', color: 'var(--green)' };
      case 'pending': return { text: 'Aguardando pagamento', color: 'var(--gold)' };
      case 'paused': return { text: 'Pausada', color: 'var(--gold)' };
      case 'cancelled': return { text: 'Cancelada', color: 'var(--red)' };
      default: return { text: status || 'Desconhecido', color: 'var(--text2)' };
    }
  };

  const statusInfo = getStatusLabel(subscriptionStatus);

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      padding: '40px 20px', animation: 'fadeUp .3s ease-out'
    }}>
      <div style={{ maxWidth: 520, width: '100%' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
          <h1 style={{
            fontFamily: 'var(--font-head)', fontSize: 32, fontWeight: 700,
            color: 'var(--text)', letterSpacing: 1
          }}>
            CONFIGURAÇÕES
          </h1>
          <button
            onClick={() => navigate('/escalacao')}
            style={{
              background: 'none', border: '1px solid var(--border2)', color: 'var(--text2)',
              padding: '8px 16px', borderRadius: 'var(--radius)', cursor: 'pointer',
              fontSize: 12, fontFamily: 'var(--font-body)', transition: 'all .2s',
              display: 'flex', alignItems: 'center', gap: 5
            }}
          >
            <ArrowLeft size={13} /> Voltar
          </button>
        </div>

        {/* Grace period warning */}
        {gracePeriod && (
          <div style={{
            padding: '14px 18px', marginBottom: 20, borderRadius: 'var(--radius)',
            background: graceDaysRemaining <= 3 ? 'rgba(214,40,34,0.08)' : 'rgba(156,100,0,0.08)',
            border: `1px solid ${graceDaysRemaining <= 3 ? 'rgba(214,40,34,0.3)' : 'rgba(156,100,0,0.25)'}`,
            color: graceDaysRemaining <= 3 ? 'var(--red)' : 'var(--gold)',
            fontSize: 13, fontWeight: 600,
            display: 'flex', alignItems: 'flex-start', gap: 8
          }}>
            <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>Sua assinatura está inadimplente. Você tem {graceDaysRemaining} dia{graceDaysRemaining !== 1 ? 's' : ''} para regularizar antes de perder o acesso.</span>
          </div>
        )}

        {/* Account info */}
        <div style={{
          background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', padding: 24, marginBottom: 16
        }}>
          <h3 style={{
            fontFamily: 'var(--font-head)', fontSize: 20, fontWeight: 600,
            color: 'var(--text)', letterSpacing: 1, marginBottom: 16
          }}>
            CONTA
          </h3>
          <InfoRow label="E-mail" value={user?.email || '—'} />
        </div>

        {/* Subscription info */}
        <div style={{
          background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', padding: 24, marginBottom: 16
        }}>
          <h3 style={{
            fontFamily: 'var(--font-head)', fontSize: 20, fontWeight: 600,
            color: 'var(--text)', letterSpacing: 1, marginBottom: 16
          }}>
            ASSINATURA E COBRANÇA
          </h3>
          <InfoRow label="Plano" value="VOZ DO JOGO — R$ 39,90/mês" />
          <InfoRow label="Status" value={statusInfo.text} valueColor={statusInfo.color} />
          <InfoRow label="Próxima cobrança" value={formatDate(subscriptionEnd)} last />
        </div>

        {/* Actions */}
        <div style={{
          background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', padding: 24, marginBottom: 16
        }}>
          <h3 style={{
            fontFamily: 'var(--font-head)', fontSize: 20, fontWeight: 600,
            color: 'var(--text)', letterSpacing: 1, marginBottom: 16
          }}>
            GERENCIAR
          </h3>

          {subscribed ? (
            <>
              <button
                onClick={handleCancelSubscription}
                disabled={cancelLoading}
                style={{
                  width: '100%', padding: 14, marginBottom: 10,
                  background: 'rgba(214,40,34,0.08)', color: 'var(--red)',
                  fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-head)',
                  border: '1px solid rgba(214,40,34,0.2)', borderRadius: 'var(--radius)', cursor: cancelLoading ? 'not-allowed' : 'pointer',
                  letterSpacing: 1, transition: 'all .2s', opacity: cancelLoading ? 0.5 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                }}
              >
                {cancelLoading ? 'CANCELANDO...' : <><XCircle size={15} /> CANCELAR ASSINATURA</>}
              </button>
              {cancelError && (
                <div style={{ fontSize: 12, color: 'var(--red)', marginBottom: 10, textAlign: 'center' }}>{cancelError}</div>
              )}
              <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 10, textAlign: 'center' }}>
                Pra trocar de cartão, cancele e assine de novo pela tela de pagamento.
              </div>
            </>
          ) : (
            <button
              onClick={handleStartCheckout}
              disabled={checkoutLoading}
              className="btn-green"
              style={{
                width: '100%', padding: 14, marginBottom: 10,
                fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-head)',
                borderRadius: 'var(--radius)', cursor: checkoutLoading ? 'not-allowed' : 'pointer',
                letterSpacing: 1, transition: 'all .2s', opacity: checkoutLoading ? 0.5 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
              }}
            >
              {checkoutLoading ? 'ABRINDO...' : <><CreditCard size={15} /> ASSINAR POR R$ 39,90/MÊS</>}
            </button>
          )}

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            style={{
              width: '100%', padding: 12,
              background: 'var(--bg3)', color: 'var(--text2)',
              fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-body)',
              border: '1px solid var(--border2)', borderRadius: 'var(--radius)',
              cursor: refreshing ? 'not-allowed' : 'pointer',
              transition: 'all .2s', opacity: refreshing ? 0.5 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
            }}
          >
            {refreshing ? 'Atualizando...' : <><RefreshCw size={13} /> Atualizar status da assinatura</>}
          </button>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          style={{
            width: '100%', padding: 14, marginTop: 8,
            background: 'rgba(214,40,34,0.08)', color: 'var(--red)',
            fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-body)',
            border: '1px solid rgba(214,40,34,0.2)', borderRadius: 'var(--radius)',
            cursor: 'pointer', transition: 'all .2s'
          }}
        >
          SAIR DA CONTA
        </button>
      </div>
    </div>
  );
}

function InfoRow({ label, value, valueColor, last }: { label: string; value: string; valueColor?: string; last?: boolean }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '10px 0', borderBottom: last ? 'none' : '1px solid var(--border)'
    }}>
      <span style={{ fontSize: 12, color: 'var(--text3)', letterSpacing: 1, textTransform: 'uppercase' }}>{label}</span>
      <span style={{ fontSize: 14, color: valueColor || 'var(--text)', fontWeight: 500 }}>{value}</span>
    </div>
  );
}
