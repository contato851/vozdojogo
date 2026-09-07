import { useState, useRef } from 'react';
import {
  X, Play, Home, Plane, FolderOpen, Goal, RefreshCw, Save,
  GripVertical, Plus, ClipboardList, ChevronUp, ChevronDown,
} from 'lucide-react';
import Logo from './Logo';
import { useApp } from '../context/AppContext';
import { FORMATIONS, FORMATION_KEYS } from '../data/formations';
import { loadLive, makeEmpty } from '../data/store';
import { useTeamLogo } from '../hooks/useTeamLogo';
import { useIsMobile } from '../hooks/useIsMobile';
import TeamPicker from './TeamPicker';
import { useCustomTeams, CustomTeam } from '../hooks/useCustomTeams';
import { useSavedLineups } from '../hooks/useSavedLineups';

function LiveTeamLogo({ teamName, size = 38, logo }: { teamName: string; size?: number; logo?: string | null }) {
  const { logoUrl } = useTeamLogo(teamName, logo);
  const [err, setErr] = useState(false);
  if (!logoUrl || err) return null;
  return (
    <img src={logoUrl} alt={teamName} onError={() => setErr(true)}
      style={{ width: size, height: size, objectFit: 'contain', flexShrink: 0 }} loading="lazy" />
  );
}

export default function SetupScreen() {
  const { match, setMatch, liveState, startLive, resetLive, newMatch, exportMatch, importMatch } = useApp();
  const isMobile = useIsMobile();
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
      .replace(/[\u0300-\u036f]/g, "")
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

  // Touch-friendly alternative to drag-and-drop -- native HTML5 drag events
  // don't fire on mobile browsers, so reordering there needs plain buttons.
  const moveInList = (tk: 'teamA' | 'teamB', type: 'starters' | 'reserves' | 'unlisted', idx: number, dir: -1 | 1) => {
    setMatch(m => {
      const team = { ...m[tk] };
      const list = [...team[type]];
      const target = idx + dir;
      if (target < 0 || target >= list.length) return m;
      [list[idx], list[target]] = [list[target], list[idx]];
      team[type] = list;
      return { ...m, [tk]: team };
    });
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

  const selectTeam = (tk: 'teamA' | 'teamB', team: { name: string; color: string; accent: string; logo?: string | null; customPlayers?: { number: string; name: string }[] }) => {
    setPickerTeam(null);
    setLineupError(null);

    if (team.customPlayers && team.customPlayers.length > 0) {
      const { starters, reserves } = buildLineupFromPlayers(tk, team.customPlayers);
      setMatch(m => ({
        ...m,
        aiNotesGenerated: false,
        [tk]: {
          ...m[tk],
          name: team.name,
          logo: team.logo ?? null,
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
      aiNotesGenerated: false,
      [tk]: {
        ...m[tk],
        name: team.name,
        logo: team.logo ?? null,
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
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 28px', fontSize: 14, letterSpacing: 1.5 }}
            >
              <Home size={14} /> TIME DA CASA
            </button>
            <button
              onClick={() => setPickerTeam('teamB')}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '12px 28px', fontSize: 14, letterSpacing: 1.5,
                background: 'var(--bg3)', border: '1px solid var(--border2)',
                color: 'var(--text)', borderRadius: 'var(--radius)', cursor: 'pointer',
                fontFamily: 'var(--font-head)', fontWeight: 600,
                transition: 'all .2s'
              }}
            >
              <Plane size={14} /> VISITANTE
            </button>
          </div>
          {/* Utility buttons */}
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <input type="file" ref={fileRef} accept=".json" style={{ display: 'none' }} onChange={e => { if (e.target.files?.[0]) importMatch(e.target.files[0]); }} />
            <button onClick={() => fileRef.current?.click()} className="btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}><FolderOpen size={12} /> Importar partida</button>
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
            title="Clique para trocar"
            style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
              cursor: 'pointer', padding: 8, minHeight: 130,
              transition: 'opacity .2s', position: 'relative'
            }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '0.8'; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
          >
            {match.teamA.name ? (
              <LiveTeamLogo teamName={match.teamA.name} logo={match.teamA.logo} size={isMobile ? 64 : 110} />
            ) : (
              <>
                <div style={{
                  width: 56, height: 56, borderRadius: '50%', background: 'var(--bg)', border: '2px dashed var(--border2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)'
                }}><Goal size={22} /></div>
                <span style={{ fontFamily: 'var(--font-head)', fontSize: 16, fontWeight: 600, color: 'var(--text3)', letterSpacing: 1 }}>
                  SELECIONAR TIME A
                </span>
              </>
            )}
          </div>

          {/* X */}
          <div style={{
            fontFamily: 'var(--font-head)', fontSize: 36, fontWeight: 700, color: 'var(--text3)',
            flexShrink: 0
          }}>X</div>

          {/* Team B */}
          <div
            onClick={() => setPickerTeam('teamB')}
            title="Clique para trocar"
            style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
              cursor: 'pointer', padding: 8, minHeight: 130,
              transition: 'opacity .2s', position: 'relative'
            }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '0.8'; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
          >
            {match.teamB.name ? (
              <LiveTeamLogo teamName={match.teamB.name} logo={match.teamB.logo} size={isMobile ? 64 : 110} />
            ) : (
              <>
                <div style={{
                  width: 56, height: 56, borderRadius: '50%', background: 'var(--bg)', border: '2px dashed var(--border2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)'
                }}><Goal size={22} /></div>
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
            <button onClick={startLive} className="btn-green" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 32px', fontSize: 16, letterSpacing: 2 }}>
              <Play size={15} fill="currentColor" /> INICIAR TRANSMISSÃO
            </button>
            {hasLive && <button onClick={resetLive} className="btn-red" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '12px 20px', fontSize: 13 }}><RefreshCw size={13} /> Reiniciar</button>}
          </div>
        )}
      </div>

      {/* Lineup error */}
      {lineupError && (
        <div style={{
          background: 'rgba(214,40,34,0.08)', border: '1px solid rgba(214,40,34,0.25)',
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
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 14 }}>
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
                  style={{ cursor: 'pointer', transition: 'opacity .2s' }}
                >
                  {hasTeam && (
                    <div style={{ display: 'flex', height: 5 }}>
                      <div style={{ flex: 1, background: team.color }} />
                      <div style={{ flex: 1, background: team.accent }} />
                    </div>
                  )}
                  <div style={{
                    padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                    background: hasTeam ? '#fff' : 'var(--bg3)'
                  }}>
                    {hasTeam && <LiveTeamLogo teamName={team.name} logo={team.logo} size={28} />}
                    <span style={{
                      fontFamily: 'var(--font-head)', fontSize: hasTeam ? 22 : 16, fontWeight: 700,
                      letterSpacing: 3, color: hasTeam ? '#030016' : 'var(--text3)'
                    }}>
                      {hasTeam ? team.name : `TIME ${tk === 'teamA' ? 'A' : 'B'}`}
                    </span>
                  </div>
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
                          background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
                          padding: '8px 10px', color: 'var(--text)', fontSize: 12,
                          fontFamily: 'var(--font-body)', outline: 'none', cursor: 'pointer', width: '100%'
                        }}>
                        {FORMATION_KEYS.map(k => (
                          <option key={k} value={k}>{FORMATIONS[k].label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {hasTeam && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                      <button
                        onClick={() => handleSaveLineup(tk)}
                        className="btn-ghost"
                        style={{
                          display: 'flex', alignItems: 'center', gap: 5,
                          fontSize: 10,
                          padding: '5px 10px',
                          opacity: savingLineup === tk ? 0.7 : 1,
                          cursor: savingLineup === tk ? 'wait' : 'pointer'
                        }}
                        disabled={savingLineup === tk}
                      >
                        <Save size={11} /> {savingLineup === tk ? 'Salvando...' : 'Salvar elenco'}
                      </button>
                    </div>
                  )}

                  {/* Titulares - live style with number badges */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Label>Titulares (11)</Label>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 9, color: 'var(--text3)' }}>
                      <GripVertical size={10} /> {isMobile ? 'toque nas setas para reordenar' : 'arraste para reordenar'}
                    </span>
                  </div>
                  {team.starters.map((p, i) => (
                    <div
                      key={p.id}
                      draggable={!isMobile}
                      onDragStart={() => handleDragStart(tk, 'starters', i)}
                      onDragEnter={() => handleDragEnter(tk, 'starters', i)}
                      onDragEnd={handleDragEnd}
                      onDragOver={e => e.preventDefault()}
                      onDragLeave={handleDragLeave}
                      style={{
                        display: 'flex', gap: 6, marginBottom: 2, alignItems: 'center', cursor: isMobile ? 'default' : 'move',
                        padding: '3px 4px', borderRadius: 'var(--radius)', transition: 'all .15s',
                        border: isDropTarget(tk, 'starters', i) ? '2px solid var(--green)' : '2px solid transparent',
                        background: isDropTarget(tk, 'starters', i) ? 'rgba(0,122,67,0.08)' : 'transparent'
                      }}
                    >
                      {isMobile ? (
                        <ReorderArrows onUp={() => moveInList(tk, 'starters', i, -1)} onDown={() => moveInList(tk, 'starters', i, 1)}
                          disableUp={i === 0} disableDown={i === team.starters.length - 1} />
                      ) : (
                        <span style={{ display: 'flex', color: 'var(--text3)', cursor: 'move', userSelect: 'none', width: 12, flexShrink: 0 }}><GripVertical size={12} /></span>
                      )}
                      <Input
                        value={p.number}
                        onChange={v => updatePlayer(tk, 'starters', i, 'number', v)}
                        style={{
                          width: 42, textAlign: 'center', flexShrink: 0, padding: '6px 4px',
                          fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 14,
                          background: 'var(--bg3)', color: 'var(--text)',
                          borderRadius: 'var(--radius)', border: 'none'
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
                      fontSize: 10, padding: '2px 8px', borderRadius: 'var(--radius)', cursor: 'pointer', fontFamily: 'var(--font-body)'
                    }}>+ Reserva</button>
                  </div>
                  <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                    {team.reserves.map((p, i) => (
                      <div
                        key={p.id}
                        draggable={!isMobile}
                        onDragStart={() => handleDragStart(tk, 'reserves', i)}
                        onDragEnter={() => handleDragEnter(tk, 'reserves', i)}
                        onDragEnd={handleDragEnd}
                        onDragOver={e => e.preventDefault()}
                        onDragLeave={handleDragLeave}
                        style={{
                          display: 'flex', gap: 6, marginBottom: 2, alignItems: 'center', cursor: isMobile ? 'default' : 'move',
                          padding: '3px 4px', borderRadius: 'var(--radius)',
                          border: isDropTarget(tk, 'reserves', i) ? '2px solid var(--green)' : '2px solid transparent',
                          background: isDropTarget(tk, 'reserves', i) ? 'rgba(0,122,67,0.08)' : 'transparent'
                        }}
                      >
                        {isMobile ? (
                          <ReorderArrows onUp={() => moveInList(tk, 'reserves', i, -1)} onDown={() => moveInList(tk, 'reserves', i, 1)}
                            disableUp={i === 0} disableDown={i === team.reserves.length - 1} />
                        ) : (
                          <span style={{ display: 'flex', color: 'var(--text3)', cursor: 'move', userSelect: 'none', width: 12, flexShrink: 0 }}><GripVertical size={12} /></span>
                        )}
                        <Input
                          value={p.number}
                          onChange={v => updatePlayer(tk, 'reserves', i, 'number', v)}
                          style={{
                            width: 42, textAlign: 'center', flexShrink: 0, padding: '6px 4px',
                            fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 13,
                            background: 'var(--bg3)', color: 'var(--text)', borderRadius: 'var(--radius)', border: 'none'
                          }}
                        />
                        <Input
                          value={p.name}
                          onChange={v => updatePlayer(tk, 'reserves', i, 'name', v)}
                          onBlur={v => updatePlayer(tk, 'reserves', i, 'name', v.toUpperCase())}
                          placeholder={`Reserva ${i + 1}`}
                          style={{ flex: 1, padding: '6px 10px', fontSize: 11 }}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Não Relacionados */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '10px 0 4px' }}>
                    <Label>Não Relacionados ({(team.unlisted || []).length})</Label>
                    <button onClick={() => addUnlisted(tk)} style={{
                      background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text2)',
                      fontSize: 10, padding: '2px 8px', borderRadius: 'var(--radius)', cursor: 'pointer', fontFamily: 'var(--font-body)'
                    }}>+ Não Relacionado</button>
                  </div>
                  <div style={{ maxHeight: 180, overflowY: 'auto' }}>
                    {(team.unlisted || []).map((p, i) => (
                      <div
                        key={p.id}
                        draggable={!isMobile}
                        onDragStart={() => handleDragStart(tk, 'unlisted', i)}
                        onDragEnter={() => handleDragEnter(tk, 'unlisted', i)}
                        onDragEnd={handleDragEnd}
                        onDragOver={e => e.preventDefault()}
                        onDragLeave={handleDragLeave}
                        style={{
                          display: 'flex', gap: 6, marginBottom: 2, alignItems: 'center', cursor: isMobile ? 'default' : 'move',
                          padding: '3px 4px', borderRadius: 'var(--radius)',
                          border: isDropTarget(tk, 'unlisted', i) ? '2px solid var(--green)' : '2px solid transparent',
                          background: isDropTarget(tk, 'unlisted', i) ? 'rgba(0,122,67,0.08)' : 'transparent'
                        }}
                      >
                        {isMobile ? (
                          <ReorderArrows onUp={() => moveInList(tk, 'unlisted', i, -1)} onDown={() => moveInList(tk, 'unlisted', i, 1)}
                            disableUp={i === 0} disableDown={i === (team.unlisted || []).length - 1} />
                        ) : (
                          <span style={{ display: 'flex', color: 'var(--text3)', cursor: 'move', userSelect: 'none', width: 12, flexShrink: 0 }}><GripVertical size={12} /></span>
                        )}
                        <Input
                          value={p.number}
                          onChange={v => updatePlayer(tk, 'unlisted', i, 'number', v)}
                          style={{
                            width: 42, textAlign: 'center', flexShrink: 0, padding: '6px 4px',
                            fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 13,
                            background: 'var(--bg3)', color: 'var(--text3)', borderRadius: 'var(--radius)', border: 'none',
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
                          background: 'rgba(214,40,34,0.08)', border: 'none', color: 'var(--red)',
                          width: 24, height: 28, borderRadius: 'var(--radius)', cursor: 'pointer', flexShrink: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}><X size={13} /></button>
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
        <button onClick={() => fileRef.current?.click()} className="btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}><FolderOpen size={12} /> Importar</button>
        <button onClick={exportMatch} className="btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}><Save size={12} /> Exportar</button>
        <button onClick={newMatch} className="btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}><Plus size={12} /> Nova Partida</button>
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

function ReorderArrows({ onUp, onDown, disableUp, disableDown }: {
  onUp: () => void; onDown: () => void; disableUp?: boolean; disableDown?: boolean;
}) {
  const btnStyle = (disabled?: boolean): React.CSSProperties => ({
    width: 26, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'var(--bg3)', border: 'none', borderRadius: 4, cursor: disabled ? 'default' : 'pointer',
    color: disabled ? 'var(--text3)' : 'var(--text2)', opacity: disabled ? 0.4 : 1
  });
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
      <button onClick={onUp} disabled={disableUp} style={btnStyle(disableUp)}><ChevronUp size={13} /></button>
      <button onClick={onDown} disabled={disableDown} style={btnStyle(disableDown)}><ChevronDown size={13} /></button>
    </div>
  );
}

function InfoGroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      gridColumn: '1 / -1', fontSize: 10, fontWeight: 700, letterSpacing: 1.5,
      color: 'var(--green)', textTransform: 'uppercase', marginTop: 10, marginBottom: 2
    }}>
      {children}
    </div>
  );
}

function MatchInfoSection({ match, updateField }: { match: any; updateField: (f: string, v: string) => void }) {
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();
  const arbitragemFields: [string, string][] = [
    ['referee', 'Árbitro'], ['assistant1', 'Assistente 1'],
    ['assistant2', 'Assistente 2'], ['var_ref', 'VAR'], ['fourthReferee', 'Quarto Árbitro'],
  ];
  const transmissaoFields: [string, string][] = [
    ['reporter', 'Reportagem'], ['commentator1', 'Comentarista 1'], ['commentator2', 'Comentarista 2'],
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
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, letterSpacing: 1 }}><ClipboardList size={13} /> INFORMAÇÕES DA PARTIDA</span>
        <span style={{ display: 'flex', color: 'var(--text3)' }}>{open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}</span>
      </button>
      {open && (
        <div style={{ padding: '0 16px 16px', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 8 }}>
          <InfoGroupLabel>Informações da Partida</InfoGroupLabel>
          <div>
            <Label>Competição</Label>
            <Input value={match.competition || ''} onChange={v => updateField('competition', v)} placeholder="COMPETIÇÃO" />
          </div>
          <div>
            <Label>Rodada</Label>
            <Input value={match.round || ''} onChange={v => updateField('round', v)} placeholder="RODADA" />
          </div>
          <div>
            <Label>Data</Label>
            <input type="date" value={match.matchDate || ''} onChange={e => updateField('matchDate', e.target.value)}
              style={{
                background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
                padding: '8px 12px', color: 'var(--text)', fontSize: 13, width: '100%',
                outline: 'none', fontFamily: 'var(--font-body)', colorScheme: 'dark'
              }} />
          </div>
          <div>
            <Label>Horário</Label>
            <input type="time" value={match.matchTime || ''} onChange={e => updateField('matchTime', e.target.value)}
              style={{
                background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
                padding: '8px 12px', color: 'var(--text)', fontSize: 13, width: '100%',
                outline: 'none', fontFamily: 'var(--font-body)', colorScheme: 'dark'
              }} />
          </div>
          <div>
            <Label>Estádio</Label>
            <Input value={match.stadium || ''} onChange={v => updateField('stadium', v)} placeholder="ESTÁDIO" />
          </div>

          <InfoGroupLabel>Arbitragem</InfoGroupLabel>
          {arbitragemFields.map(([f, l]) => (
            <div key={f}>
              <Label>{l}</Label>
              <Input value={match[f] || ''} onChange={v => updateField(f, v)} placeholder={l.toUpperCase()} />
            </div>
          ))}

          <InfoGroupLabel>Transmissão</InfoGroupLabel>
          {transmissaoFields.map(([f, l]) => (
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
        background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
        padding: '8px 12px', color: 'var(--text)', fontSize: 13, width: '100%',
        outline: 'none', fontFamily: 'var(--font-body)', transition: 'border-color .2s',
        cursor: focused ? 'text' : 'pointer',
        ...style
      }}
    />
  );
}
