interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
}

const sizes = {
  sm: { fontSize: 20, gap: 6, tagSize: 8 },
  md: { fontSize: 24, gap: 8, tagSize: 9 },
  lg: { fontSize: 48, gap: 10, tagSize: 10 },
};

export default function Logo({ size = 'md' }: LogoProps) {
  const s = sizes[size];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: s.gap }}>
      <span style={{
        fontFamily: 'var(--font-head)', fontSize: s.fontSize, fontWeight: 700,
        color: 'var(--green)', letterSpacing: size === 'lg' ? 4 : 2, lineHeight: 1
      }}>
        VOZ DO JOGO
      </span>
      {size !== 'lg' && (
        <span style={{
          fontSize: s.tagSize, color: 'var(--text3)', letterSpacing: 1,
          background: 'var(--bg3)', padding: '2px 6px', borderRadius: 3
        }}>
          v1.0
        </span>
      )}
    </div>
  );
}
