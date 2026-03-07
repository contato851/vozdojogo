import logoSrc from '@/assets/logo-voz-do-jogo.png';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
}

// Visible heights after trimming transparent padding
const visibleHeights = { sm: 60, md: 90, lg: 180 };
// Scale factor to compensate for ~60% transparent padding in original PNG
const scale = 2.5;

export default function Logo({ size = 'md' }: LogoProps) {
  const h = visibleHeights[size];
  return (
    <div style={{
      height: h,
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <img
        src={logoSrc}
        alt="Voz do Jogo"
        style={{
          height: h * scale,
          width: 'auto',
          objectFit: 'contain',
        }}
      />
    </div>
  );
}
