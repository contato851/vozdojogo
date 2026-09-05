import { useState } from 'react';
import { useTeamLogo } from '../hooks/useTeamLogo';
import { TeamDBEntry } from '../data/types';

interface TeamLogoProps {
  team: TeamDBEntry;
  size?: number;
}

export default function TeamLogo({ team, size = 48 }: TeamLogoProps) {
  const { logoUrl, loading } = useTeamLogo(team.name);
  const [imgError, setImgError] = useState(false);

  if (logoUrl && !imgError) {
    return (
      <img
        src={logoUrl}
        alt={team.name}
        onError={() => setImgError(true)}
        style={{
          width: size, height: size,
          objectFit: 'contain',
          borderRadius: 'var(--radius)',
          flexShrink: 0,
        }}
        loading="lazy"
      />
    );
  }

  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', display: 'flex',
      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      background: team.color,
    }}>
      <span style={{
        fontWeight: 800, fontSize: size * 0.29, fontFamily: 'var(--font-head)',
        letterSpacing: 1, color: team.accent
      }}>
        {loading ? '…' : team.s}
      </span>
    </div>
  );
}
