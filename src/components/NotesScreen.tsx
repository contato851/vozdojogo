import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useTeamLogo } from '../hooks/useTeamLogo';

function NoteTeamLogo({ teamName, color, accent, size = 38, logo }: { teamName: string; color: string; accent: string; size?: number; logo?: string | null }) {
  const { logoUrl, loading } = useTeamLogo(teamName, false, logo);
  const [err, setErr] = useState(false);

  if (logoUrl && !err) {
    return (
      <img src={logoUrl} alt={teamName} onError={() => setErr(true)}
        style={{ width: size, height: size, objectFit: 'contain', flexShrink: 0 }} />
    );
  }

  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', display: 'flex',
      alignItems: 'center', justifyContent: 'center', background: color, flexShrink: 0
    }}>
      <span style={{ fontSize: size * 0.45, fontWeight: 700, fontFamily: 'var(--font-head)', color: accent }}>
        {loading ? '…' : (teamName || 'T').charAt(0)}
      </span>
    </div>
  );
}

export default function NotesScreen() {
  const { match, setMatch } = useApp();

  const updateCuriosities = (tk: 'teamA' | 'teamB', value: string) => {
    setMatch(m => ({ ...m, [tk]: { ...m[tk], curiosities: value } }));
  };

  return (
    <div style={{ animation: 'fadeUp .3s ease-out' }}>
      <div style={{ textAlign: 'center', marginBottom: 14 }}>
        <span style={{ fontSize: 12, color: 'var(--text3)' }}>
          Anote curiosidades para consultar durante a transmissão ao vivo.
        </span>
      </div>
      <div style={{ display: 'flex', gap: 14 }}>
        {(['teamA', 'teamB'] as const).map(tk => {
          const t = match[tk];
          return (
            <div key={tk} style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                background: 'var(--bg2)', border: '1px solid var(--border)',
                borderRadius: 0, padding: 20,
                borderTop: `3px solid ${t.color}`
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <NoteTeamLogo teamName={t.name} logo={t.logo} color={t.color} accent={t.accent} size={38} />
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>{t.name || 'TIME'}</div>
                    <div style={{ fontSize: 10, color: 'var(--text3)' }}>Curiosidades e anotações</div>
                  </div>
                </div>
                <textarea
                  value={t.curiosities}
                  onChange={e => updateCuriosities(tk, e.target.value)}
                  placeholder="• Invicto há 5 jogos&#10;• Artilheiro: João com 8 gols&#10;• Não perde em casa desde março"
                  style={{
                    background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 0,
                    padding: 12, color: 'var(--text)', fontSize: 13, width: '100%', outline: 'none',
                    fontFamily: 'var(--font-body)', lineHeight: 1.8, resize: 'vertical', minHeight: 250
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
