import { useState, useEffect } from 'react';
import { TEAMS_DB, SELECOES } from '../data/teams';
import { TeamDBEntry } from '../data/types';
import { prefetchLogos } from '../hooks/useTeamLogo';
import TeamLogo from './TeamLogo';

interface TeamPickerProps {
  onSelect: (team: { name: string; color: string; accent: string }) => void;
  onClose: () => void;
}

export default function TeamPicker({ onSelect, onClose }: TeamPickerProps) {
  const [mode, setMode] = useState<'time' | 'selecao'>('time');
  const [selectedState, setSelectedState] = useState('');

  const states = Object.keys(TEAMS_DB).sort((a, b) => TEAMS_DB[a].state.localeCompare(TEAMS_DB[b].state));

  let teams: TeamDBEntry[] = [];
  if (mode === 'selecao') {
    teams = SELECOES;
  } else if (selectedState) {
    teams = TEAMS_DB[selectedState]?.teams || [];
  } else {
    states.forEach(k => teams.push(...TEAMS_DB[k].teams));
  }

  const isNationalTeam = mode === 'selecao';

  // Prefetch logos for visible teams
  useEffect(() => {
    prefetchLogos(teams.map(t => t.name), isNationalTeam);
  }, [teams.length, isNationalTeam]);

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
            <TogBtn active={mode === 'time'} onClick={() => { setMode('time'); setSelectedState(''); }}>⚽ Time</TogBtn>
            <TogBtn active={mode === 'selecao'} onClick={() => setMode('selecao')}>🏳️ Seleção</TogBtn>
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

        {/* Grid */}
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
