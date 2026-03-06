import { useState } from 'react';
import { useTeamLogo } from '../hooks/useTeamLogo';
import { TeamDBEntry } from '../data/types';

interface TeamLogoProps {
  team: TeamDBEntry;
  isNationalTeam: boolean;
  size?: number;
}

export default function TeamLogo({ team, isNationalTeam, size = 48 }: TeamLogoProps) {
  const { logoUrl, loading } = useTeamLogo(team.name, isNationalTeam);
  const [imgError, setImgError] = useState(false);

  const showFallback = !logoUrl || imgError;

  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      boxShadow: '0 2px 8px rgba(0,0,0,0.3)', border: '2px solid rgba(255,255,255,0.15)',
      background: showFallback ? team.color : 'var(--bg3)',
      overflow: 'hidden', transition: 'transform .15s',
      position: 'relative'
    }}>
      {loading && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          background: team.color
        }}>
          <span style={{
            fontWeight: 800, fontSize: size * 0.29, fontFamily: 'var(--font-head)',
            letterSpacing: 1, color: team.accent
          }}>
            {team.s}
          </span>
        </div>
      )}
      {logoUrl && !imgError ? (
        <img
          src={logoUrl}
          alt={team.name}
          onError={() => setImgError(true)}
          style={{
            width: size - 6, height: size - 6,
            objectFit: 'contain',
            borderRadius: isNationalTeam ? 2 : 0,
          }}
          loading="lazy"
        />
      ) : (
        <span style={{
          fontWeight: 800, fontSize: size * 0.29, fontFamily: 'var(--font-head)',
          letterSpacing: 1, color: team.accent
        }}>
          {team.s}
        </span>
      )}
    </div>
  );
}
