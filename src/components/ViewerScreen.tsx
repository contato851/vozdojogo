import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { fetchBroadcast, subscribeToBroadcast } from '../data/broadcast';
import { LiveState } from '../data/types';
import Logo from './Logo';
import { useIsMobile } from '../hooks/use-mobile';

export default function ViewerScreen() {
  const { shareCode } = useParams<{ shareCode: string }>();
  const isMobile = useIsMobile();
  const [liveState, setLiveState] = useState<LiveState | null>(null);
  const [matchData, setMatchData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
          <div style={{ fontSize: 40, marginBottom: 16 }}>⚽</div>
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
          <div style={{ fontSize: 48, marginBottom: 16 }}>📡</div>
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
          fontSize: 9, letterSpacing: 1,
          background: 'rgba(255,61,61,0.15)', padding: '2px 8px', borderRadius: 3,
          border: '1px solid rgba(255,61,61,0.3)', color: 'var(--red)'
        }}>
          ● AO VIVO
        </span>
      </div>

      {/* Scoreboard */}
      <div style={{
        background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
        padding: '24px 20px', marginBottom: 14
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{
              fontFamily: 'var(--font-head)', fontSize: 28, fontWeight: 700,
              letterSpacing: 3, color: teamA?.accent || 'var(--text)'
            }}>
              {teamA?.name || 'TIME A'}
            </div>
          </div>
          <div style={{
            fontFamily: 'var(--font-head)', fontSize: 52, fontWeight: 700,
            color: 'var(--text)', letterSpacing: 4, minWidth: 120, textAlign: 'center'
          }}>
            {goalsA} × {goalsB}
          </div>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{
              fontFamily: 'var(--font-head)', fontSize: 28, fontWeight: 700,
              letterSpacing: 3, color: teamB?.accent || 'var(--text)'
            }}>
              {teamB?.name || 'TIME B'}
            </div>
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
              <div style={{
                padding: '10px 14px', background: team?.color || 'var(--bg3)',
                textAlign: 'center'
              }}>
                <span style={{
                  fontFamily: 'var(--font-head)', fontSize: 18, fontWeight: 700,
                  letterSpacing: 3, color: team?.accent || 'var(--text)'
                }}>
                  {team?.name}
                </span>
              </div>
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
                      color: team?.accent, minWidth: 28
                    }}>{p.number}</span>
                    <span style={{ fontWeight: 500 }}>{p.name}</span>
                    {(p.yellowCards || 0) > 0 && <span style={{ fontSize: 10 }}>🟨{(p.yellowCards || 0) > 1 ? `×${p.yellowCards}` : ''}</span>}
                    {p.redCard && <span style={{ fontSize: 10 }}>🟥</span>}
                    {(p.goals || 0) > 0 && <span style={{ fontSize: 10 }}>⚽{(p.goals || 0) > 1 ? `×${p.goals}` : ''}</span>}
                    {p.subIn && <span style={{ fontSize: 9, color: 'var(--green)' }}>▲</span>}
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
                        <span style={{ color: 'var(--text3)', fontSize: 9, marginLeft: 4 }}>→ {p.replacedBy}</span>
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
                          background: 'var(--bg3)', padding: '2px 6px', borderRadius: 3,
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
          <div style={{ fontSize: 9, color: 'var(--text3)', letterSpacing: 1.5, fontWeight: 700, marginBottom: 6 }}>
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
