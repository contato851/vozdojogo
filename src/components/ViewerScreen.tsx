import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Goal, RadioTower, Square, ArrowUp, ArrowRight } from 'lucide-react';
import { fetchBroadcast, subscribeToBroadcast } from '../data/broadcast';
import { formatClock, getClockElapsed } from '../data/store';
import { LiveState } from '../data/types';
import Logo from './Logo';
import { useIsMobile } from '../hooks/use-mobile';
import { useTeamLogo } from '../hooks/useTeamLogo';

function ViewerTeamLogo({ teamName, size = 48, logo }: { teamName: string; size?: number; logo?: string | null }) {
  const { logoUrl } = useTeamLogo(teamName, logo);
  const [err, setErr] = useState(false);
  if (!logoUrl || err) return null;
  return (
    <img
      src={logoUrl}
      alt={teamName}
      onError={() => setErr(true)}
      style={{ width: size, height: size, objectFit: 'contain' }}
      loading="lazy"
    />
  );
}

export default function ViewerScreen() {
  const { shareCode } = useParams<{ shareCode: string }>();
  const isMobile = useIsMobile();
  const [liveState, setLiveState] = useState<LiveState | null>(null);
  const [matchData, setMatchData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [clockDisplay, setClockDisplay] = useState('00:00');

  useEffect(() => {
    if (!liveState?.clock) return;
    const tick = () => {
      if (liveState?.clock) setClockDisplay(formatClock(getClockElapsed(liveState.clock)));
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [liveState?.clock?.running, liveState?.clock?.startedAt, liveState?.clock?.elapsed]);

  useEffect(() => {
    if (!shareCode) return;

    let unsub: (() => void) | null = null;

    const init = async () => {
      try {
        const data = await fetchBroadcast(shareCode);
        setLiveState(data.state as unknown as LiveState);
        setMatchData(data.match_data);
        setLoading(false);

        unsub = subscribeToBroadcast(shareCode, (state, match) => {
          setLiveState(state as unknown as LiveState);
          setMatchData(match);
        });
      } catch (err: any) {
        setError('Transmissão não encontrada ou encerrada.');
        setLoading(false);
      }
    };

    init();
    return () => { unsub?.(); };
  }, [shareCode]);

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16, color: 'var(--green)' }}><Goal size={36} /></div>
          <div style={{ fontFamily: 'var(--font-head)', fontSize: 24, letterSpacing: 3, color: 'var(--green)' }}>
            CARREGANDO...
          </div>
        </div>
      </div>
    );
  }

  if (error || !liveState) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16, color: 'var(--red)' }}><RadioTower size={44} /></div>
          <div style={{ fontFamily: 'var(--font-head)', fontSize: 28, letterSpacing: 3, color: 'var(--red)', marginBottom: 8 }}>
            TRANSMISSÃO ENCERRADA
          </div>
          <p style={{ color: 'var(--text2)', fontSize: 14 }}>{error || 'Esta transmissão não está mais disponível.'}</p>
        </div>
      </div>
    );
  }

  const teamA = liveState.teamA;
  const teamB = liveState.teamB;
  const goalsA = liveState.goalLog.filter(g => g.team === 'teamA').length;
  const goalsB = liveState.goalLog.filter(g => g.team === 'teamB').length;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '16px 20px', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
        marginBottom: 16, padding: '8px 0', borderBottom: '1px solid var(--border)'
      }}>
        <Logo size="sm" />
        <span style={{
          display: 'flex', alignItems: 'center', gap: 4,
          fontSize: 9, letterSpacing: 1,
          background: 'rgba(214,40,34,0.1)', padding: '2px 8px', borderRadius: 'var(--radius)',
          border: '1px solid rgba(214,40,34,0.25)', color: 'var(--red)'
        }}>
          <span style={{
            display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
            background: 'var(--red)', animation: 'pulse 1.5s infinite'
          }} />
          AO VIVO
        </span>
      </div>

      {/* Match info */}
      {(() => {
        const formattedDate = matchData?.matchDate
          ? new Date(`${matchData.matchDate}T00:00:00`).toLocaleDateString('pt-BR')
          : '';
        const infos: [string, string][] = [
          ['COMPETIÇÃO', matchData?.competition], ['RODADA', matchData?.round],
          ['DATA', [formattedDate, matchData?.matchTime].filter(Boolean).join(' · ')],
          ['ESTÁDIO', matchData?.stadium], ['ÁRBITRO', matchData?.referee],
        ].filter(x => x[1]) as [string, string][];
        if (infos.length === 0) return null;
        return (
          <div style={{
            background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
            padding: '10px 16px', marginBottom: 14, display: 'flex', flexWrap: 'wrap',
            justifyContent: 'center', gap: '10px 20px'
          }}>
            {infos.map(([l, v]) => (
              <div key={l} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 8, color: 'var(--text3)', letterSpacing: 1.5, fontWeight: 700 }}>{l}</div>
                <div style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 500 }}>{v}</div>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Scoreboard */}
      <div style={{
        background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
        padding: '24px 20px', marginBottom: 14
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: isMobile ? 12 : 20 }}>
          <div style={{ flex: 1, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {isMobile ? (
              <ViewerTeamLogo teamName={teamA?.name || ''} logo={teamA?.logo} size={56} />
            ) : (
              <div style={{
                fontFamily: 'var(--font-head)', fontSize: 28, fontWeight: 700,
                letterSpacing: 3, color: teamA?.accent || 'var(--text)'
              }}>
                {teamA?.name || 'TIME A'}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: isMobile ? 80 : 120 }}>
            <div style={{
              fontFamily: 'var(--font-head)', fontSize: isMobile ? 40 : 52, fontWeight: 700,
              color: 'var(--text)', letterSpacing: 4, textAlign: 'center'
            }}>
              {goalsA} × {goalsB}
            </div>
            <div style={{
              fontFamily: 'var(--font-head)', fontSize: 15, fontWeight: 600,
              color: liveState.clock?.running ? 'var(--green)' : 'var(--text3)', letterSpacing: 2
            }}>
              {clockDisplay}
            </div>
          </div>
          <div style={{ flex: 1, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {isMobile ? (
              <ViewerTeamLogo teamName={teamB?.name || ''} logo={teamB?.logo} size={56} />
            ) : (
              <div style={{
                fontFamily: 'var(--font-head)', fontSize: 28, fontWeight: 700,
                letterSpacing: 3, color: teamB?.accent || 'var(--text)'
              }}>
                {teamB?.name || 'TIME B'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lineups */}
      <div style={{ display: 'flex', gap: 14 }}>
        {[
          { team: teamA, label: 'teamA' },
          { team: teamB, label: 'teamB' }
        ].map(({ team, label }) => (
          <div key={label} style={{ flex: 1 }}>
            <div style={{
              background: 'var(--bg2)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius)', overflow: 'hidden'
            }}>
              {team ? (
                <div style={{ background: '#fff' }}>
                  <div style={{ display: 'flex', height: 5 }}>
                    <div style={{ flex: 1, background: team.color }} />
                    <div style={{ flex: 1, background: team.accent }} />
                  </div>
                  <div style={{ padding: '10px 14px', textAlign: 'center' }}>
                    <span style={{
                      fontFamily: 'var(--font-head)', fontSize: 18, fontWeight: 700,
                      letterSpacing: 3, color: '#030016'
                    }}>
                      {team.name}
                    </span>
                  </div>
                </div>
              ) : (
                <div style={{ padding: '10px 14px', background: 'var(--bg3)', textAlign: 'center' }}>
                  <span style={{
                    fontFamily: 'var(--font-head)', fontSize: 18, fontWeight: 700,
                    letterSpacing: 3, color: 'var(--text)'
                  }} />
                </div>
              )}
              <div style={{ padding: 12 }}>
                <div style={{ fontSize: 9, color: 'var(--text3)', letterSpacing: 1.5, fontWeight: 700, marginBottom: 6 }}>
                  TITULARES
                </div>
                {team?.starters?.map((p, i) => (
                  <div key={i} style={{
                    display: 'flex', gap: 6, alignItems: 'center', padding: '3px 0',
                    fontSize: 12, color: 'var(--text)'
                  }}>
                    <span style={{
                      fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 14,
                      color: 'var(--text)', minWidth: 28
                    }}>{p.number}</span>
                    <span style={{ fontWeight: 500 }}>{p.name}</span>
                    {(p.yellowCards || 0) > 0 && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: 10 }}>
                        <Square size={9} fill="var(--yellow-card)" stroke="none" />{(p.yellowCards || 0) > 1 ? `×${p.yellowCards}` : ''}
                      </span>
                    )}
                    {p.redCard && <Square size={9} fill="var(--red)" stroke="none" />}
                    {(p.goals || 0) > 0 && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: 10, color: 'var(--green)' }}>
                        ⚽{(p.goals || 0) > 1 ? `×${p.goals}` : ''}
                      </span>
                    )}
                    {p.subIn && <ArrowUp size={11} color="var(--green)" />}
                  </div>
                ))}

                {team?.subsOut?.length > 0 && (
                  <>
                    <div style={{ fontSize: 9, color: 'var(--text3)', letterSpacing: 1.5, fontWeight: 700, margin: '8px 0 4px' }}>
                      SUBSTITUÍDOS
                    </div>
                    {team.subsOut.map((p: any, i: number) => (
                      <div key={i} style={{ fontSize: 11, color: 'var(--text3)', padding: '2px 0' }}>
                        <span style={{ fontFamily: 'var(--font-head)', minWidth: 28, display: 'inline-block' }}>{p.number}</span>
                        <span>{p.name}</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, color: 'var(--text3)', fontSize: 9, marginLeft: 4 }}><ArrowRight size={9} /> {p.replacedBy}</span>
                      </div>
                    ))}
                  </>
                )}

                {team?.reserves?.length > 0 && (
                  <>
                    <div style={{ fontSize: 9, color: 'var(--text3)', letterSpacing: 1.5, fontWeight: 700, margin: '8px 0 4px' }}>
                      BANCO ({team.reserves.length})
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                      {team.reserves.map((r: any, j: number) => (
                        <span key={j} style={{
                          background: 'var(--bg3)', padding: '2px 6px', borderRadius: 'var(--radius)',
                          fontSize: 10, color: 'var(--text2)'
                        }}>
                          {r.number} {r.name}
                        </span>
                      ))}
                    </div>
                  </>
                )}

                {team?.coach && (
                  <div style={{ marginTop: 8, paddingTop: 6, borderTop: '1px solid var(--border)', fontSize: 10 }}>
                    <span style={{ color: 'var(--text3)', fontWeight: 700, letterSpacing: 1 }}>TÉCNICO: </span>
                    <span style={{ color: team?.accent || 'var(--text)' }}>{team.coach}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Goals timeline */}
      {liveState.goalLog.length > 0 && (
        <div style={{
          background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
          padding: '12px 16px', marginTop: 14
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, color: 'var(--text3)', letterSpacing: 1.5, fontWeight: 700, marginBottom: 6 }}>
            ⚽ GOLS
          </div>
          {liveState.goalLog.map((g, i) => (
            <div key={i} style={{
              fontSize: 12, padding: '3px 0', color: 'var(--text)',
              textAlign: g.team === 'teamA' ? 'left' : 'right'
            }}>
              <span style={{ color: 'var(--green)', fontWeight: 700, marginRight: 6 }}>{g.minute}'</span>
              {g.playerNumber} {g.playerName}
            </div>
          ))}
        </div>
      )}

      <div style={{ textAlign: 'center', marginTop: 20, fontSize: 10, color: 'var(--text3)' }}>
        Transmissão em tempo real via Voz do Jogo
      </div>
    </div>
  );
}
