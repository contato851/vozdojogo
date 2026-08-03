import { useState, useRef, useEffect } from 'react';
import Logo from './Logo';
import { useApp } from '../context/AppContext';
import { FORMATIONS, FORMATION_KEYS } from '../data/formations';
import { loadLive, makeEmpty } from '../data/store';
import { useTeamLogo } from '../hooks/useTeamLogo';
import TeamPicker from './TeamPicker';
import { useCustomTeams, CustomTeam } from '../hooks/useCustomTeams';
import { useSavedLineups } from '../hooks/useSavedLineups';
import { useSquadOverrides } from '../hooks/useSquadOverrides';
import { fetchSquad, checkTeamMapping } from '../data/apiFootball';

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
  const [fetchingSquad, setFetchingSquad] = useState<'teamA' | 'teamB' | null>(null);
  const [squadError, setSquadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const dragItem = useRef<{ tk: 'teamA' | 'teamB'; type: 'starters' | 'reserves' | 'unlisted'; idx: number } | null>(null);
  const dragOver = useRef<{ tk: 'teamA' | 'teamB'; type: 'starters' | 'reserves' | 'unlisted'; idx: number } | null>(null);
  const [dropTarget, setDropTarget] = useState<{ tk: string; type: string; idx: number } | null>(null);
  const { teams: customTeams, saveTeam, refetch: refetchCustomTeams } = useCustomTeams();
  const { findByTeamName: findSavedLineup, saveLineup, refetch: refetchLineups } = useSavedLineups();
  const { addPlayer: addPlayerOverride, deactivatePlayer: deactivatePlayerOverride } = useSquadOverrides();
  const [apiTeamIds, setApiTeamIds] = useState<{ teamA: number | null; teamB: number | null }>({ teamA: null, teamB: null });
  const [suggestedIds, setSuggestedIds] = useState<{ teamA: Set<string>; teamB: Set<string> }>({ teamA: new Set(), teamB: new Set() });
  const [addPlayerForm, setAddPlayerForm] = useState<{ tk: 'teamA' | 'teamB'; number: string; name: string } | null>(null);
  // squadMode: null while the narrator hasn't chosen yet (shows the choice step).
  const [squadMode, setSquadMode] = useState<{ teamA: 'suggested' | 'manual' | null; teamB: 'suggested' | 'manual' | null }>({ teamA: null, teamB: null });
  const [mappingInfo, setMappingInfo] = useState<{ teamA: { hasAutoSquad: boolean } | null; teamB: { hasAutoSquad: boolean } | null }>({ teamA: null, teamB: null });

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

  // Covers teams that were already selected before this screen loaded (page reload,
  // saved match) — otherwise mappingInfo would stay null forever and the choice
  // step would hang on "Verificando...". Teams that already have players filled
  // in are assumed already configured and skip straight to 'suggested' silently.
  useEffect(() => {
    (['teamA', 'teamB'] as const).forEach(tk => {
      const team = match[tk];
      if (!team.name || team.name === 'TIME A' || team.name === 'TIME B') return;
      if (mappingInfo[tk] !== null) return;

      checkTeamMapping(team.name).then(info => {
        setMappingInfo(prev => (prev[tk] !== null ? prev : { ...prev, [tk]: info }));
        setSquadMode(prev => {
          if (prev[tk] !== null) return prev;
          const alreadyHasPlayers = [...team.starters, ...team.reserves].some(p => p.name?.trim());
          if (!info.hasAutoSquad || alreadyHasPlayers) {
            return { ...prev, [tk]: info.hasAutoSquad ? 'suggested' : 'manual' };
          }
          return prev;
        });
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match.teamA.name, match.teamB.name]);

  const selectTeam = (tk: 'teamA' | 'teamB', team: { name: string; color: string; accent: string; customPlayers?: { number: string; name: string }[] }) => {
    setPickerTeam(null);
    setLineupError(null);
    setApiTeamIds(ids => ({ ...ids, [tk]: null }));
    setSuggestedIds(ids => ({ ...ids, [tk]: new Set() }));

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
      // Custom teams already come with their own roster — no automatic-vs-manual choice to make.
      setMappingInfo(info => ({ ...info, [tk]: { hasAutoSquad: false } }));
      setSquadMode(m => ({ ...m, [tk]: 'suggested' }));
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

    setSquadMode(m => ({ ...m, [tk]: null }));
    setMappingInfo(info => ({ ...info, [tk]: null }));
    checkTeamMapping(team.name).then(info => {
      setMappingInfo(prev => ({ ...prev, [tk]: info }));
      if (!info.hasAutoSquad) {
        setSquadMode(prev => ({ ...prev, [tk]: 'manual' }));
      }
    });
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

  const handleFetchSquad = async (tk: 'teamA' | 'teamB') => {
    const team = match[tk];

    if (!team.name || team.name === 'TIME A' || team.name === 'TIME B') {
      setSquadError('Selecione um time antes de buscar o elenco.');
      return;
    }

    try {
      setFetchingSquad(tk);
      setSquadError(null);

      const result = await fetchSquad(team.name);
      const allPlayers = [...result.starters, ...result.reserves];
      const { starters, reserves } = buildLineupFromPlayers(tk, allPlayers);

      setMatch(m => ({
        ...m,
        [tk]: {
          ...m[tk],
          starters,
          reserves,
          coach: result.coach || m[tk].coach,
          unlisted: [],
        }
      }));
      setApiTeamIds(ids => ({ ...ids, [tk]: result.apiTeamId }));
      setSuggestedIds(ids => ({ ...ids, [tk]: new Set() }));
    } catch (error: any) {
      setSquadError(error?.message || `Não foi possível buscar o elenco de ${team.name}.`);
    } finally {
      setFetchingSquad(null);
    }
  };

  const handleAddPlayer = async (tk: 'teamA' | 'teamB') => {
    if (!addPlayerForm || addPlayerForm.tk !== tk) return;
    const name = addPlayerForm.name.trim().toUpperCase();
    const number = addPlayerForm.number.trim();
    if (!name) return;

    const localId = `override-pending-${Date.now()}`;

    setMatch(m => {
      const team = { ...m[tk] };
      team.reserves = [...team.reserves, { id: localId, number, name }];
      return { ...m, [tk]: team };
    });
    setSuggestedIds(ids => ({ ...ids, [tk]: new Set([...ids[tk], localId]) }));
    setAddPlayerForm(null);

    const apiTeamId = apiTeamIds[tk];
    if (apiTeamId == null) {
      setSquadError('Jogador adicionado só nesta tela — busque o elenco real primeiro pra isso virar uma sugestão salva.');
      return;
    }

    try {
      await addPlayerOverride(apiTeamId, { number, name });
    } catch (error: any) {
      setSquadError(error?.message || 'Não foi possível salvar a sugestão de jogador adicionado.');
    }
  };

  const handleMarkInactive = async (tk: 'teamA' | 'teamB', type: 'starters' | 'reserves', idx: number) => {
    const team = match[tk];
    const player = team[type][idx];
    if (!player) return;

    setMatch(m => {
      const t = { ...m[tk] };
      if (type === 'starters') {
        const starters = [...t.starters];
        starters[idx] = { ...starters[idx], number: '', name: '' };
        t.starters = starters;
      } else {
        t.reserves = t.reserves.filter((_, i) => i !== idx);
      }
      return { ...m, [tk]: t };
    });
    setSuggestedIds(ids => {
      const next = new Set(ids[tk]);
      next.delete(player.id);
      return { ...ids, [tk]: next };
    });

    const apiTeamId = apiTeamIds[tk];
    const isApiPlayer = player.id.startsWith('af-') || player.id.startsWith('override-');
    if (apiTeamId == null || !isApiPlayer) return;

    try {
      await deactivatePlayerOverride(apiTeamId, player.id);
    } catch (error: any) {
      setSquadError(error?.message || 'Não foi possível salvar a sugestão de jogador inativo.');
    }
  };

  const hasLive = liveState && loadLive()?.matchId === match.id;
  const teamASelected = match.teamA.name && match.teamA.name !== 'TIME A';
  const teamBSelected = match.teamB.name && match.teamB.name !== 'TIME B';
  const teamsSelected = teamASelected && teamBSelected;
  const noTeamSelected = !teamASelected && !teamBSelected;

  const [showTutorial, setShowTutorial] = useState(() => {
    try { return !localStorage.getItem('vdj-tutorial-dismissed'); } catch { return true; }
  });
  const dismissTutorial = () => {
    setShowTutorial(false);
    try { localStorage.setItem('vdj-tutorial-dismissed', '1'); } catch { /* ignore */ }
  };

  return (
    <div style={{ animation: 'fadeUp .3s ease-out' }}>

      {/* === TUTORIAL VIDEO BANNER === */}
      {showTutorial && (
        <div style={{
          background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
          padding: '0', marginBottom: 14, overflow: 'hidden', position: 'relative'
        }}>
          <button
            onClick={dismissTutorial}
            style={{
              position: 'absolute', top: 8, right: 8, zIndex: 2,
              background: 'rgba(0,0,0,0.5)', border: 'none', color: 'var(--text2)',
              width: 28, height: 28, borderRadius: '50%', cursor: 'pointer',
              fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
            title="Fechar"
          >✕</button>
          {/* Replace the placeholder below with your YouTube/Vimeo embed */}
          {/* Example: <iframe src="https://www.youtube.com/embed/VIDEO_ID" style={{ width: '100%', aspectRatio: '16/9', border: 'none' }} allow="autoplay; fullscreen" /> */}
          <div style={{
            width: '100%', aspectRatio: '16/9', maxHeight: 280,
            background: 'linear-gradient(135deg, var(--bg3), var(--bg2))',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%', background: 'var(--green)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 20px rgba(0, 255, 135, 0.3)', cursor: 'pointer'
            }}>
              <span style={{ fontSize: 24, color: 'var(--bg)', marginLeft: 3 }}>▶</span>
            </div>
            <span style={{
              fontFamily: 'var(--font-head)', fontSize: 12, color: 'var(--text2)',
              letterSpacing: 2, textTransform: 'uppercase'
            }}>
              APRENDA A USAR O VOZ DO JOGO
            </span>
          </div>
        </div>
      )}


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

      {/* Squad fetch error */}
      {squadError && (
        <div style={{
          background: 'rgba(255,61,61,0.1)', border: '1px solid rgba(255,61,61,0.3)',
          borderRadius: 'var(--radius)', padding: '8px 14px', marginBottom: 14,
          fontSize: 12, color: 'var(--red)', textAlign: 'center'
        }}>
          {squadError}
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
          const isTeamSelected = hasTeam && team.name !== 'TIME A' && team.name !== 'TIME B';
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
                      <div style={{ display: 'flex', gap: 6 }}>
                        {squadMode[tk] !== 'manual' && (
                          <button
                            onClick={() => handleFetchSquad(tk)}
                            className="btn-ghost"
                            style={{
                              fontSize: 10,
                              padding: '5px 10px',
                              opacity: fetchingSquad === tk ? 0.7 : 1,
                              cursor: fetchingSquad === tk ? 'wait' : 'pointer'
                            }}
                            disabled={fetchingSquad === tk}
                            title="Busca o elenco atual na API-Football e preenche os campos abaixo"
                          >
                            {fetchingSquad === tk ? '🔍 Buscando...' : '🔍 Buscar elenco real'}
                          </button>
                        )}
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
                      </div>
                    )}
                  </div>

                  {/* Escolha: escalação sugerida x manual */}
                  {isTeamSelected && squadMode[tk] === null && (
                    <SquadSourceChoice
                      mappingInfo={mappingInfo[tk]}
                      onChoose={mode => {
                        setSquadMode(m => ({ ...m, [tk]: mode }));
                        if (mode === 'suggested') handleFetchSquad(tk);
                      }}
                    />
                  )}
                  {isTeamSelected && squadMode[tk] === 'manual' && mappingInfo[tk] && !mappingInfo[tk]!.hasAutoSquad && (
                    <div style={{
                      background: 'rgba(255,200,0,0.08)', border: '1px solid rgba(255,200,0,0.3)',
                      borderRadius: 6, padding: '8px 12px', marginBottom: 10, fontSize: 11, color: '#ffc800'
                    }}>
                      ⚠️ Elenco automático indisponível para este time — preencha manualmente abaixo.
                    </div>
                  )}

                  {(!isTeamSelected || squadMode[tk] !== null) && <>
                  {/* Adicionar jogador (sugestão de correção do elenco) */}
                  {hasTeam && (
                    <div style={{ marginBottom: 10 }}>
                      {addPlayerForm?.tk === tk ? (
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <Input
                            value={addPlayerForm.number}
                            onChange={v => setAddPlayerForm(f => f && { ...f, number: v })}
                            placeholder="Nº"
                            style={{ width: 42, textAlign: 'center', flexShrink: 0, padding: '6px 4px', fontSize: 12 }}
                          />
                          <Input
                            value={addPlayerForm.name}
                            onChange={v => setAddPlayerForm(f => f && { ...f, name: v })}
                            placeholder="Nome do jogador"
                            style={{ flex: 1, padding: '6px 10px', fontSize: 12 }}
                          />
                          <button onClick={() => handleAddPlayer(tk)} className="btn-green" style={{ fontSize: 10, padding: '6px 10px', flexShrink: 0 }}>Adicionar</button>
                          <button onClick={() => setAddPlayerForm(null)} className="btn-ghost" style={{ fontSize: 10, padding: '6px 10px', flexShrink: 0 }}>Cancelar</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setAddPlayerForm({ tk, number: '', name: '' })}
                          className="btn-ghost"
                          style={{ fontSize: 10, padding: '5px 10px', width: '100%' }}
                        >
                          + Adicionar jogador
                        </button>
                      )}
                    </div>
                  )}

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
                      {suggestedIds[tk].has(p.id) && <SuggestionTag />}
                      {p.name && (
                        <button
                          onClick={() => handleMarkInactive(tk, 'starters', i)}
                          title="Marcar como inativo"
                          style={{
                            background: 'rgba(255,61,61,0.1)', border: 'none', color: 'var(--red)',
                            fontSize: 13, width: 24, height: 28, borderRadius: 4, cursor: 'pointer', flexShrink: 0
                          }}
                        >🚫</button>
                      )}
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
                        {suggestedIds[tk].has(p.id) && <SuggestionTag />}
                        <button
                          onClick={() => handleMarkInactive(tk, 'reserves', i)}
                          title="Marcar como inativo"
                          style={{
                            background: 'rgba(255,61,61,0.1)', border: 'none', color: 'var(--red)',
                            fontSize: 12, width: 24, height: 28, borderRadius: 4, cursor: 'pointer', flexShrink: 0
                          }}
                        >🚫</button>
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
                  </>}

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

function SquadSourceChoice({
  mappingInfo,
  onChoose,
}: {
  mappingInfo: { hasAutoSquad: boolean } | null;
  onChoose: (mode: 'suggested' | 'manual') => void;
}) {
  if (mappingInfo === null) {
    return (
      <div style={{ padding: '14px 0', textAlign: 'center', fontSize: 11, color: 'var(--text3)' }}>
        Verificando disponibilidade do elenco automático...
      </div>
    );
  }

  if (!mappingInfo.hasAutoSquad) {
    return (
      <div style={{
        background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8,
        padding: 14, marginBottom: 14, textAlign: 'center'
      }}>
        <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 10, lineHeight: 1.5 }}>
          ⚠️ Elenco automático indisponível para este time — a API-Football não tem esse time mapeado ainda.
        </div>
        <button onClick={() => onChoose('manual')} className="btn-green" style={{ padding: '8px 20px', fontSize: 12 }}>
          ✍️ Escalar eu mesmo
        </button>
      </div>
    );
  }

  return (
    <div style={{
      background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8,
      padding: 14, marginBottom: 14
    }}>
      <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 10, textAlign: 'center' }}>
        Como você quer montar a escalação desse time?
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => onChoose('suggested')}
          className="btn-green"
          style={{ flex: 1, padding: '10px 8px', fontSize: 12, display: 'flex', flexDirection: 'column', gap: 2 }}
        >
          <span>✨ Usar escalação sugerida</span>
          <span style={{ fontSize: 9, fontWeight: 400, opacity: 0.8 }}>elenco real via API-Football</span>
        </button>
        <button
          onClick={() => onChoose('manual')}
          className="btn-ghost"
          style={{ flex: 1, padding: '10px 8px', fontSize: 12, display: 'flex', flexDirection: 'column', gap: 2 }}
        >
          <span>✍️ Escalar eu mesmo</span>
          <span style={{ fontSize: 9, fontWeight: 400, opacity: 0.8 }}>lista em branco, do zero</span>
        </button>
      </div>
    </div>
  );
}

function SuggestionTag() {
  return (
    <span
      title="Sugestão ainda não confirmada — só você vê essa mudança por enquanto"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 3, flexShrink: 0,
        background: 'rgba(255, 200, 0, 0.12)', border: '1px solid rgba(255, 200, 0, 0.35)',
        color: '#ffc800', fontSize: 9, fontWeight: 600, letterSpacing: 0.5,
        padding: '2px 6px', borderRadius: 10, textTransform: 'uppercase'
      }}
    >
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#ffc800' }} />
      sugestão
    </span>
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
