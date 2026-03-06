import { useState, useEffect } from 'react';
import { TEAMS_DB, SELECOES } from '../data/teams';
import { TeamDBEntry } from '../data/types';
import { prefetchLogos } from '../hooks/useTeamLogo';
import { useCustomTeams, CustomTeam } from '../hooks/useCustomTeams';
import TeamLogo from './TeamLogo';
import CustomTeamEditor from './CustomTeamEditor';

interface TeamPickerProps {
  onSelect: (team: { name: string; color: string; accent: string; customPlayers?: { number: string; name: string }[] }) => void;
  onClose: () => void;
}

export default function TeamPicker({ onSelect, onClose }: TeamPickerProps) {
  const [mode, setMode] = useState<'time' | 'selecao' | 'meus'>('time');
  const [selectedState, setSelectedState] = useState('');
  const [editing, setEditing] = useState<CustomTeam | 'new' | null>(null);
  const { teams: customTeams, loading: loadingCustom, saveTeam, deleteTeam } = useCustomTeams();

  const states = Object.keys(TEAMS_DB).sort((a, b) => TEAMS_DB[a].state.localeCompare(TEAMS_DB[b].state));

  let teams: TeamDBEntry[] = [];
  if (mode === 'selecao') {
    teams = SELECOES;
  } else if (mode === 'time') {
    if (selectedState) {
      teams = TEAMS_DB[selectedState]?.teams || [];
    } else {
      states.forEach(k => teams.push(...TEAMS_DB[k].teams));
    }
  }

  const isNationalTeam = mode === 'selecao';

  useEffect(() => {
    if (mode !== 'meus') {
      prefetchLogos(teams.map(t => t.name), isNationalTeam);
    }
  }, [teams.length, isNationalTeam, mode]);

  const handleSaveCustom = async (team: any) => {
    await saveTeam(team);
    setEditing(null);
  };

  const handleSelectCustom = (ct: CustomTeam) => {
    onSelect({
      name: ct.name,
      color: ct.color,
      accent: ct.accent,
      customPlayers: ct.players,
    });
  };

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 2000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'fadeUp .2s'
      }}
    >
      <div style={{
        background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 12,
        width: '90%', maxWidth: 600, maxHeight: '85vh', display: 'flex',
        flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <span style={{
            fontFamily: 'var(--font-head)', fontSize: 22, fontWeight: 600,
            color: 'var(--green)', letterSpacing: 1
          }}>Selecionar Time</span>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: 'var(--text3)', fontSize: 22,
            cursor: 'pointer', padding: '4px 8px', borderRadius: 4
          }}>✕</button>
        </div>

        {/* Filters */}
        <div style={{
          padding: '12px 20px', borderBottom: '1px solid var(--border)',
          display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center'
        }}>
          <div style={{ display: 'flex', gap: 0, borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border)' }}>
            <TogBtn active={mode === 'time'} onClick={() => { setMode('time'); setSelectedState(''); setEditing(null); }}>⚽ Time</TogBtn>
            <TogBtn active={mode === 'selecao'} onClick={() => { setMode('selecao'); setEditing(null); }}>🏳️ Seleção</TogBtn>
            <TogBtn active={mode === 'meus'} onClick={() => { setMode('meus'); setEditing(null); }}>⭐ Meus Times</TogBtn>
          </div>
          {mode === 'time' && (
            <div style={{ flex: 1, minWidth: 140 }}>
              <select
                value={selectedState}
                onChange={e => setSelectedState(e.target.value)}
                style={{
                  background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 6,
                  padding: '6px 10px', color: 'var(--text)', fontSize: 12,
                  fontFamily: 'var(--font-body)', outline: 'none', cursor: 'pointer', width: '100%'
                }}
              >
                <option value="">Todos os estados</option>
                {states.map(k => (
                  <option key={k} value={k}>{TEAMS_DB[k].state} ({k})</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Content */}
        {mode === 'meus' && editing ? (
          <CustomTeamEditor
            team={editing === 'new' ? undefined : editing}
            onSave={handleSaveCustom}
            onCancel={() => setEditing(null)}
          />
        ) : mode === 'meus' ? (
          <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1 }}>
            <button onClick={() => setEditing('new')} style={{
              width: '100%', padding: '14px', borderRadius: 8, border: '2px dashed var(--green)',
              background: 'var(--green-dim)', color: 'var(--green)', fontSize: 14, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'var(--font-head)', letterSpacing: 1,
              marginBottom: 16, transition: 'all .2s'
            }}>
              + CRIAR NOVO TIME
            </button>

            {loadingCustom ? (
              <div style={{ textAlign: 'center', padding: 30, color: 'var(--text3)', fontSize: 13 }}>
                Carregando...
              </div>
            ) : customTeams.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 30, color: 'var(--text3)', fontSize: 13 }}>
                Nenhum time personalizado cadastrado.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {customTeams.map(ct => (
                  <div key={ct.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                    background: 'var(--bg3)', borderRadius: 8, border: '1px solid var(--border)',
                    transition: 'all .15s'
                  }}>
                    {/* Team color swatch / logo */}
                    <div style={{
                      width: 44, height: 44, borderRadius: 8, flexShrink: 0,
                      background: ct.logo_url ? 'transparent' : ct.color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: '1px solid var(--border2)', overflow: 'hidden'
                    }}>
                      {ct.logo_url ? (
                        <img src={ct.logo_url} alt={ct.name}
                          style={{ width: 40, height: 40, objectFit: 'contain' }}
                          onError={e => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.parentElement!.style.background = ct.color;
                          }}
                        />
                      ) : (
                        <span style={{ fontSize: 14, fontWeight: 700, color: ct.accent, fontFamily: 'var(--font-head)' }}>
                          {ct.abbreviation || ct.name.substring(0, 3)}
                        </span>
                      )}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-head)', letterSpacing: 0.5 }}>
                        {ct.name}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                        {ct.players.length} jogador{ct.players.length !== 1 ? 'es' : ''}
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 6 }}>
                      <ActionBtn onClick={() => handleSelectCustom(ct)} color="var(--green)" title="Selecionar">✓</ActionBtn>
                      <ActionBtn onClick={() => setEditing(ct)} color="var(--gold)" title="Editar">✎</ActionBtn>
                      <ActionBtn onClick={() => { if (confirm('Excluir este time?')) deleteTeam(ct.id); }} color="var(--red)" title="Excluir">✕</ActionBtn>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Standard team grid */
          <div style={{
            padding: '16px 20px', overflowY: 'auto', flex: 1,
            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))',
            gap: 10, alignContent: 'start'
          }}>
            {teams.length === 0 ? (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 30, color: 'var(--text3)', fontSize: 13 }}>
                Nenhum time encontrado.
              </div>
            ) : teams.map((t, i) => (
              <div
                key={`${t.s}-${i}`}
                onClick={() => onSelect({ name: t.name, color: t.color, accent: t.accent })}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  cursor: 'pointer', padding: '8px 4px', borderRadius: 8,
                  border: '1px solid transparent', transition: 'all .15s'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'var(--bg3)';
                  e.currentTarget.style.borderColor = 'var(--border2)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.borderColor = 'transparent';
                }}
              >
                <TeamLogo team={t} isNationalTeam={isNationalTeam} size={48} />
                <div style={{
                  fontSize: 9, fontWeight: 600, color: 'var(--text2)', textAlign: 'center',
                  lineHeight: 1.2, maxWidth: 85, overflow: 'hidden', textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {t.name}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TogBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      padding: '6px 14px', fontSize: 11, fontWeight: 700, letterSpacing: 0.5,
      cursor: 'pointer', background: active ? 'var(--green-dim)' : 'var(--bg3)',
      color: active ? 'var(--green)' : 'var(--text3)', border: 'none',
      fontFamily: 'var(--font-body)', transition: 'all .15s'
    }}>
      {children}
    </button>
  );
}

function ActionBtn({ onClick, color, title, children }: { onClick: () => void; color: string; title: string; children: React.ReactNode }) {
  return (
    <button onClick={onClick} title={title} style={{
      width: 30, height: 30, borderRadius: 6, border: `1px solid ${color}33`,
      background: `${color}15`, color, fontSize: 14, cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      transition: 'all .15s'
    }}>
      {children}
    </button>
  );
}
