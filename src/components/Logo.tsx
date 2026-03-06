import logoSrc from '@/assets/logo-voz-do-jogo.png';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
}

const heights = { sm: 32, md: 44, lg: 80 };

export default function Logo({ size = 'md' }: LogoProps) {
  return (
    <img
      src={logoSrc}
      alt="Voz do Jogo"
      style={{ height: heights[size], width: 'auto', objectFit: 'contain' }}
    />
  );
}
