import logoSrc from '@/assets/logo-voz-do-jogo.png';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
}

const heights = { sm: 20, md: 30, lg: 48 };

export default function Logo({ size = 'md', animated = true }: LogoProps) {
  return (
    <>
      {animated && (
        <style>{`
          @keyframes logoEntrance {
            0% { opacity: 0; transform: translateY(6px) scale(0.92); }
            60% { opacity: 1; transform: translateY(0) scale(1.03); }
            100% { opacity: 1; transform: translateY(0) scale(1); }
          }
        `}</style>
      )}
      <img
        src={logoSrc}
        alt="Voz do Jogo"
        style={{
          height: heights[size],
          width: 'auto',
          display: 'block',
          ...(animated ? { animation: 'logoEntrance 0.6s cubic-bezier(0.22, 1, 0.36, 1) both' } : {}),
        }}
      />
    </>
  );
}
