import { useApp } from '../context/AppContext';

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
                borderRadius: 'var(--radius)', padding: 20,
                borderTop: `3px solid ${t.color}`
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: 7, display: 'flex',
                    alignItems: 'center', justifyContent: 'center', background: t.color
                  }}>
                    <span style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-head)', color: t.accent }}>
                      {(t.name || 'T').charAt(0)}
                    </span>
                  </div>
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
                    background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 6,
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
