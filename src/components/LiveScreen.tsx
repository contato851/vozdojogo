import { useState, useEffect, useRef, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { LiveTeam, Player, LiveState } from '../data/types';
import { FORMATIONS } from '../data/formations';
import { formatClock, getClockElapsed, getClockMinute, sortByNumber } from '../data/store';
import { useTeamLogo } from '../hooks/useTeamLogo';

// Small inline logo for live screen
function LiveTeamLogo({ teamName, size = 38 }: { teamName: string; size?: number }) {
  const { logoUrl } = useTeamLogo(teamName, false);
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
    <div style={{ animation: 'fadeUp .3s ease-out' }}>
      {/* Header with scoreboard */}
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px 20px', marginBottom: 12 }}>
        {/* Score */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 16, gap: 10 }}>
            <div style={{ fontFamily: 'var(--font-head)', fontSize: 34, fontWeight: 700, letterSpacing: 2, lineHeight: 1.1, color: tA.accent, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {tA.name}
            </div>
            <LiveTeamLogo teamName={tA.name} size={38} />
          </div>
          <div style={{ flexShrink: 0 }}>
            <span style={{ fontFamily: 'var(--font-head)', fontSize: 48, fontWeight: 700, background: 'var(--bg3)', padding: '4px 22px', borderRadius: 8, letterSpacing: 4, display: 'inline-block', border: '1px solid var(--border)' }}>
              {goalsA}<span style={{ color: 'var(--text3)', fontSize: 32, margin: '0 6px' }}>×</span>{goalsB}
            </span>
          </div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-start', paddingLeft: 16, gap: 10 }}>
            <LiveTeamLogo teamName={tB.name} size={38} />
            <div style={{ fontFamily: 'var(--font-head)', fontSize: 34, fontWeight: 700, letterSpacing: 2, lineHeight: 1.1, color: tB.accent, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {tB.name}
            </div>
          </div>
        </div>

        {/* Goals log */}
        {goalLog.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 2 }}>
            <div style={{ flex: 1, textAlign: 'right', paddingRight: 30 }}>
              {goalLog.filter(g => g.team === 'teamA').map((g, i) => (
                <div key={i} style={{ fontSize: 11, color: 'var(--text2)', lineHeight: 1.6 }}>
                  ⚽ <strong style={{ color: 'var(--text)' }}>{g.playerName}</strong> <span style={{ color: 'var(--green)', fontSize: 10 }}>{g.minute}'</span>
                </div>
              ))}
            </div>
            <div style={{ flexShrink: 0, width: 160 }} />
            <div style={{ flex: 1, textAlign: 'left', paddingLeft: 30 }}>
              {goalLog.filter(g => g.team === 'teamB').map((g, i) => (
                <div key={i} style={{ fontSize: 11, color: 'var(--text2)', lineHeight: 1.6 }}>
                  ⚽ <strong style={{ color: 'var(--text)' }}>{g.playerName}</strong> <span style={{ color: 'var(--green)', fontSize: 10 }}>{g.minute}'</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Clock */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, margin: '8px 0 2px', padding: '8px 16px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, width: 'fit-content', marginLeft: 'auto', marginRight: 'auto' }}>
          <span style={{ fontFamily: 'var(--font-head)', fontSize: 40, fontWeight: 600, letterSpacing: 4, minWidth: 90, textAlign: 'center', color: clk.running ? 'var(--green)' : 'var(--text2)' }}>
            {clockDisplay}
          </span>
          <div style={{ display: 'flex', gap: 4, flexDirection: 'column' }}>
            <button onClick={toggleClock} style={{
              fontSize: 10, padding: '4px 12px', borderRadius: 5, cursor: 'pointer',
              fontFamily: 'var(--font-body)', fontWeight: 700, letterSpacing: 0.5, whiteSpace: 'nowrap',
              border: `1px solid ${clk.running ? 'rgba(255,215,64,0.3)' : 'var(--green)'}`,
              background: clk.running ? 'rgba(255,215,64,0.15)' : 'var(--green)',
              color: clk.running ? 'var(--gold)' : 'var(--bg)',
              transition: 'all .2s'
            }}>
              {clk.running ? '⏸ PAUSAR' : '▶ INICIAR'}
            </button>
            <button onClick={resetClock} style={{
              fontSize: 10, padding: '4px 12px', borderRadius: 5, cursor: 'pointer',
              fontFamily: 'var(--font-body)', fontWeight: 700, border: '1px solid var(--border)',
              background: 'var(--bg3)', color: 'var(--text2)', transition: 'all .2s',
              letterSpacing: 0.5, whiteSpace: 'nowrap'
            }}>
              ↺ ZERAR
            </button>
          </div>
        </div>
      </div>

      {/* Match info block */}
      {allInfos.length > 0 && (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 16px', marginBottom: 12, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '12px 20px' }}>
          {allInfos.map(([l, v]) => (
            <div key={l} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 8, color: 'var(--text3)', letterSpacing: 1.5, fontWeight: 700, textTransform: 'uppercase' }}>{l}</div>
              <div style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 500 }}>{v}</div>
            </div>
          ))}
        </div>
      )}

      {/* Hint */}
      <div style={{ textAlign: 'center', marginBottom: 10, fontSize: 10, color: 'var(--text3)' }}>
        {liveView === 'field' ? 'Visualização tática · Eventos e substituições na vista Lista' : '🟨 🟥 ⚽ Ícones para marcar eventos · Nome ou ⇅ para substituir · Clique direito no ⚽ remove gol'}
      </div>

      {/* View toggle */}
      <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginBottom: 10 }}>
        <ViewBtn active={liveView === 'list'} onClick={() => setLiveView('list')}>☰ Lista</ViewBtn>
        <ViewBtn active={liveView === 'field'} onClick={() => setLiveView('field')}>⬢ Campo Tático</ViewBtn>
      </div>

      {liveView === 'field' ? (
        <TacticalField ls={ls} setLiveState={setLiveState} match={match} />
      ) : (
        <div style={{ display: 'flex', gap: 14, marginBottom: 10 }}>
          <div style={{ flex: 1 }}>
            <LiveTeamCard team={tA} tk="teamA" openDropdown={openDropdown} setOpenDropdown={setOpenDropdown}
              addYellow={addYellow} toggleRed={toggleRed} addGoal={addGoal} removeGoal={removeGoal} doSub={doSub} sortOrder={ls.sortOrder} />
          </div>
          <div style={{ flex: 1 }}>
            <LiveTeamCard team={tB} tk="teamB" openDropdown={openDropdown} setOpenDropdown={setOpenDropdown}
              addYellow={addYellow} toggleRed={toggleRed} addGoal={addGoal} removeGoal={removeGoal} doSub={doSub} sortOrder={ls.sortOrder} />
          </div>
        </div>
      )}

      {/* Banks */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 12 }}>
        {[tA, tB].map((t, i) => (
          <div key={i} style={{ flex: 1, background: 'var(--bg2)', borderRadius: 6, padding: '10px 12px', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 9, color: 'var(--text3)', letterSpacing: 1.5, fontWeight: 700, marginBottom: 6 }}>
              BANCO — {t.name} ({t.reserves.length})
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
              {t.reserves.length ? t.reserves.map((r, j) => (
                <span key={j} style={{ background: 'var(--bg3)', padding: '2px 6px', borderRadius: 3, fontSize: 10, color: 'var(--text2)', fontWeight: 500 }}>
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
          fontSize: 10, padding: '6px 14px', borderRadius: 5, cursor: 'pointer',
          fontFamily: 'var(--font-body)', fontWeight: 600, transition: 'all .2s',
          border: `1px solid ${totalSubs ? 'rgba(255,61,61,0.2)' : 'var(--border)'}`,
          background: totalSubs ? 'rgba(255,61,61,0.08)' : 'var(--bg3)',
          color: totalSubs ? 'var(--red)' : 'var(--text2)'
        }}>
          🔄 Substituições ({totalSubs})
        </button>
        <button onClick={() => { setShowCur(!showCur); setShowSubs(false); }} style={{
          fontSize: 10, padding: '6px 14px', borderRadius: 5, cursor: 'pointer',
          fontFamily: 'var(--font-body)', fontWeight: 600, transition: 'all .2s',
          border: `1px solid ${showCur ? 'var(--green)' : 'var(--border)'}`,
          background: showCur ? 'var(--green-dim)' : 'var(--bg3)',
          color: showCur ? 'var(--green)' : 'var(--text2)'
        }}>
          📝 Curiosidades
        </button>
      </div>

      {/* Subs log */}
      {showSubs && (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20, marginBottom: 10 }}>
          {totalSubs > 0 ? (
            <>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: 1.5, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 8 }}>Substituições Realizadas</div>
              <div style={{ display: 'flex', gap: 16 }}>
                {[tA, tB].filter(t => t.subsOut.length > 0).map((t, i) => (
                  <div key={i} style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: t.accent, fontWeight: 700, marginBottom: 4 }}>{t.name}</div>
                    {t.subsOut.map((p, j) => (
                      <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 0', fontSize: 11, color: 'var(--text2)' }}>
                        <span style={{ color: 'var(--red)', fontSize: 9 }}>▼</span>
                        <strong style={{ color: 'var(--text)' }}>{p.number}</strong> {p.name}{p.eventSummary}
                        <span style={{ color: 'var(--text3)' }}>→</span>
                        <span style={{ color: 'var(--green)', fontSize: 10 }}>▲ {p.replacedBy}</span>
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
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20 }}>
          <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginBottom: 12 }}>
            {[{ id: 'a', t: tA }, { id: 'b', t: tB }].map(tab => (
              <button key={tab.id} onClick={() => setCurTab(tab.id)} style={{
                fontSize: 14, fontWeight: 700, padding: '7px 24px', borderRadius: 6, cursor: 'pointer',
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
function LiveTeamCard({ team, tk, openDropdown, setOpenDropdown, addYellow, toggleRed, addGoal, removeGoal, doSub, sortOrder }: {
  team: LiveTeam; tk: 'teamA' | 'teamB';
  openDropdown: string | null; setOpenDropdown: (v: string | null) => void;
  addYellow: (tk: 'teamA' | 'teamB', i: number) => void;
  toggleRed: (tk: 'teamA' | 'teamB', i: number) => void;
  addGoal: (tk: 'teamA' | 'teamB', i: number) => void;
  removeGoal: (tk: 'teamA' | 'teamB', i: number) => void;
  doSub: (tk: 'teamA' | 'teamB', si: number, ri: number) => void;
  sortOrder: string;
}) {
  const side = tk === 'teamA' ? 'left' : 'right';

  return (
    <div>
      <div style={{ padding: '12px 16px', borderRadius: '8px 8px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: team.color }}>
        <LiveTeamLogo teamName={team.name} size={28} />
        <span style={{ fontFamily: 'var(--font-head)', fontSize: 26, fontWeight: 700, letterSpacing: 3, color: team.accent }}>{team.name}</span>
      </div>
      <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '0 0 8px 8px' }}>
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
              background: isOpen ? 'rgba(0,200,83,0.1)' : p.subIn ? 'rgba(0,200,83,0.06)' : 'transparent'
            }}>
              <span style={{
                width: 32, height: 32, borderRadius: 6, display: 'flex',
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
                  fontSize: 8, color: 'var(--green)', fontWeight: 700,
                  background: 'var(--green-dim)', padding: '2px 6px', borderRadius: 3,
                  marginLeft: 4, flexShrink: 0, letterSpacing: 0.5
                }}>▲ ENTROU</span>
              )}
              <div style={{ display: 'flex', gap: 3, marginLeft: 'auto', marginRight: 4, flexShrink: 0 }}>
                <EvBtn active={yc > 0} activeClass={yc >= 2 ? 'y2' : 'y'} onClick={e => { e.stopPropagation(); addYellow(tk, idx); }}>
                  🟨{yc > 1 && <span className="ev-count">{yc}</span>}
                </EvBtn>
                <EvBtn active={!!p.redCard} activeClass="r" onClick={e => { e.stopPropagation(); toggleRed(tk, idx); }}>🟥</EvBtn>
                <EvBtn active={(p.goals || 0) > 0} activeClass="g"
                  onClick={e => { e.stopPropagation(); addGoal(tk, idx); }}
                  onContextMenu={e => { e.preventDefault(); e.stopPropagation(); removeGoal(tk, idx); }}
                >
                  ⚽{(p.goals || 0) > 0 && <span className="ev-count">{p.goals}</span>}
                </EvBtn>
              </div>
              {hasR && (
                <span
                  onClick={e => { e.stopPropagation(); setOpenDropdown(isOpen ? null : did); }}
                  style={{ fontSize: 16, color: isOpen ? 'var(--green)' : 'var(--text3)', marginLeft: 4, flexShrink: 0, cursor: 'pointer', transition: 'color .2s' }}
                >⇅</span>
              )}

              {/* Dropdown */}
              {isOpen && (
                <div onClick={e => e.stopPropagation()} style={{
                  position: 'absolute', top: '100%', left: 4, right: 4,
                  background: 'var(--bg2)', border: '1px solid var(--green)',
                  borderRadius: '0 0 6px 6px', zIndex: 1000, maxHeight: 240,
                  overflowY: 'auto', boxShadow: '0 10px 30px rgba(0,0,0,.6)',
                  animation: 'fadeSlide .15s ease-out'
                }}>
                  <div style={{
                    padding: '6px 12px', fontSize: 9, color: 'var(--text2)',
                    letterSpacing: 1, fontWeight: 700, textTransform: 'uppercase',
                    borderBottom: '1px solid var(--border)', background: 'var(--green-dim)'
                  }}>
                    🔄 Substituir <strong style={{ color: 'var(--text)' }}>{p.name}</strong> por:
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
                        width: 28, height: 28, borderRadius: 5, background: 'var(--bg3)',
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
function EvBtn({ active, activeClass, onClick, onContextMenu, children }: {
  active: boolean; activeClass: string;
  onClick: (e: React.MouseEvent) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  children: React.ReactNode;
}) {
  const bgMap: Record<string, string> = {
    y: 'rgba(255,204,0,0.2)', y2: 'rgba(255,204,0,0.4)',
    r: 'rgba(255,61,61,0.2)', g: 'rgba(0,200,83,0.15)'
  };
  const shadowMap: Record<string, string> = {
    y: '0 0 6px rgba(255,204,0,0.3)', y2: '0 0 10px rgba(255,204,0,0.4)',
    r: '0 0 6px rgba(255,61,61,0.3)', g: '0 0 6px rgba(0,200,83,0.3)'
  };

  return (
    <button onClick={onClick} onContextMenu={onContextMenu} style={{
      width: 24, height: 24, borderRadius: 4, border: 'none', cursor: 'pointer',
      fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
      transition: 'all .15s', position: 'relative', lineHeight: 1,
      background: active ? bgMap[activeClass] : 'rgba(255,255,255,0.02)',
      opacity: active ? 1 : 0.18, filter: active ? 'none' : 'grayscale(100%)',
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
    let h = '';
    if ((p.goals || 0) > 0) h += `⚽${(p.goals || 0) > 1 ? '×' + p.goals : ''}`;
    if ((p.yellowCards || 0) > 0) h += `🟨${(p.yellowCards || 0) > 1 ? '×' + p.yellowCards : ''}`;
    if (p.redCard) h += '🟥';
    if (p.subIn) h += '▲';
    return h;
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
            width: 32, height: 32, borderRadius: '50%', display: 'flex',
            alignItems: 'center', justifyContent: 'center', fontSize: 13,
            fontWeight: 800, fontFamily: 'var(--font-head)', letterSpacing: 1,
            boxShadow: '0 3px 10px rgba(0,0,0,0.5)',
            border: p.redCard ? '2px solid var(--red)' : '2px solid rgba(255,255,255,0.3)',
            background: team.color, color: team.accent, transition: 'transform .2s'
          }}>
            {p.number}
          </div>
          <div style={{
            fontSize: 8, fontWeight: 700, color: '#fff',
            textShadow: '0 1px 4px rgba(0,0,0,0.8)', marginTop: 1,
            whiteSpace: 'nowrap', letterSpacing: 0.5, maxWidth: 70,
            overflow: 'hidden', textOverflow: 'ellipsis'
          }}>
            {p.name}
          </div>
          {evts && <div style={{ display: 'flex', gap: 1, justifyContent: 'center', fontSize: 8 }}>{evts}</div>}
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
      <div style={{ position: 'relative', width: '100%', paddingTop: '62%', background: '#3a8c3f', borderRadius: 8, overflow: 'hidden', border: '2px solid rgba(255,255,255,0.15)', marginBottom: 12 }}>
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
          <button onClick={flipField} className="btn-ghost" style={{ fontSize: 9, padding: '3px 10px' }}>⇄ Inverter lados</button>
          <button onClick={resetPos} className="btn-ghost" style={{ fontSize: 9, padding: '3px 10px' }}>↺ Resetar</button>
        </div>
        <span><strong style={{ color: 'var(--text2)' }}>{rightLabel}</strong> :{rightName}</span>
      </div>
    </div>
  );
}

function ViewBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      fontSize: 11, padding: '5px 14px', borderRadius: 5, cursor: 'pointer',
      fontFamily: 'var(--font-body)', fontWeight: 600, transition: 'all .2s',
      border: `1px solid ${active ? 'var(--green)' : 'var(--border)'}`,
      background: active ? 'var(--green-dim)' : 'var(--bg3)',
      color: active ? 'var(--green)' : 'var(--text3)'
    }}>
      {children}
    </button>
  );
}
