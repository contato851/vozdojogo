interface ProgressBarProps {
  total: number;
  current: number;
}

export default function ProgressBar({ total, current }: ProgressBarProps) {
  return (
    <div style={{ display: 'flex', gap: 6, width: '100%', marginBottom: 8 }}>
      {Array.from({ length: total }, (_, i) => (
        <div key={i} style={{
          flex: 1, height: 4, borderRadius: 2,
          background: i < current ? 'var(--green)' : i === current ? 'var(--green)' : 'var(--bg3)',
          opacity: i < current ? 0.5 : 1,
          transition: 'all 0.4s ease'
        }} />
      ))}
    </div>
  );
}
