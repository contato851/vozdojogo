interface SelectableCardProps {
  emoji: string;
  label: string;
  selected: boolean;
  onClick: () => void;
}

export default function SelectableCard({ emoji, label, selected, onClick }: SelectableCardProps) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        width: '100%', padding: '16px 20px', borderRadius: 10,
        background: selected ? 'var(--green-dim)' : 'var(--bg2)',
        border: `2px solid ${selected ? 'var(--green)' : 'var(--border)'}`,
        color: selected ? 'var(--green)' : 'var(--text)',
        cursor: 'pointer', transition: 'all .2s', textAlign: 'left',
        fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 500
      }}
    >
      <span style={{ fontSize: 22, flexShrink: 0 }}>{emoji}</span>
      <span>{label}</span>
    </button>
  );
}
