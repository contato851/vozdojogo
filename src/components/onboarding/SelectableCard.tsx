import { LucideIcon } from 'lucide-react';

interface SelectableCardProps {
  icon: LucideIcon;
  label: string;
  selected: boolean;
  onClick: () => void;
}

export default function SelectableCard({ icon: Icon, label, selected, onClick }: SelectableCardProps) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        width: '100%', padding: '16px 20px', borderRadius: 0,
        background: selected ? 'var(--green-dim)' : 'var(--bg2)',
        border: `2px solid ${selected ? 'var(--green)' : 'var(--border)'}`,
        color: selected ? 'var(--green)' : 'var(--text)',
        cursor: 'pointer', transition: 'all .2s', textAlign: 'left',
        fontFamily: 'var(--font-body)', fontSize: 15, fontWeight: 500
      }}
    >
      <Icon size={20} style={{ flexShrink: 0 }} />
      <span>{label}</span>
    </button>
  );
}
