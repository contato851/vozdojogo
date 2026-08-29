import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Sun, Moon, Play, Pause, RotateCcw, Loader2, Check, Link, RadioTower, X,
  Square, List, Target, ChevronsUpDown, ArrowLeftRight, ArrowUp,
  ArrowDown, ArrowRight, RefreshCw, NotebookPen,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { LiveTeam, Player, LiveState } from '../data/types';
import { FORMATIONS } from '../data/formations';
import { formatClock, getClockElapsed, getClockMinute, sortByNumber } from '../data/store';
import { useTeamLogo } from '../hooks/useTeamLogo';

const LIVE_THEME_KEY = 'vdj-live-theme';
import {
  createBroadcast, updateBroadcastState, stopBroadcast,
  getCurrentShareCode, getCurrentBroadcastId, setCurrentBroadcast
} from '../data/broadcast';

// Small inline logo for live screen
function LiveTeamLogo({ teamName, size = 38, logo }: { teamName: string; size?: number; logo?: string | null }) {
  const { logoUrl } = useTeamLogo(teamName, false, logo);
  const [err, setErr] = useState(false);
  if (!logoUrl || err) return null;
  return (
    <img
      src={logoUrl}
      alt={teamName}
      onError={() => setErr(true)}
      style={{ width: size, height: size, objectFit: 'contain', flexShrink: 0 }}
      loading="lazy"
    />
  );
}

export default function LiveScreen() {
  const { match, liveState, setLiveState, showSubs, setShowSubs, showCur, setShowCur, curTab, setCurTab, liveView, setLiveView } = useApp();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [clockDisplay, setClockDisplay] = useState('00:00');
  const clockRef = useRef<number>();
  const [shareCode, setShareCode] = useState<string | null>(getCurrentShareCode());
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [liveTheme, setLiveTheme] = useState<'light' | 'dark'>(() => {
    try { return (localStorage.getItem(LIVE_THEME_KEY) as 'light' | 'dark') || 'light'; } catch { return 'light'; }
  });
  const dark = liveTheme === 'dark';
  const c = (light: string, darkVal: string) => dark ? darkVal : light;
  const toggleLiveTheme = () => {
    setLiveTheme(prev => {
      const next: 'light' | 'dark' = prev === 'light' ? 'dark' : 'light';
      try { localStorage.setItem(LIVE_THEME_KEY, next); } catch { /* ignore */ }
      return next;
    });
  };

  const ls = liveState;

  // Clock tick
  useEffect(() => {
    if (!ls?.clock) return;
    const tick = () => {
      if (ls?.clock) setClockDisplay(formatClock(getClockElapsed(ls.clock)));
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [ls?.clock?.running, ls?.clock?.startedAt, ls?.clock?.elapsed]);



  useEffect(() => {
    if (shareCode && ls) {
      updateBroadcastState(ls, match);
    }
  }, [ls, shareCode, match]);

  const handleShare = async () => {
    if (shareCode) {
      // Copy link
      const url = `${window.location.origin}/ao-vivo/${shareCode}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      return;
    }
    if (!ls) return;
    setSharing(true);
    try {
      const code = await createBroadcast(match);
      setShareCode(code);
      await updateBroadcastState(ls, match);
      const url = `${window.location.origin}/ao-vivo/${code}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Erro ao compartilhar:', err);
    } finally {
      setSharing(false);
    }
  };

  const handleStopShare = async () => {
    await stopBroadcast();
    setShareCode(null);
  };


  if (!ls) return null;

  const tA = ls.teamA;
  const tB = ls.teamB;

  const toggleClock = () => {
    setLiveState(prev => {
      if (!prev) return prev;
      const c = { ...prev.clock };
      if (c.running) {
        c.elapsed += Date.now() - (c.startedAt || 0);
        c.startedAt = null;
        c.running = false;
      } else {
        c.startedAt = Date.now();
        c.running = true;
      }
      return { ...prev, clock: c };
    });
  };

  const resetClock = () => {
    if (!window.confirm('Zerar o cronômetro?')) return;
    setLiveState(prev => prev ? { ...prev, clock: { running: false, elapsed: 0, startedAt: null } } : prev);
  };

  const addYellow = (tk: 'teamA' | 'teamB', idx: number) => {
    setLiveState(prev => {
      if (!prev) return prev;
      const team = { ...prev[tk], starters: [...prev[tk].starters] };
      const p = { ...team.starters[idx] };
      p.yellowCards = ((p.yellowCards || 0) + 1) % 3;
      team.starters[idx] = p;
      return { ...prev, [tk]: team };
    });
  };

  const toggleRed = (tk: 'teamA' | 'teamB', idx: number) => {
    setLiveState(prev => {
      if (!prev) return prev;
      const team = { ...prev[tk], starters: [...prev[tk].starters] };
      const p = { ...team.starters[idx] };
      p.redCard = !p.redCard;
      team.starters[idx] = p;
      return { ...prev, [tk]: team };
    });
  };

  const addGoal = (tk: 'teamA' | 'teamB', idx: number) => {
    setLiveState(prev => {
      if (!prev) return prev;
      const team = { ...prev[tk], starters: [...prev[tk].starters] };
      const p = { ...team.starters[idx] };
      p.goals = (p.goals || 0) + 1;
      team.starters[idx] = p;
      const min = getClockMinute(prev.clock);
      const goalLog = [...prev.goalLog, { team: tk, playerName: p.name, playerNumber: p.number, minute: min }];
      return { ...prev, [tk]: team, goalLog };
    });
  };

  const removeGoal = (tk: 'teamA' | 'teamB', idx: number) => {
    setLiveState(prev => {
      if (!prev) return prev;
      const team = { ...prev[tk], starters: [...prev[tk].starters] };
      const p = { ...team.starters[idx] };
      if ((p.goals || 0) <= 0) return prev;
      p.goals = (p.goals || 0) - 1;
      team.starters[idx] = p;
      const goalLog = [...prev.goalLog];
      let lastIdx = -1;
      for (let i = goalLog.length - 1; i >= 0; i--) { if (goalLog[i].team === tk && goalLog[i].playerName === p.name) { lastIdx = i; break; } }
      if (lastIdx >= 0) goalLog.splice(lastIdx, 1);
      return { ...prev, [tk]: team, goalLog };
    });
  };

  const doSub = (tk: 'teamA' | 'teamB', si: number, ri: number) => {
    setLiveState(prev => {
      if (!prev) return prev;
      const team = { ...prev[tk], starters: [...prev[tk].starters], reserves: [...prev[tk].reserves], subsOut: [...prev[tk].subsOut] };
      const out = team.starters[si];
      const res = team.reserves[ri];
      let ev = '';
      if ((out.goals || 0) > 0) ev += ` ⚽×${out.goals}`;
      if ((out.yellowCards || 0) > 0) ev += ` 🟨×${out.yellowCards}`;
      if (out.redCard) ev += ' 🟥';
      team.starters[si] = { ...res, subIn: true, yellowCards: 0, redCard: false, goals: 0 };
      if (prev.sortOrder !== 'manual') team.starters = sortByNumber(team.starters);
      team.reserves.splice(ri, 1);
      team.subsOut.push({ ...out, replacedBy: `${res.number} ${res.name}`, eventSummary: ev } as any);
      return { ...prev, [tk]: team };
    });
    setOpenDropdown(null);
  };

  const goalsA = tA.starters.reduce((s, p) => s + (p.goals || 0), 0) + tA.subsOut.reduce((s, p) => s + (p.goals || 0), 0);
  const goalsB = tB.starters.reduce((s, p) => s + (p.goals || 0), 0) + tB.subsOut.reduce((s, p) => s + (p.goals || 0), 0);
  const totalSubs = tA.subsOut.length + tB.subsOut.length;
  const goalLog = ls.goalLog || [];
  const clk = ls.clock;

  const allInfos: [string, string][] = [
    ['ESTÁDIO', match.stadium], ['ÁRBITRO', match.referee], ['ASSISTENTE 1', match.assistant1],
    ['ASSISTENTE 2', match.assistant2], ['VAR', match.var_ref], ['REPORTAGEM', match.reporter],
    ['COMENTÁRIOS', match.commentators]
  ].filter(x => x[1]) as [string, string][];

  return (
    <div data-theme={liveTheme} style={{ animation: 'fadeUp .3s ease-out', background: 'var(--bg)' }}>
      {/* Theme toggle */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
        <button
          onClick={toggleLiveTheme}
          title={dark ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px',
            borderRadius: 0, cursor: 'pointer', fontFamily: 'var(--font-body)',
            fontSize: 11, fontWeight: 600, letterSpacing: 0.5,
            background: 'var(--bg3)', border: '1px solid var(--border2)', color: 'var(--text2)',
            transition: 'all .2s'
          }}
        >
          {dark ? <Moon size={13} /> : <Sun size={13} />}
          {dark ? 'Modo escuro' : 'Modo claro'}
        </button>
      </div>

      {/* Header with scoreboard */}
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 0, padding: '10px 12px', marginBottom: 12 }}>
        {/* Main row: TeamA | Clock | TeamB */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          {/* Team A */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
            <LiveTeamLogo teamName={tA.name} logo={tA.logo} size={80} />
            <div style={{ fontFamily: 'var(--font-head)', fontSize: 48, fontWeight: 700, letterSpacing: 2, lineHeight: 1 }}>
              {goalsA}
            </div>
          </div>

          {/* Clock center */}
          <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '0 8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 16px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 0 }}>
              <span style={{ fontFamily: 'var(--font-head)', fontSize: 36, fontWeight: 600, letterSpacing: 4, minWidth: 90, textAlign: 'center', color: clk.running ? 'var(--green)' : 'var(--text2)' }}>
                {clockDisplay}
              </span>
              <div style={{ display: 'flex', gap: 4, flexDirection: 'column' }}>
                <button onClick={toggleClock} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                  fontSize: 10, padding: '4px 12px', borderRadius: 0, cursor: 'pointer',
                  fontFamily: 'var(--font-body)', fontWeight: 700, letterSpacing: 0.5, whiteSpace: 'nowrap',
                  border: `1px solid ${clk.running ? c('rgba(156,100,0,0.3)', 'rgba(255,215,64,0.3)') : 'var(--green)'}`,
                  background: clk.running ? c('rgba(156,100,0,0.12)', 'rgba(255,215,64,0.15)') : 'var(--green)',
                  color: clk.running ? 'var(--gold)' : '#fff',
                  transition: 'all .2s'
                }}>
                  {clk.running ? <><Pause size={11} /> PAUSAR</> : <><Play size={11} /> INICIAR</>}
                </button>
                <button onClick={resetClock} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                  fontSize: 10, padding: '4px 12px', borderRadius: 0, cursor: 'pointer',
                  fontFamily: 'var(--font-body)', fontWeight: 700, border: '1px solid var(--border)',
                  background: 'var(--bg3)', color: 'var(--text2)', transition: 'all .2s',
                  letterSpacing: 0.5, whiteSpace: 'nowrap'
                }}>
                  <RotateCcw size={11} /> ZERAR
                </button>
              </div>
            </div>
          </div>

          {/* Team B */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 8 }}>
            <div style={{ fontFamily: 'var(--font-head)', fontSize: 48, fontWeight: 700, letterSpacing: 2, lineHeight: 1 }}>
              {goalsB}
            </div>
            <LiveTeamLogo teamName={tB.name} logo={tB.logo} size={80} />
          </div>
        </div>

        {/* Goals log */}
        {goalLog.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 4 }}>
            <div style={{ flex: 1, textAlign: 'center' }}>
              {goalLog.filter(g => g.team === 'teamA').map((g, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: 11, color: 'var(--text2)', lineHeight: 1.6 }}>
                  ⚽ <strong style={{ color: 'var(--text)' }}>{g.playerName}</strong> <span style={{ color: 'var(--green)', fontSize: 10 }}>{g.minute}'</span>
                </div>
              ))}
            </div>
            <div style={{ flexShrink: 0, width: 140 }} />
            <div style={{ flex: 1, textAlign: 'center' }}>
              {goalLog.filter(g => g.team === 'teamB').map((g, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: 11, color: 'var(--text2)', lineHeight: 1.6 }}>
                  ⚽ <strong style={{ color: 'var(--text)' }}>{g.playerName}</strong> <span style={{ color: 'var(--green)', fontSize: 10 }}>{g.minute}'</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {/* Share button */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 10 }}>
          <button
            onClick={handleShare}
            disabled={sharing}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 11, padding: '6px 16px', borderRadius: 0, cursor: 'pointer',
              fontFamily: 'var(--font-body)', fontWeight: 700, letterSpacing: 0.5,
              border: `1px solid ${shareCode ? 'var(--green)' : 'var(--border2)'}`,
              background: shareCode ? 'var(--green-dim)' : 'var(--bg3)',
              color: shareCode ? 'var(--green)' : 'var(--text2)',
              transition: 'all .2s'
            }}
          >
            {sharing ? <><Loader2 size={13} className="animate-spin" /> Gerando...</>
              : copied ? <><Check size={13} /> Link copiado!</>
              : shareCode ? <><Link size={13} /> Copiar Link</>
              : <><RadioTower size={13} /> Compartilhar Ao Vivo</>}
          </button>
          {shareCode && (
            <button
              onClick={handleStopShare}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                fontSize: 11, padding: '6px 12px', borderRadius: 0, cursor: 'pointer',
                fontFamily: 'var(--font-body)', fontWeight: 700,
                border: `1px solid ${c('rgba(214,40,34,0.25)', 'rgba(255,61,61,0.3)')}`, background: c('rgba(214,40,34,0.08)', 'rgba(255,61,61,0.1)'),
                color: 'var(--red)', transition: 'all .2s'
              }}
            >
              <X size={13} /> Encerrar
            </button>
          )}
        </div>
      </div>

      {/* Match info block */}
      {allInfos.length > 0 && (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 0, padding: '10px 16px', marginBottom: 12, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '12px 20px' }}>
          {allInfos.map(([l, v]) => (
            <div key={l} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 8, color: 'var(--text3)', letterSpacing: 1.5, fontWeight: 700, textTransform: 'uppercase' }}>{l}</div>
              <div style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 500 }}>{v}</div>
            </div>
          ))}
        </div>
      )}

      {/* Hint */}
      <div style={{ textAlign: 'center', marginBottom: 10, fontSize: 10, color: 'var(--text3)', lineHeight: 1.6 }}>
        {liveView === 'field' ? (
          'Visualização tática · Eventos e substituições na vista Lista'
        ) : (
          <>
            <Square size={9} fill="var(--yellow-card)" stroke="none" style={{ display: 'inline', verticalAlign: 'middle' }} />{' '}
            <Square size={9} fill="var(--red)" stroke="none" style={{ display: 'inline', verticalAlign: 'middle' }} />{' '}
            ⚽ Ícones para marcar eventos · Nome ou <ChevronsUpDown size={10} style={{ display: 'inline', verticalAlign: 'middle' }} /> para substituir · Clique direito no ⚽ remove gol
          </>
        )}
      </div>

      {/* View toggle */}
      <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginBottom: 10 }}>
        <ViewBtn active={liveView === 'list'} onClick={() => setLiveView('list')}><List size={12} /> Lista</ViewBtn>
        <ViewBtn active={liveView === 'field'} onClick={() => setLiveView('field')}><Target size={12} /> Campo Tático</ViewBtn>
      </div>

      {liveView === 'field' ? (
        <TacticalField ls={ls} setLiveState={setLiveState} match={match} />
      ) : (
        <div style={{ display: 'flex', gap: 14, marginBottom: 10 }}>
          <div style={{ flex: 1 }}>
            <LiveTeamCard team={tA} tk="teamA" openDropdown={openDropdown} setOpenDropdown={setOpenDropdown}
              addYellow={addYellow} toggleRed={toggleRed} addGoal={addGoal} removeGoal={removeGoal} doSub={doSub} sortOrder={ls.sortOrder} dark={dark} />
          </div>
          <div style={{ flex: 1 }}>
            <LiveTeamCard team={tB} tk="teamB" openDropdown={openDropdown} setOpenDropdown={setOpenDropdown}
              addYellow={addYellow} toggleRed={toggleRed} addGoal={addGoal} removeGoal={removeGoal} doSub={doSub} sortOrder={ls.sortOrder} dark={dark} />
          </div>
        </div>
      )}

      {/* Banks */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 12 }}>
        {[tA, tB].map((t, i) => (
          <div key={i} style={{ flex: 1, background: 'var(--bg2)', borderRadius: 0, padding: '10px 12px', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 9, color: 'var(--text3)', letterSpacing: 1.5, fontWeight: 700, marginBottom: 6 }}>
              BANCO — {t.name} ({t.reserves.length})
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
              {t.reserves.length ? t.reserves.map((r, j) => (
                <span key={j} style={{ background: 'var(--bg3)', padding: '2px 6px', borderRadius: 0, fontSize: 10, color: 'var(--text2)', fontWeight: 500 }}>
                  {r.number} {r.name}
                </span>
              )) : <span style={{ fontSize: 10, color: 'var(--text3)', fontStyle: 'italic' }}>Sem reservas</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 12 }}>
        <button onClick={() => { setShowSubs(!showSubs); setShowCur(false); }} style={{
          display: 'flex', alignItems: 'center', gap: 5,
          fontSize: 10, padding: '6px 14px', borderRadius: 0, cursor: 'pointer',
          fontFamily: 'var(--font-body)', fontWeight: 600, transition: 'all .2s',
          border: `1px solid ${totalSubs ? c('rgba(214,40,34,0.2)', 'rgba(255,61,61,0.2)') : 'var(--border)'}`,
          background: totalSubs ? c('rgba(214,40,34,0.06)', 'rgba(255,61,61,0.08)') : 'var(--bg3)',
          color: totalSubs ? 'var(--red)' : 'var(--text2)'
        }}>
          <RefreshCw size={11} /> Substituições ({totalSubs})
        </button>
        <button onClick={() => { setShowCur(!showCur); setShowSubs(false); }} style={{
          display: 'flex', alignItems: 'center', gap: 5,
          fontSize: 10, padding: '6px 14px', borderRadius: 0, cursor: 'pointer',
          fontFamily: 'var(--font-body)', fontWeight: 600, transition: 'all .2s',
          border: `1px solid ${showCur ? 'var(--green)' : 'var(--border)'}`,
          background: showCur ? 'var(--green-dim)' : 'var(--bg3)',
          color: showCur ? 'var(--green)' : 'var(--text2)'
        }}>
          <NotebookPen size={11} /> Curiosidades
        </button>
      </div>

      {/* Subs log */}
      {showSubs && (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 0, padding: 20, marginBottom: 10 }}>
          {totalSubs > 0 ? (
            <>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: 1.5, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 8 }}>Substituições Realizadas</div>
              <div style={{ display: 'flex', gap: 16 }}>
                {[tA, tB].filter(t => t.subsOut.length > 0).map((t, i) => (
                  <div key={i} style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: t.accent, fontWeight: 700, marginBottom: 4 }}>{t.name}</div>
                    {t.subsOut.map((p, j) => (
                      <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 0', fontSize: 11, color: 'var(--text2)' }}>
                        <ArrowDown size={11} color="var(--red)" />
                        <strong style={{ color: 'var(--text)' }}>{p.number}</strong> {p.name}{p.eventSummary}
                        <ArrowRight size={11} color="var(--text3)" />
                        <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: 'var(--green)', fontSize: 10 }}><ArrowUp size={11} /> {p.replacedBy}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <span style={{ color: 'var(--text3)', fontSize: 12 }}>Nenhuma substituição ainda.</span>
            </div>
          )}
        </div>
      )}

      {/* Curiosities panel */}
      {showCur && (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 0, padding: 20 }}>
          <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginBottom: 12 }}>
            {[{ id: 'a', t: tA }, { id: 'b', t: tB }].map(tab => (
              <button key={tab.id} onClick={() => setCurTab(tab.id)} style={{
                fontSize: 14, fontWeight: 700, padding: '7px 24px', borderRadius: 0, cursor: 'pointer',
                fontFamily: 'var(--font-head)', letterSpacing: 2, border: 'none', transition: 'all .15s',
                background: curTab === tab.id ? tab.t.color : 'var(--bg3)',
                color: curTab === tab.id ? tab.t.accent : 'var(--text3)'
              }}>
                {tab.t.name}
              </button>
            ))}
          </div>
          <div style={{ whiteSpace: 'pre-wrap', color: 'var(--text2)', fontSize: 13, lineHeight: 1.8, padding: 8, minHeight: 60 }}>
            {(curTab === 'a' ? match.teamA.curiosities : match.teamB.curiosities) || (
              <span style={{ color: 'var(--text3)', fontStyle: 'italic' }}>Sem curiosidades. Adicione na aba Notas.</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Live Team Card (List View) ── */
function LiveTeamCard({ team, tk, openDropdown, setOpenDropdown, addYellow, toggleRed, addGoal, removeGoal, doSub, sortOrder, dark }: {
  team: LiveTeam; tk: 'teamA' | 'teamB';
  openDropdown: string | null; setOpenDropdown: (v: string | null) => void;
  addYellow: (tk: 'teamA' | 'teamB', i: number) => void;
  toggleRed: (tk: 'teamA' | 'teamB', i: number) => void;
  addGoal: (tk: 'teamA' | 'teamB', i: number) => void;
  removeGoal: (tk: 'teamA' | 'teamB', i: number) => void;
  doSub: (tk: 'teamA' | 'teamB', si: number, ri: number) => void;
  sortOrder: string;
  dark: boolean;
}) {
  const side = tk === 'teamA' ? 'left' : 'right';
  const c = (light: string, darkVal: string) => dark ? darkVal : light;

  return (
    <div>
      <div style={{ padding: '12px 16px', borderRadius: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: team.color }}>
        <LiveTeamLogo teamName={team.name} logo={team.logo} size={28} />
        <span style={{ fontFamily: 'var(--font-head)', fontSize: 26, fontWeight: 700, letterSpacing: 3, color: team.accent }}>{team.name}</span>
      </div>
      <div style={{ background: c('var(--bg3)', 'rgba(0,0,0,0.3)'), borderRadius: 0 }}>
        {team.starters.map((p, idx) => {
          const did = `${side}-${idx}`;
          const isOpen = openDropdown === did;
          const hasR = team.reserves.length > 0;
          const yc = (p.yellowCards || 0);

          return (
            <div key={p.id} style={{
              display: 'flex', alignItems: 'center', padding: '6px 12px',
              borderBottom: '1px solid var(--border)', cursor: 'pointer',
              transition: 'background .15s', userSelect: 'none', position: 'relative',
              background: isOpen ? c('rgba(0,122,67,0.08)', 'rgba(0,200,83,0.1)') : p.subIn ? c('rgba(0,122,67,0.05)', 'rgba(0,200,83,0.06)') : 'transparent'
            }}>
              <span style={{
                width: 32, height: 32, borderRadius: 0, display: 'flex',
                alignItems: 'center', justifyContent: 'center', fontWeight: 700,
                fontSize: 15, fontFamily: 'var(--font-head)', marginRight: 10,
                flexShrink: 0, letterSpacing: 1, background: team.color, color: team.accent
              }}>{p.number}</span>
              <span
                onClick={e => { e.stopPropagation(); if (hasR) setOpenDropdown(isOpen ? null : did); }}
                style={{
                  fontSize: 13, fontWeight: 600, flex: 1, whiteSpace: 'nowrap',
                  overflow: 'hidden', textOverflow: 'ellipsis',
                  cursor: hasR ? 'pointer' : 'default'
                }}
              >{p.name}</span>
              {p.subIn && (
                <span style={{
                  display: 'flex', alignItems: 'center', gap: 2,
                  fontSize: 8, color: 'var(--green)', fontWeight: 700,
                  background: 'var(--green-dim)', padding: '2px 6px', borderRadius: 0,
                  marginLeft: 4, flexShrink: 0, letterSpacing: 0.5
                }}><ArrowUp size={9} /> ENTROU</span>
              )}
              <div style={{ display: 'flex', gap: 3, marginLeft: 'auto', marginRight: 4, flexShrink: 0 }}>
                <EvBtn active={yc > 0} activeClass={yc >= 2 ? 'y2' : 'y'} onClick={e => { e.stopPropagation(); addYellow(tk, idx); }} dark={dark}>
                  <Square size={11} fill="var(--yellow-card)" stroke="none" />{yc > 1 && <span className="ev-count">{yc}</span>}
                </EvBtn>
                <EvBtn active={!!p.redCard} activeClass="r" onClick={e => { e.stopPropagation(); toggleRed(tk, idx); }} dark={dark}><Square size={11} fill="var(--red)" stroke="none" /></EvBtn>
                <EvBtn active={(p.goals || 0) > 0} activeClass="g" dark={dark}
                  onClick={e => { e.stopPropagation(); addGoal(tk, idx); }}
                  onContextMenu={e => { e.preventDefault(); e.stopPropagation(); removeGoal(tk, idx); }}
                >
                  ⚽{(p.goals || 0) > 0 && <span className="ev-count">{p.goals}</span>}
                </EvBtn>
              </div>
              {hasR && (
                <span
                  onClick={e => { e.stopPropagation(); setOpenDropdown(isOpen ? null : did); }}
                  style={{ display: 'flex', color: isOpen ? 'var(--green)' : 'var(--text3)', marginLeft: 4, flexShrink: 0, cursor: 'pointer', transition: 'color .2s' }}
                ><ChevronsUpDown size={15} /></span>
              )}

              {/* Dropdown */}
              {isOpen && (
                <div onClick={e => e.stopPropagation()} style={{
                  position: 'absolute', top: '100%', left: 4, right: 4,
                  background: 'var(--bg2)', border: '1px solid var(--green)',
                  borderRadius: 0, zIndex: 1000, maxHeight: 240,
                  overflowY: 'auto', boxShadow: c('0 10px 30px rgba(20,23,28,.18)', '0 10px 30px rgba(0,0,0,.6)'),
                  animation: 'fadeSlide .15s ease-out'
                }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '6px 12px', fontSize: 9, color: 'var(--text2)',
                    letterSpacing: 1, fontWeight: 700, textTransform: 'uppercase',
                    borderBottom: '1px solid var(--border)', background: 'var(--green-dim)'
                  }}>
                    <RefreshCw size={10} /> Substituir <strong style={{ color: 'var(--text)' }}>{p.name}</strong> por:
                  </div>
                  {team.reserves.map((r, ri) => (
                    <div key={r.id} onClick={() => doSub(tk, idx, ri)} style={{
                      display: 'flex', alignItems: 'center', padding: '8px 12px', cursor: 'pointer',
                      borderBottom: '1px solid var(--border)', transition: 'background .12s'
                    }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--green-dim)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <span style={{
                        width: 28, height: 28, borderRadius: 0, background: 'var(--bg3)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 700, fontSize: 13, fontFamily: 'var(--font-head)', marginRight: 10
                      }}>{r.number}</span>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{r.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 9, letterSpacing: 1.5, color: 'var(--text3)', fontWeight: 700 }}>TÉCNICO:</span>
          <span style={{ color: team.accent, fontSize: 12, fontWeight: 600 }}>{team.coach}</span>
        </div>
      </div>
    </div>
  );
}

/* ── Event Button ── */
function EvBtn({ active, activeClass, onClick, onContextMenu, children, dark }: {
  active: boolean; activeClass: string;
  onClick: (e: React.MouseEvent) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  children: React.ReactNode;
  dark: boolean;
}) {
  const bgMap: Record<string, string> = {
    y: 'rgba(255,204,0,0.2)', y2: 'rgba(255,204,0,0.4)',
    r: dark ? 'rgba(255,61,61,0.2)' : 'rgba(214,40,34,0.2)',
    g: dark ? 'rgba(0,200,83,0.15)' : 'rgba(0,122,67,0.12)'
  };
  const shadowMap: Record<string, string> = {
    y: '0 0 6px rgba(255,204,0,0.3)', y2: '0 0 10px rgba(255,204,0,0.4)',
    r: dark ? '0 0 6px rgba(255,61,61,0.3)' : '0 0 6px rgba(214,40,34,0.25)',
    g: dark ? '0 0 6px rgba(0,200,83,0.3)' : '0 0 6px rgba(0,122,67,0.25)'
  };

  return (
    <button onClick={onClick} onContextMenu={onContextMenu} style={{
      width: 24, height: 24, borderRadius: 0, border: 'none', cursor: 'pointer',
      fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
      transition: 'all .15s', position: 'relative', lineHeight: 1,
      background: active ? bgMap[activeClass] : (dark ? 'rgba(255,255,255,0.02)' : 'rgba(20,23,28,0.04)'),
      opacity: active ? 1 : (activeClass === 'g' ? 0.4 : 0.6),
      boxShadow: active ? shadowMap[activeClass] : 'none'
    }}>
      {children}
    </button>
  );
}

/* ── Tactical Field ── */
function TacticalField({ ls, setLiveState, match }: { ls: LiveState; setLiveState: React.Dispatch<React.SetStateAction<LiveState | null>>; match: any }) {
  const fieldRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ el: HTMLElement; key: string } | null>(null);

  const tA = ls.teamA;
  const tB = ls.teamB;
  const formA = FORMATIONS[tA.formation || match.teamA.formation || '4-4-2'] || FORMATIONS['4-4-2'];
  const formB = FORMATIONS[tB.formation || match.teamB.formation || '4-4-2'] || FORMATIONS['4-4-2'];
  const flipped = !!ls.fieldFlipped;

  const leftTeam = flipped ? tB : tA;
  const rightTeam = flipped ? tA : tB;
  const leftForm = flipped ? formB : formA;
  const rightForm = flipped ? formA : formB;
  const leftPrefix = flipped ? 'b' : 'a';
  const rightPrefix = flipped ? 'a' : 'b';

  const getPos = (key: string, form: { pos: [number, number][] }, idx: number, isRight: boolean) => {
    if (ls.fieldPos[key]) return ls.fieldPos[key];
    if (idx >= form.pos.length) return { x: 50, y: 50 };
    const [fx, fy] = form.pos[idx];
    const px = isRight ? 97 - (fx / 50) * 45 : 3 + (fx / 50) * 45;
    const py = 5 + (fy / 100) * 90;
    return { x: px, y: py };
  };

  const handlePointerDown = useCallback((e: React.MouseEvent | React.TouchEvent, key: string) => {
    const el = (e.target as HTMLElement).closest('[data-pk]') as HTMLElement;
    if (!el || !fieldRef.current) return;
    e.preventDefault();
    el.style.zIndex = '100';
    el.style.transition = 'none';
    dragRef.current = { el, key };

    const onMove = (ev: MouseEvent | TouchEvent) => {
      if (!dragRef.current || !fieldRef.current) return;
      ev.preventDefault();
      const rect = fieldRef.current.getBoundingClientRect();
      const pos = 'touches' in ev ? { x: ev.touches[0].clientX, y: ev.touches[0].clientY } : { x: ev.clientX, y: ev.clientY };
      let px = ((pos.x - rect.left) / rect.width) * 100;
      let py = ((pos.y - rect.top) / rect.height) * 100;
      px = Math.max(1, Math.min(99, px));
      py = Math.max(1, Math.min(99, py));
      dragRef.current.el.style.left = px + '%';
      dragRef.current.el.style.top = py + '%';
    };

    const onUp = () => {
      if (!dragRef.current) return;
      const el = dragRef.current.el;
      const k = dragRef.current.key;
      el.style.zIndex = '10';
      el.style.transition = 'all .3s';
      const px = parseFloat(el.style.left);
      const py = parseFloat(el.style.top);
      setLiveState(prev => {
        if (!prev) return prev;
        return { ...prev, fieldPos: { ...prev.fieldPos, [k]: { x: px, y: py } } };
      });
      dragRef.current = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onUp);
    };

    document.addEventListener('mousemove', onMove, { passive: false });
    document.addEventListener('mouseup', onUp);
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onUp);
  }, [setLiveState]);

  const getEventIcons = (p: Player) => {
    const items: React.ReactNode[] = [];
    if ((p.goals || 0) > 0) items.push(
      <span key="g" style={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
        ⚽{(p.goals || 0) > 1 ? `×${p.goals}` : ''}
      </span>
    );
    if ((p.yellowCards || 0) > 0) items.push(
      <span key="y" style={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
        <Square size={8} fill="var(--yellow-card)" stroke="none" />{(p.yellowCards || 0) > 1 ? `×${p.yellowCards}` : ''}
      </span>
    );
    if (p.redCard) items.push(<Square key="r" size={8} fill="var(--red)" stroke="none" />);
    if (p.subIn) items.push(<ArrowUp key="s" size={9} />);
    return items;
  };

  const flipField = () => {
    setLiveState(prev => prev ? { ...prev, fieldFlipped: !prev.fieldFlipped, fieldPos: {} } : prev);
  };

  const resetPos = () => {
    setLiveState(prev => prev ? { ...prev, fieldPos: {} } : prev);
  };

  const renderPlayers = (team: LiveTeam, form: { pos: [number, number][] }, prefix: string, isRight: boolean) => {
    return team.starters.map((p, i) => {
      if (i >= form.pos.length) return null;
      const key = `${prefix}-${i}`;
      const pos = getPos(key, form, i, isRight);
      const evts = getEventIcons(p);
      return (
        <div
          key={key}
          data-pk={key}
          onMouseDown={e => handlePointerDown(e, key)}
          onTouchStart={e => handlePointerDown(e, key)}
          style={{
            position: 'absolute', transform: 'translate(-50%,-50%)', zIndex: 10,
            textAlign: 'center', cursor: 'grab', transition: 'all .3s',
            userSelect: 'none', left: pos.x + '%', top: pos.y + '%',
            opacity: p.redCard ? 0.4 : 1
          }}
        >
          <div style={{
            width: 36, height: 36, borderRadius: '50%', display: 'flex',
            alignItems: 'center', justifyContent: 'center', fontSize: 18,
            fontWeight: 900, fontFamily: 'var(--font-head)', letterSpacing: 0,
            boxShadow: '0 3px 10px rgba(0,0,0,0.5)',
            border: p.redCard ? '2px solid var(--red)' : '2px solid rgba(255,255,255,0.3)',
            background: team.color, color: team.accent, transition: 'transform .2s',
            lineHeight: 1
          }}>
            {p.number || (i + 1)}
          </div>
          <div style={{
            fontSize: 10, fontWeight: 700, color: '#fff',
            textShadow: '0 1px 4px rgba(0,0,0,0.8)', marginTop: 2,
            letterSpacing: 0.3, maxWidth: 70, lineHeight: 1.2,
            textAlign: 'center', wordBreak: 'break-word',
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}>
            {p.name}
          </div>
          {evts.length > 0 && <div style={{ display: 'flex', gap: 3, justifyContent: 'center', fontSize: 8, color: '#fff' }}>{evts}</div>}
        </div>
      );
    });
  };

  const leftName = flipped ? tB.name : tA.name;
  const rightName = flipped ? tA.name : tB.name;
  const leftLabel = leftForm.label;
  const rightLabel = rightForm.label;

  return (
    <div>
      <div style={{ position: 'relative', width: '100%', paddingTop: '62%', background: '#3a8c3f', borderRadius: 0, overflow: 'hidden', border: '2px solid rgba(255,255,255,0.15)', marginBottom: 12 }}>
        <div ref={fieldRef} style={{ position: 'absolute', inset: 0 }}>
          {/* Grass stripes */}
          <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(90deg,rgba(0,0,0,0) 0%,rgba(0,0,0,0) 9.09%,rgba(0,0,0,0.04) 9.09%,rgba(0,0,0,0.04) 18.18%)' }} />
          {/* Field lines */}
          <div style={{ position: 'absolute', inset: '3%', border: '2px solid rgba(255,255,255,0.7)' }} />
          <div style={{ position: 'absolute', left: '50%', top: '3%', bottom: '3%', width: 2, background: 'rgba(255,255,255,0.7)' }} />
          <div style={{ position: 'absolute', left: '50%', top: '50%', width: '16%', paddingTop: '16%', transform: 'translate(-50%,-50%)', border: '2px solid rgba(255,255,255,0.7)', borderRadius: '50%' }} />
          <div style={{ position: 'absolute', left: '50%', top: '50%', width: 6, height: 6, background: 'rgba(255,255,255,0.7)', borderRadius: '50%', transform: 'translate(-50%,-50%)' }} />
          {/* Penalty areas */}
          <div style={{ position: 'absolute', left: '3%', top: '22%', width: '12%', bottom: '22%', border: '2px solid rgba(255,255,255,0.7)', borderLeft: 'none' }} />
          <div style={{ position: 'absolute', right: '3%', top: '22%', width: '12%', bottom: '22%', border: '2px solid rgba(255,255,255,0.7)', borderRight: 'none' }} />
          <div style={{ position: 'absolute', left: '3%', top: '35%', width: '5%', bottom: '35%', border: '2px solid rgba(255,255,255,0.7)', borderLeft: 'none' }} />
          <div style={{ position: 'absolute', right: '3%', top: '35%', width: '5%', bottom: '35%', border: '2px solid rgba(255,255,255,0.7)', borderRight: 'none' }} />

          {/* Players */}
          {renderPlayers(leftTeam, leftForm, leftPrefix, false)}
          {renderPlayers(rightTeam, rightForm, rightPrefix, true)}
        </div>
      </div>

      {/* Formation labels + buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '-8px 8px 10px', fontSize: 10, color: 'var(--text3)' }}>
        <span>{leftName}: <strong style={{ color: 'var(--text2)' }}>{leftLabel}</strong></span>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={flipField} className="btn-ghost" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 9, padding: '3px 10px' }}><ArrowLeftRight size={10} /> Inverter lados</button>
          <button onClick={resetPos} className="btn-ghost" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 9, padding: '3px 10px' }}><RotateCcw size={10} /> Resetar</button>
        </div>
        <span><strong style={{ color: 'var(--text2)' }}>{rightLabel}</strong> :{rightName}</span>
      </div>
    </div>
  );
}

function ViewBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 5,
      fontSize: 11, padding: '5px 14px', borderRadius: 0, cursor: 'pointer',
      fontFamily: 'var(--font-body)', fontWeight: 600, transition: 'all .2s',
      border: `1px solid ${active ? 'var(--green)' : 'var(--border)'}`,
      background: active ? 'var(--green-dim)' : 'var(--bg3)',
      color: active ? 'var(--green)' : 'var(--text3)'
    }}>
      {children}
    </button>
  );
}
