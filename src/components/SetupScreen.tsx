import { useState, useRef } from 'react';
import Logo from './Logo';
import { useApp } from '../context/AppContext';
import { FORMATIONS, FORMATION_KEYS } from '../data/formations';
import { loadLive, makeEmpty } from '../data/store';
import { useTeamLogo } from '../hooks/useTeamLogo';
import TeamPicker from './TeamPicker';
import { useCustomTeams, CustomTeam } from '../hooks/useCustomTeams';
import { useSavedLineups } from '../hooks/useSavedLineups';

function LiveTeamLogo({ teamName, size = 38 }: { teamName: string; size?: number }) {
  const { logoUrl } = useTeamLogo(teamName, false);
  const [err, setErr] = useState(false);
  if (!logoUrl || err) return null;
  return (
    <img src={logoUrl} alt={teamName} onError={() => setErr(true)}
      style={{ width: size, height: size, objectFit: 'contain', flexShrink: 0 }} loading="lazy" />
  );
}

export default function SetupScreen() {
  const { match, setMatch, liveState, startLive, resetLive, newMatch, exportMatch, importMatch } = useApp();
  const [pickerTeam, setPickerTeam] = useState<'teamA' | 'teamB' | null>(null);
  const [savingLineup, setSavingLineup] = useState<'teamA' | 'teamB' | null>(null);
  const [lineupError, setLineupError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const dragItem = useRef<{ tk: 'teamA' | 'teamB'; type: 'starters' | 'reserves' | 'unlisted'; idx: number } | null>(null);
  const dragOver = useRef<{ tk: 'teamA' | 'teamB'; type: 'starters' | 'reserves' | 'unlisted'; idx: number } | null>(null);
  const [dropTarget, setDropTarget] = useState<{ tk: string; type: string; idx: number } | null>(null);
  const { teams: customTeams, saveTeam, refetch: refetchCustomTeams } = useCustomTeams();
  const { findByTeamName: findSavedLineup, saveLineup, refetch: refetchLineups } = useSavedLineups();

  const normalizeTeamName = (name: string) =>
    name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

  const buildLineupFromPlayers = (
    tk: 'teamA' | 'teamB',
    players: { number: string; name: string }[]
  ) => {
    const stamp = Date.now();
    const normalizedPlayers = players
      .map((p, idx) => ({
        id: `${tk}-p-${stamp}-${idx}`,
        number: String(p.number || ''),
        name: String(p.name || '').trim().toUpperCase(),
      }))
      .filter(p => p.name);

    const startersBase = normalizedPlayers.slice(0, 11);
    const reservesBase = normalizedPlayers.slice(11, 23);

    const starters = [
      ...startersBase,
      ...makeEmpty(Math.max(0, 11 - startersBase.length), `${tk}-s-fill-${stamp}`),
    ].slice(0, 11);

    const reserves = [
      ...reservesBase,
      ...makeEmpty(Math.max(0, 12 - reservesBase.length), `${tk}-r-fill-${stamp}`),
    ].slice(0, 12);

    return { starters, reserves };
  };

  const handleDragStart = (tk: 'teamA' | 'teamB', type: 'starters' | 'reserves' | 'unlisted', idx: number) => {
    dragItem.current = { tk, type, idx };
  };
  const handleDragEnter = (tk: 'teamA' | 'teamB', type: 'starters' | 'reserves' | 'unlisted', idx: number) => {
    dragOver.current = { tk, type, idx };
    setDropTarget({ tk, type, idx });
  };
  const handleDragEnd = () => {
    setDropTarget(null);
    const from = dragItem.current;
    const to = dragOver.current;
    if (!from || !to || from.tk !== to.tk) {
      dragItem.current = null;
      dragOver.current = null;
      return;
    }
    if (from.type === to.type && from.idx === to.idx) {
      dragItem.current = null;
      dragOver.current = null;
      return;
    }
    setMatch(m => {
      const team = { ...m[from.tk] };
      if (from.type === to.type) {
        // Reorder within same list
        const players = [...team[from.type]];
        const [moved] = players.splice(from.idx, 1);
        players.splice(to.idx, 0, moved);
        team[from.type] = players;
      } else {
        // Swap between starters and reserves
        const fromList = [...team[from.type]];
        const toList = [...team[to.type]];
        const fromPlayer = fromList[from.idx];
        const toPlayer = toList[to.idx];
        fromList[from.idx] = toPlayer;
        toList[to.idx] = fromPlayer;
        team[from.type] = fromList;
        team[to.type] = toList;
      }
      return { ...m, [from.tk]: team };
    });
    dragItem.current = null;
    dragOver.current = null;
  };
  const handleDragLeave = () => {
    setDropTarget(null);
  };
  const isDropTarget = (tk: string, type: string, idx: number) => {
    return dropTarget?.tk === tk && dropTarget?.type === type && dropTarget?.idx === idx;
  };

  const updateField = (field: string, value: string) => {
    setMatch(m => ({ ...m, [field]: value }));
  };
  const updateTeam = (tk: 'teamA' | 'teamB', field: string, value: string) => {
    setMatch(m => ({ ...m, [tk]: { ...m[tk], [field]: value } }));
  };
  const updatePlayer = (tk: 'teamA' | 'teamB', type: 'starters' | 'reserves' | 'unlisted', idx: number, field: string, value: string) => {
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
  const addUnlisted = (tk: 'teamA' | 'teamB') => {
    setMatch(m => {
      const team = { ...m[tk] };
      team.unlisted = [...(team.unlisted || []), { id: `u-${Date.now()}`, number: '', name: '' }];
      return { ...m, [tk]: team };
    });
  };
  const removeUnlisted = (tk: 'teamA' | 'teamB', idx: number) => {
    setMatch(m => {
      const team = { ...m[tk] };
      team.unlisted = (team.unlisted || []).filter((_, i) => i !== idx);
      return { ...m, [tk]: team };
    });
  };

  const selectTeam = (tk: 'teamA' | 'teamB', team: { name: string; color: string; accent: string; customPlayers?: { number: string; name: string }[] }) => {
    setPickerTeam(null);
    setLineupError(null);

    if (team.customPlayers && team.customPlayers.length > 0) {
      const { starters, reserves } = buildLineupFromPlayers(tk, team.customPlayers);
      setMatch(m => ({
        ...m,
        [tk]: {
          ...m[tk],
          name: team.name,
          color: team.color,
          accent: team.accent,
          starters,
          reserves,
          coach: '',
          unlisted: [],
        }
      }));
      return;
    }

    const savedLineup = findSavedLineup(team.name);
    const savedPlayers = savedLineup?.players || [];
    const { starters, reserves } = buildLineupFromPlayers(tk, savedPlayers);

    setMatch(m => ({
      ...m,
      [tk]: {
        ...m[tk],
        name: team.name,
        color: team.color,
        accent: team.accent,
        starters,
        reserves,
        coach: '',
        unlisted: [],
      }
    }));
  };

  const handleSaveLineup = async (tk: 'teamA' | 'teamB') => {
    const team = match[tk];

    if (!team.name || team.name === 'TIME A' || team.name === 'TIME B') {
      setLineupError('Selecione um time antes de salvar o elenco.');
      return;
    }

    const players = [...team.starters, ...team.reserves]
      .map(player => ({
        number: String(player.number || '').trim(),
        name: String(player.name || '').trim().toUpperCase(),
      }))
      .filter(player => player.name.length > 0);

    if (players.length === 0) {
      setLineupError(`Preencha pelo menos um jogador para salvar o elenco do ${team.name}.`);
      return;
    }

    try {
      setSavingLineup(tk);
      setLineupError(null);

      const saved = await saveLineup(team.name, players);

      if (!saved) {
        throw new Error('Faça login para salvar o elenco.');
      }

      await refetchLineups();
      alert(`Elenco de ${team.name} salvo com sucesso!`);
    } catch (error: any) {
      setLineupError(error?.message || `Não foi possível salvar o elenco de ${team.name}.`);
    } finally {
      setSavingLineup(null);
    }
  };

  const hasLive = liveState && loadLive()?.matchId === match.id;
  const teamASelected = match.teamA.name && match.teamA.name !== 'TIME A';
  const teamBSelected = match.teamB.name && match.teamB.name !== 'TIME B';
  const teamsSelected = teamASelected && teamBSelected;
  const noTeamSelected = !teamASelected && !teamBSelected;

  return (
    <div style={{ animation: 'fadeUp .3s ease-out' }}>

      {/* === EMPTY STATE === */}
      {noTeamSelected && (
        <div style={{
          background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
          padding: '48px 24px', marginBottom: 14, textAlign: 'center',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16
        }}>
          <Logo size="lg" />
          <div>
            <h2 style={{
              fontFamily: 'var(--font-head)', fontSize: 28, fontWeight: 700,
              letterSpacing: 3, color: 'var(--text)', margin: '0 0 6px'
            }}>NOVA PARTIDA</h2>
            <p style={{ fontSize: 13, color: 'var(--text2)', margin: 0, lineHeight: 1.5 }}>
              Selecione os times para iniciar a configuração da escalação
            </p>
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <button
              onClick={() => setPickerTeam('teamA')}
              className="btn-green"
              style={{ padding: '12px 28px', fontSize: 14, letterSpacing: 1.5 }}
            >
              🏠 TIME DA CASA
            </button>
            <button
              onClick={() => setPickerTeam('teamB')}
              style={{
                padding: '12px 28px', fontSize: 14, letterSpacing: 1.5,
                background: 'var(--bg3)', border: '1px solid var(--border2)',
                color: 'var(--text)', borderRadius: 6, cursor: 'pointer',
                fontFamily: 'var(--font-head)', fontWeight: 600,
                transition: 'all .2s'
              }}
            >
              ✈️ VISITANTE
            </button>
          </div>
          {/* Utility buttons */}
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <input type="file" ref={fileRef} accept=".json" style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) importMatch(e.target.files[0]); }} />
            <button onClick={() => fileRef.current?.click()} className="btn-ghost" style={{ fontSize: 11 }}>📂 Importar partida</button>
          </div>
        </div>
      )}

      {!noTeamSelected && <>{/* === HEADER: VS display like live screen === */}
      <div style={{
        background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
        padding: '20px', marginBottom: 14
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 12 }}>
          {/* Team A */}
          <div
            onClick={() => setPickerTeam('teamA')}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
              cursor: 'pointer', padding: 16, borderRadius: 8, border: '1px solid var(--border)',
              background: match.teamA.name ? 'rgba(0,0,0,0.2)' : 'var(--bg3)',
              transition: 'all .2s', position: 'relative'
            }}
          >
            {match.teamA.name ? (
              <>
                <LiveTeamLogo teamName={match.teamA.name} size={56} />
                <span style={{ fontFamily: 'var(--font-head)', fontSize: 22, fontWeight: 700, letterSpacing: 2, color: match.teamA.accent, textAlign: 'center' }}>
                  {match.teamA.name}
                </span>
                <span style={{ fontSize: 9, color: 'var(--text3)', letterSpacing: 1 }}>CLIQUE PARA TROCAR</span>
              </>
            ) : (
              <>
                <div style={{
                  width: 56, height: 56, borderRadius: '50%', background: 'var(--bg)', border: '2px dashed var(--border2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: 'var(--text3)'
                }}>⚽</div>
                <span style={{ fontFamily: 'var(--font-head)', fontSize: 16, fontWeight: 600, color: 'var(--text3)', letterSpacing: 1 }}>
                  SELECIONAR TIME A
                </span>
              </>
            )}
          </div>

          {/* VS */}
          <div style={{
            fontFamily: 'var(--font-head)', fontSize: 36, fontWeight: 700, color: 'var(--text3)',
            letterSpacing: 4, flexShrink: 0
          }}>VS</div>

          {/* Team B */}
          <div
            onClick={() => setPickerTeam('teamB')}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
              cursor: 'pointer', padding: 16, borderRadius: 8, border: '1px solid var(--border)',
              background: match.teamB.name ? 'rgba(0,0,0,0.2)' : 'var(--bg3)',
              transition: 'all .2s', position: 'relative'
            }}
          >
            {match.teamB.name ? (
              <>
                <LiveTeamLogo teamName={match.teamB.name} size={56} />
                <span style={{ fontFamily: 'var(--font-head)', fontSize: 22, fontWeight: 700, letterSpacing: 2, color: match.teamB.accent, textAlign: 'center' }}>
                  {match.teamB.name}
                </span>
                <span style={{ fontSize: 9, color: 'var(--text3)', letterSpacing: 1 }}>CLIQUE PARA TROCAR</span>
              </>
            ) : (
              <>
                <div style={{
                  width: 56, height: 56, borderRadius: '50%', background: 'var(--bg)', border: '2px dashed var(--border2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: 'var(--text3)'
                }}>⚽</div>
                <span style={{ fontFamily: 'var(--font-head)', fontSize: 16, fontWeight: 600, color: 'var(--text3)', letterSpacing: 1 }}>
                  SELECIONAR TIME B
                </span>
              </>
            )}
          </div>
        </div>

        {/* Start button */}
        {teamsSelected && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 4 }}>
            <button onClick={startLive} className="btn-green" style={{ padding: '12px 32px', fontSize: 16, letterSpacing: 2 }}>
              ▶ INICIAR TRANSMISSÃO
            </button>
            {hasLive && <button onClick={resetLive} className="btn-red" style={{ padding: '12px 20px', fontSize: 13 }}>🔄 Reiniciar</button>}
          </div>
        )}
      </div>

      {/* Lineup error */}
      {lineupError && (
        <div style={{
          background: 'rgba(255,61,61,0.1)', border: '1px solid rgba(255,61,61,0.3)',
          borderRadius: 'var(--radius)', padding: '8px 14px', marginBottom: 14,
          fontSize: 12, color: 'var(--red)', textAlign: 'center'
        }}>
          {lineupError}
        </div>
      )}

      {/* === MATCH INFO (collapsible) === */}
      <MatchInfoSection match={match} updateField={updateField} />

      {/* === SORT ORDER === */}
      <div style={{
        background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
        padding: '10px 16px', marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <span style={{ fontSize: 11, color: 'var(--text2)' }}>Ordenação da escalação:</span>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={() => updateField('sortOrder', 'number')}
            className={match.sortOrder !== 'manual' ? 'btn-green' : 'btn-ghost'}
            style={{ fontSize: 11, padding: '4px 12px' }}>Por Número</button>
          <button onClick={() => updateField('sortOrder', 'manual')}
            className={match.sortOrder === 'manual' ? 'btn-green' : 'btn-ghost'}
            style={{ fontSize: 11, padding: '4px 12px' }}>Ordem Manual</button>
        </div>
      </div>

      {/* === TEAM CARDS (live-style) === */}
      <div style={{ display: 'flex', gap: 14 }}>
        {(['teamA', 'teamB'] as const).map(tk => {
          const team = match[tk];
          const hasTeam = !!team.name;
          return (
            <div key={tk} style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
                overflow: 'hidden'
              }}>
                {/* Header - like live screen */}
                <div
                  onClick={() => setPickerTeam(tk)}
                  style={{
                    padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                    background: hasTeam ? team.color : 'var(--bg3)', cursor: 'pointer', transition: 'opacity .2s'
                  }}
                >
                  {hasTeam && <LiveTeamLogo teamName={team.name} size={28} />}
                  <span style={{
                    fontFamily: 'var(--font-head)', fontSize: hasTeam ? 22 : 16, fontWeight: 700,
                    letterSpacing: 3, color: hasTeam ? team.accent : 'var(--text3)'
                  }}>
                    {hasTeam ? team.name : `TIME ${tk === 'teamA' ? 'A' : 'B'}`}
                  </span>
                </div>

                <div style={{ padding: 16 }}>
                  {/* Team details */}
                  <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                    <div style={{ flex: 1 }}>
                      <Label>Técnico</Label>
                      <Input value={team.coach} onChange={v => updateTeam(tk, 'coach', v)} placeholder="Nome do técnico" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <Label>Formação</Label>
                      <select value={team.formation} onChange={e => updateTeam(tk, 'formation', e.target.value)}
                        style={{
                          background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 6,
                          padding: '8px 10px', color: 'var(--text)', fontSize: 12,
                          fontFamily: 'var(--font-body)', outline: 'none', cursor: 'pointer', width: '100%'
                        }}>
                        {FORMATION_KEYS.map(k => (
                          <option key={k} value={k}>{FORMATIONS[k].label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Colors row */}
                  <div style={{ display: 'flex', gap: 10, marginBottom: 12, alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontSize: 9, color: 'var(--text3)', fontWeight: 600, letterSpacing: 1 }}>COR</span>
                        <input type="color" value={team.color} onChange={e => updateTeam(tk, 'color', e.target.value)}
                          style={{ width: 28, height: 28, border: 'none', borderRadius: 4, cursor: 'pointer', background: 'transparent' }} />
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontSize: 9, color: 'var(--text3)', fontWeight: 600, letterSpacing: 1 }}>DESTAQUE</span>
                        <input type="color" value={team.accent} onChange={e => updateTeam(tk, 'accent', e.target.value)}
                          style={{ width: 28, height: 28, border: 'none', borderRadius: 4, cursor: 'pointer', background: 'transparent' }} />
                      </label>
                    </div>

                    {hasTeam && (
                      <button
                        onClick={() => handleSaveLineup(tk)}
                        className="btn-ghost"
                        style={{
                          fontSize: 10,
                          padding: '5px 10px',
                          opacity: savingLineup === tk ? 0.7 : 1,
                          cursor: savingLineup === tk ? 'wait' : 'pointer'
                        }}
                        disabled={savingLineup === tk}
                      >
                        {savingLineup === tk ? '💾 Salvando...' : '💾 Salvar elenco'}
                      </button>
                    )}
                  </div>

                  {/* Titulares - live style with number badges */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Label>Titulares (11)</Label>
                    <span style={{ fontSize: 9, color: 'var(--text3)' }}>⠿ arraste para reordenar</span>
                  </div>
                  {team.starters.map((p, i) => (
                    <div
                      key={p.id}
                      draggable
                      onDragStart={() => handleDragStart(tk, 'starters', i)}
                      onDragEnter={() => handleDragEnter(tk, 'starters', i)}
                      onDragEnd={handleDragEnd}
                      onDragOver={e => e.preventDefault()}
                      onDragLeave={handleDragLeave}
                      style={{
                        display: 'flex', gap: 6, marginBottom: 2, alignItems: 'center', cursor: 'move',
                        padding: '3px 4px', borderRadius: 4, transition: 'all .15s',
                        border: isDropTarget(tk, 'starters', i) ? '2px solid var(--green)' : '2px solid transparent',
                        background: isDropTarget(tk, 'starters', i) ? 'rgba(0,255,100,0.06)' : 'transparent'
                      }}
                    >
                      <span style={{ color: 'var(--text3)', fontSize: 10, cursor: 'move', userSelect: 'none', width: 12, flexShrink: 0 }}>⠿</span>
                      <Input
                        value={p.number}
                        onChange={v => updatePlayer(tk, 'starters', i, 'number', v)}
                        style={{
                          width: 42, textAlign: 'center', flexShrink: 0, padding: '6px 4px',
                          fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 14,
                          background: hasTeam ? team.color : 'var(--bg3)',
                          color: hasTeam ? team.accent : 'var(--text)',
                          borderRadius: 6, border: 'none'
                        }}
                      />
                      <Input
                        value={p.name}
                        onChange={v => updatePlayer(tk, 'starters', i, 'name', v)}
                        onBlur={v => updatePlayer(tk, 'starters', i, 'name', v.toUpperCase())}
                        placeholder={`Titular ${i + 1}`}
                        style={{ flex: 1, padding: '6px 10px', fontSize: 12, fontWeight: 600 }}
                      />
                    </div>
                  ))}

                  {/* Reservas */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '10px 0 4px' }}>
                    <Label>Reservas ({team.reserves.length})</Label>
                    <button onClick={() => addReserve(tk)} style={{
                      background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text2)',
                      fontSize: 10, padding: '2px 8px', borderRadius: 4, cursor: 'pointer', fontFamily: 'var(--font-body)'
                    }}>+ Reserva</button>
                  </div>
                  <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                    {team.reserves.map((p, i) => (
                      <div
                        key={p.id}
                        draggable
                        onDragStart={() => handleDragStart(tk, 'reserves', i)}
                        onDragEnter={() => handleDragEnter(tk, 'reserves', i)}
                        onDragEnd={handleDragEnd}
                        onDragOver={e => e.preventDefault()}
                        onDragLeave={handleDragLeave}
                        style={{
                          display: 'flex', gap: 6, marginBottom: 2, alignItems: 'center', cursor: 'move',
                          padding: '3px 4px', borderRadius: 4,
                          border: isDropTarget(tk, 'reserves', i) ? '2px solid var(--green)' : '2px solid transparent',
                          background: isDropTarget(tk, 'reserves', i) ? 'rgba(0,255,100,0.06)' : 'transparent'
                        }}
                      >
                        <span style={{ color: 'var(--text3)', fontSize: 10, cursor: 'move', userSelect: 'none', width: 12, flexShrink: 0 }}>⠿</span>
                        <Input
                          value={p.number}
                          onChange={v => updatePlayer(tk, 'reserves', i, 'number', v)}
                          style={{
                            width: 42, textAlign: 'center', flexShrink: 0, padding: '6px 4px',
                            fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 13,
                            background: 'var(--bg3)', color: 'var(--text2)', borderRadius: 6, border: 'none'
                          }}
                        />
                        <Input
                          value={p.name}
                          onChange={v => updatePlayer(tk, 'reserves', i, 'name', v)}
                          onBlur={v => updatePlayer(tk, 'reserves', i, 'name', v.toUpperCase())}
                          placeholder={`Reserva ${i + 1}`}
                          style={{ flex: 1, padding: '6px 10px', fontSize: 11 }}
                        />
                        <button onClick={() => removeReserve(tk, i)} style={{
                          background: 'rgba(255,61,61,0.1)', border: 'none', color: 'var(--red)',
                          fontSize: 13, width: 24, height: 28, borderRadius: 4, cursor: 'pointer', flexShrink: 0
                        }}>×</button>
                      </div>
                    ))}
                  </div>

                  {/* Não Relacionados */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '10px 0 4px' }}>
                    <Label>Não Relacionados ({(team.unlisted || []).length})</Label>
                    <button onClick={() => addUnlisted(tk)} style={{
                      background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text2)',
                      fontSize: 10, padding: '2px 8px', borderRadius: 4, cursor: 'pointer', fontFamily: 'var(--font-body)'
                    }}>+ Não Relacionado</button>
                  </div>
                  <div style={{ maxHeight: 180, overflowY: 'auto' }}>
                    {(team.unlisted || []).map((p, i) => (
                      <div
                        key={p.id}
                        draggable
                        onDragStart={() => handleDragStart(tk, 'unlisted', i)}
                        onDragEnter={() => handleDragEnter(tk, 'unlisted', i)}
                        onDragEnd={handleDragEnd}
                        onDragOver={e => e.preventDefault()}
                        onDragLeave={handleDragLeave}
                        style={{
                          display: 'flex', gap: 6, marginBottom: 2, alignItems: 'center', cursor: 'move',
                          padding: '3px 4px', borderRadius: 4,
                          border: isDropTarget(tk, 'unlisted', i) ? '2px solid var(--green)' : '2px solid transparent',
                          background: isDropTarget(tk, 'unlisted', i) ? 'rgba(0,255,100,0.06)' : 'transparent'
                        }}
                      >
                        <span style={{ color: 'var(--text3)', fontSize: 10, cursor: 'move', userSelect: 'none', width: 12, flexShrink: 0 }}>⠿</span>
                        <Input
                          value={p.number}
                          onChange={v => updatePlayer(tk, 'unlisted', i, 'number', v)}
                          style={{
                            width: 42, textAlign: 'center', flexShrink: 0, padding: '6px 4px',
                            fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 13,
                            background: 'var(--bg3)', color: 'var(--text3)', borderRadius: 6, border: 'none',
                            opacity: 0.6
                          }}
                        />
                        <Input
                          value={p.name}
                          onChange={v => updatePlayer(tk, 'unlisted', i, 'name', v)}
                          onBlur={v => updatePlayer(tk, 'unlisted', i, 'name', v.toUpperCase())}
                          placeholder={`Não relacionado ${i + 1}`}
                          style={{ flex: 1, padding: '6px 10px', fontSize: 11, opacity: 0.7 }}
                        />
                        <button onClick={() => removeUnlisted(tk, i)} style={{
                          background: 'rgba(255,61,61,0.1)', border: 'none', color: 'var(--red)',
                          fontSize: 13, width: 24, height: 28, borderRadius: 4, cursor: 'pointer', flexShrink: 0
                        }}>×</button>
                      </div>
                    ))}
                  </div>

                  {/* Coach footer */}
                  {team.coach && (
                    <div style={{ padding: '8px 0 0', borderTop: '1px solid var(--border)', marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 9, letterSpacing: 1.5, color: 'var(--text3)', fontWeight: 700 }}>TÉCNICO:</span>
                      <span style={{ color: hasTeam ? team.accent : 'var(--text)', fontSize: 12, fontWeight: 600 }}>{team.coach}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Utility buttons */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginTop: 14 }}>
        <input type="file" ref={fileRef} accept=".json" style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) importMatch(e.target.files[0]); }} />
        <button onClick={() => fileRef.current?.click()} className="btn-ghost" style={{ fontSize: 11 }}>📂 Importar</button>
        <button onClick={exportMatch} className="btn-ghost" style={{ fontSize: 11 }}>💾 Exportar</button>
        <button onClick={newMatch} className="btn-ghost" style={{ fontSize: 11 }}>🆕 Nova Partida</button>
      </div></>}

      {pickerTeam && (
        <TeamPicker
          onSelect={team => selectTeam(pickerTeam, team)}
          onClose={() => setPickerTeam(null)}
        />
      )}
    </div>
  );
}

function MatchInfoSection({ match, updateField }: { match: any; updateField: (f: string, v: string) => void }) {
  const [open, setOpen] = useState(false);
  const infoFields: [string, string][] = [
    ['stadium', 'Estádio'], ['referee', 'Árbitro'], ['assistant1', 'Assistente 1'],
    ['assistant2', 'Assistente 2'], ['var_ref', 'VAR'], ['reporter', 'Reportagem'],
    ['commentators', 'Comentários']
  ];

  return (
    <div style={{
      background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
      marginBottom: 14, overflow: 'hidden'
    }}>
      <button onClick={() => setOpen(!open)} style={{
        width: '100%', padding: '10px 16px', background: 'none', border: 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        cursor: 'pointer', color: 'var(--text2)', fontFamily: 'var(--font-body)', fontSize: 12
      }}>
        <span style={{ fontWeight: 600, letterSpacing: 1 }}>📋 INFORMAÇÕES DA PARTIDA</span>
        <span style={{ fontSize: 10, color: 'var(--text3)' }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div style={{ padding: '0 16px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {infoFields.map(([f, l]) => (
            <div key={f}>
              <Label>{l}</Label>
              <Input value={match[f] || ''} onChange={v => updateField(f, v)} placeholder={l.toUpperCase()} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 9, fontWeight: 600, letterSpacing: 1.5, color: 'var(--text3)',
      textTransform: 'uppercase', marginBottom: 3, fontFamily: 'var(--font-body)'
    }}>
      {children}
    </div>
  );
}

function Input({ value, onChange, onBlur, placeholder, style }: {
  value: string; onChange: (v: string) => void; onBlur?: (v: string) => void;
  placeholder?: string; style?: React.CSSProperties
}) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={e => { setFocused(false); onBlur?.(e.target.value); }}
      placeholder={placeholder}
      style={{
        background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 6,
        padding: '8px 12px', color: 'var(--text)', fontSize: 13, width: '100%',
        outline: 'none', fontFamily: 'var(--font-body)', transition: 'border-color .2s',
        cursor: focused ? 'text' : 'pointer',
        ...style
      }}
    />
  );
}
