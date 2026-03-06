import { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { FORMATIONS, FORMATION_KEYS } from '../data/formations';
import { loadLive } from '../data/store';
import { fetchSquad } from '../data/apiFootball';
import TeamPicker from './TeamPicker';

export default function SetupScreen() {
  const { match, setMatch, liveState, startLive, resetLive, newMatch, exportMatch, importMatch } = useApp();
  const [pickerTeam, setPickerTeam] = useState<'teamA' | 'teamB' | null>(null);
  const [fetchingSquad, setFetchingSquad] = useState<'teamA' | 'teamB' | null>(null);
  const [squadError, setSquadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const dragItem = useRef<{ tk: 'teamA' | 'teamB'; type: 'starters' | 'reserves'; idx: number } | null>(null);
  const dragOver = useRef<{ tk: 'teamA' | 'teamB'; type: 'starters' | 'reserves'; idx: number } | null>(null);

  const handleDragStart = (tk: 'teamA' | 'teamB', type: 'starters' | 'reserves', idx: number) => {
    dragItem.current = { tk, type, idx };
  };

  const handleDragEnter = (tk: 'teamA' | 'teamB', type: 'starters' | 'reserves', idx: number) => {
    dragOver.current = { tk, type, idx };
  };

  const handleDragEnd = () => {
    const from = dragItem.current;
    const to = dragOver.current;
    if (!from || !to || from.tk !== to.tk || from.type !== to.type) {
      dragItem.current = null;
      dragOver.current = null;
      return;
    }
    if (from.idx === to.idx) {
      dragItem.current = null;
      dragOver.current = null;
      return;
    }
    setMatch(m => {
      const team = { ...m[from.tk] };
      const players = [...team[from.type]];
      const [moved] = players.splice(from.idx, 1);
      players.splice(to.idx, 0, moved);
      team[from.type] = players;
      return { ...m, [from.tk]: team };
    });
    dragItem.current = null;
    dragOver.current = null;
  };

  const updateField = (field: string, value: string) => {
    setMatch(m => ({ ...m, [field]: value }));
  };

  const updateTeam = (tk: 'teamA' | 'teamB', field: string, value: string) => {
    setMatch(m => ({ ...m, [tk]: { ...m[tk], [field]: value } }));
  };

  const updatePlayer = (tk: 'teamA' | 'teamB', type: 'starters' | 'reserves', idx: number, field: string, value: string) => {
    setMatch(m => {
      const team = { ...m[tk] };
      const players = [...team[type]];
      players[idx] = { ...players[idx], [field]: value };
      team[type] = players;
      return { ...m, [tk]: team };
    });
  };

  const addReserve = (tk: 'teamA' | 'teamB') => {
    setMatch(m => {
      const team = { ...m[tk] };
      team.reserves = [...team.reserves, { id: `r-${Date.now()}`, number: '', name: '' }];
      return { ...m, [tk]: team };
    });
  };

  const removeReserve = (tk: 'teamA' | 'teamB', idx: number) => {
    setMatch(m => {
      const team = { ...m[tk] };
      team.reserves = team.reserves.filter((_, i) => i !== idx);
      return { ...m, [tk]: team };
    });
  };

  const selectTeam = async (tk: 'teamA' | 'teamB', team: { name: string; color: string; accent: string }) => {
    setMatch(m => ({
      ...m,
      [tk]: { ...m[tk], name: team.name, color: team.color, accent: team.accent }
    }));
    setPickerTeam(null);

    // Auto-fetch squad
    setFetchingSquad(tk);
    setSquadError(null);
    try {
      const result = await fetchSquad(team.name);
      setMatch(m => ({
        ...m,
        [tk]: {
          ...m[tk],
          starters: result.starters,
          reserves: result.reserves,
          ...(result.coach ? { coach: result.coach } : {})
        }
      }));
    } catch (err: any) {
      setSquadError(`${team.name}: ${err.message || 'Erro ao buscar elenco'}`);
    } finally {
      setFetchingSquad(null);
    }
  };

  const hasLive = liveState && loadLive()?.matchId === match.id;

  const infoFields: [string, string][] = [
    ['stadium', 'Estádio'], ['referee', 'Árbitro'], ['assistant1', 'Assistente 1'],
    ['assistant2', 'Assistente 2'], ['var_ref', 'VAR'], ['reporter', 'Reportagem'],
    ['commentators', 'Comentários']
  ];

  return (
    <div style={{ animation: 'fadeUp .3s ease-out' }}>
      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
        <button onClick={startLive} className="btn-green">⚡ INICIAR TRANSMISSÃO</button>
        {hasLive && <button onClick={resetLive} className="btn-red">🔄 Reiniciar Transmissão</button>}
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 16, marginTop: -8 }}>
        <input type="file" ref={fileRef} accept=".json" style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) importMatch(e.target.files[0]); }} />
        <button onClick={() => fileRef.current?.click()} className="btn-ghost">📂 Importar Partida</button>
        <button onClick={exportMatch} className="btn-ghost">💾 Exportar</button>
        <button onClick={newMatch} className="btn-ghost">🆕 Nova Partida</button>
      </div>

      {/* Squad error */}
      {squadError && (
        <div style={{
          background: 'rgba(255,61,61,0.1)', border: '1px solid rgba(255,61,61,0.3)',
          borderRadius: 'var(--radius)', padding: '8px 14px', marginBottom: 14,
          fontSize: 12, color: 'var(--red)', textAlign: 'center'
        }}>
          {squadError}
        </div>
      )}

      {/* Match info */}
      <Card title="Informações da Partida">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {infoFields.map(([f, l]) => (
            <div key={f}>
              <Label>{l}</Label>
              <Input value={(match as any)[f] || ''} onChange={v => updateField(f, v)} placeholder={l.toUpperCase()} />
            </div>
          ))}
        </div>
      </Card>

      {/* Sort order */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <Label>Ordenação da Escalação</Label>
            <span style={{ fontSize: 12, color: 'var(--text2)' }}>Como os titulares aparecem na tela ao vivo</span>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              onClick={() => updateField('sortOrder', 'number')}
              className={match.sortOrder !== 'manual' ? 'btn-green' : 'btn-ghost'}
            >Por Número</button>
            <button
              onClick={() => updateField('sortOrder', 'manual')}
              className={match.sortOrder === 'manual' ? 'btn-green' : 'btn-ghost'}
            >Ordem Manual</button>
          </div>
        </div>
      </Card>

      {/* Teams */}
      <div style={{ display: 'flex', gap: 14 }}>
        {(['teamA', 'teamB'] as const).map(tk => (
          <div key={tk} style={{ flex: 1, minWidth: 0 }}>
            <Card>
              <div style={{ marginBottom: 12 }}>
                <button onClick={() => setPickerTeam(tk)} className="btn-ghost" style={{ width: '100%', padding: 10, fontSize: 12 }}>
                  {fetchingSquad === tk ? '⏳ Buscando elenco...' : '⚽ Selecionar Time'}
                </button>
              </div>

              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                  <Label>Nome</Label>
                  <Input value={match[tk].name} onChange={v => updateTeam(tk, 'name', v)} />
                </div>
                <div style={{ flex: 1 }}>
                  <Label>Técnico</Label>
                  <Input value={match[tk].coach} onChange={v => updateTeam(tk, 'coach', v)} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <div style={{ display: 'flex', gap: 10, flex: 1 }}>
                  <label style={{ width: 90 }}>
                    <Label>Cor</Label>
                    <input type="color" value={match[tk].color} onChange={e => updateTeam(tk, 'color', e.target.value)}
                      style={{ width: '100%', height: 34, border: 'none', borderRadius: 6, cursor: 'pointer', background: 'transparent' }} />
                  </label>
                  <label style={{ width: 90 }}>
                    <Label>Destaque</Label>
                    <input type="color" value={match[tk].accent} onChange={e => updateTeam(tk, 'accent', e.target.value)}
                      style={{ width: '100%', height: 34, border: 'none', borderRadius: 6, cursor: 'pointer', background: 'transparent' }} />
                  </label>
                </div>
                <div style={{ flex: 1 }}>
                  <Label>Formação</Label>
                  <select
                    value={match[tk].formation}
                    onChange={e => updateTeam(tk, 'formation', e.target.value)}
                    style={{
                      background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 6,
                      padding: '6px 10px', color: 'var(--text)', fontSize: 12,
                      fontFamily: 'var(--font-body)', outline: 'none', cursor: 'pointer', width: '100%'
                    }}
                  >
                    {FORMATION_KEYS.map(k => (
                      <option key={k} value={k}>{FORMATIONS[k].label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <Label>Titulares (11)</Label>
              {match[tk].starters.map((p, i) => (
                <div
                  key={p.id}
                  draggable
                  onDragStart={() => handleDragStart(tk, 'starters', i)}
                  onDragEnter={() => handleDragEnter(tk, 'starters', i)}
                  onDragEnd={handleDragEnd}
                  onDragOver={e => e.preventDefault()}
                  style={{ display: 'flex', gap: 5, marginBottom: 3, alignItems: 'center', cursor: 'grab' }}
                >
                  <span style={{ color: 'var(--text3)', fontSize: 10, cursor: 'grab', userSelect: 'none', width: 14, textAlign: 'center', flexShrink: 0 }}>⠿</span>
                  <Input
                    value={p.number}
                    onChange={v => updatePlayer(tk, 'starters', i, 'number', v)}
                    style={{ width: 52, textAlign: 'center', flexShrink: 0 }}
                  />
                  <Input
                    value={p.name}
                    onChange={v => updatePlayer(tk, 'starters', i, 'name', v)}
                    onBlur={v => updatePlayer(tk, 'starters', i, 'name', v.toUpperCase())}
                    placeholder={`Titular ${i + 1}`}
                    style={{ flex: 1 }}
                  />
                </div>
              ))}

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '12px 0 4px' }}>
                <Label>Reservas</Label>
                <button onClick={() => addReserve(tk)} style={{
                  background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text2)',
                  fontSize: 11, padding: '3px 10px', borderRadius: 4, cursor: 'pointer', fontFamily: 'var(--font-body)'
                }}>+ Reserva</button>
              </div>
              <div style={{ maxHeight: 260, overflowY: 'auto' }}>
                {match[tk].reserves.map((p, i) => (
                  <div
                    key={p.id}
                    draggable
                    onDragStart={() => handleDragStart(tk, 'reserves', i)}
                    onDragEnter={() => handleDragEnter(tk, 'reserves', i)}
                    onDragEnd={handleDragEnd}
                    onDragOver={e => e.preventDefault()}
                    style={{ display: 'flex', gap: 5, marginBottom: 3, alignItems: 'center', cursor: 'grab' }}
                  >
                    <span style={{ color: 'var(--text3)', fontSize: 10, cursor: 'grab', userSelect: 'none', width: 14, textAlign: 'center', flexShrink: 0 }}>⠿</span>
                    <Input
                      value={p.number}
                      onChange={v => updatePlayer(tk, 'reserves', i, 'number', v)}
                      style={{ width: 52, textAlign: 'center', flexShrink: 0 }}
                    />
                    <Input
                      value={p.name}
                      onChange={v => updatePlayer(tk, 'reserves', i, 'name', v)}
                      onBlur={v => updatePlayer(tk, 'reserves', i, 'name', v.toUpperCase())}
                      placeholder={`Reserva ${i + 1}`}
                      style={{ flex: 1 }}
                    />
                    <button onClick={() => removeReserve(tk, i)} style={{
                      background: 'rgba(255,61,61,0.1)', border: 'none', color: 'var(--red)',
                      fontSize: 14, width: 26, height: 34, borderRadius: 4, cursor: 'pointer', flexShrink: 0
                    }}>×</button>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        ))}
      </div>

      {pickerTeam && (
        <TeamPicker
          onSelect={team => selectTeam(pickerTeam, team)}
          onClose={() => setPickerTeam(null)}
        />
      )}
    </div>
  );
}

function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: 'var(--bg2)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius)', padding: 20, marginBottom: 14
    }}>
      {title && (
        <div style={{
          fontFamily: 'var(--font-head)', fontSize: 20, fontWeight: 600,
          color: 'var(--green)', letterSpacing: 1, marginBottom: 12, display: 'flex',
          alignItems: 'center', gap: 8
        }}>
          {title}
        </div>
      )}
      {children}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 600, letterSpacing: 1.5, color: 'var(--text3)',
      textTransform: 'uppercase', marginBottom: 4, fontFamily: 'var(--font-body)'
    }}>
      {children}
    </div>
  );
}

function Input({ value, onChange, onBlur, placeholder, style }: {
  value: string; onChange: (v: string) => void; onBlur?: (v: string) => void;
  placeholder?: string; style?: React.CSSProperties
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      onBlur={e => onBlur?.(e.target.value)}
      placeholder={placeholder}
      style={{
        background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 6,
        padding: '8px 12px', color: 'var(--text)', fontSize: 13, width: '100%',
        outline: 'none', fontFamily: 'var(--font-body)', transition: 'border-color .2s',
        ...style
      }}
    />
  );
}
