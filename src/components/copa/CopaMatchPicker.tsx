import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import {
  COPA_TEAMS, COPA_FIXTURES, COPA_GROUPS, getCopaTeamById,
  type CopaTeam, type CopaFixture, type CopaPlayer,
} from '../../data/worldCup2026';
import { genId } from '../../data/store';
import { Player, Team } from '../../data/types';

type Tab = 'fixtures' | 'teams';

function copaPlayersToPlayers(arr: CopaPlayer[], prefix: string): Player[] {
  return arr.map((p, i) => ({
    id: `${prefix}-${i}-${genId()}`,
    number: p.number,
    name: p.name,
  }));
}

function copaTeamToTeam(t: CopaTeam, side: 'a' | 'b'): Team {
  return {
    name: t.name.toUpperCase(),
    coach: t.coach,
    color: t.color,
    accent: t.accent,
    formation: t.formation,
    starters: copaPlayersToPlayers(t.starters, `${side}-s`),
    reserves: copaPlayersToPlayers(t.reserves, `${side}-r`),
    unlisted: [],
    curiosities: t.curiosities,
  };
}

export default function CopaMatchPicker() {
  const [tab, setTab] = useState<Tab>('fixtures');
  const [groupFilter, setGroupFilter] = useState<string>('ALL');
  const [pickedA, setPickedA] = useState<string | null>(null);
  const [pickedB, setPickedB] = useState<string | null>(null);
  const navigate = useNavigate();
  const { setMatch } = useApp();

  const loadMatch = (teamAId: string, teamBId: string) => {
    const tA = getCopaTeamById(teamAId);
    const tB = getCopaTeamById(teamBId);
    if (!tA || !tB) return;
    setMatch({
      id: genId(),
      createdAt: new Date().toISOString(),
      stadium: '', referee: '', assistant1: '', assistant2: '',
      var_ref: '', reporter: '', commentators: '',
      sortOrder: 'number',
      teamA: copaTeamToTeam(tA, 'a'),
      teamB: copaTeamToTeam(tB, 'b'),
    });
    navigate('/escalacao');
  };

  const loadFromFixture = (f: CopaFixture) => {
    const tA = getCopaTeamById(f.teamA);
    const tB = getCopaTeamById(f.teamB);
    if (!tA || !tB) return;
    setMatch({
      id: genId(),
      createdAt: new Date().toISOString(),
      stadium: `${f.stadium} — ${f.city}, ${f.country}`,
      referee: '', assistant1: '', assistant2: '',
      var_ref: '', reporter: '', commentators: '',
      sortOrder: 'number',
      teamA: copaTeamToTeam(tA, 'a'),
      teamB: copaTeamToTeam(tB, 'b'),
    });
    navigate('/escalacao');
  };

  const filteredFixtures = useMemo(() => {
    return groupFilter === 'ALL'
      ? COPA_FIXTURES
      : COPA_FIXTURES.filter(f => f.group === groupFilter);
  }, [groupFilter]);

  const teamsByGroup = useMemo(() => {
    const map: Record<string, CopaTeam[]> = {};
    COPA_GROUPS.forEach(g => { map[g] = COPA_TEAMS.filter(t => t.group === g); });
    return map;
  }, []);

  return (
    <div style={{ fontFamily: 'var(--font-body)', color: 'var(--text)' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20,
      }}>
        <span style={{ fontSize: 32 }}>🏆</span>
        <div>
          <h1 style={{
            margin: 0, fontFamily: 'var(--font-head)', fontSize: 28,
            letterSpacing: 2, color: '#d4af37',
          }}>
            COPA DO MUNDO 2026
          </h1>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--text3)' }}>
            EUA · Canadá · México — 11/jun a 19/jul
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
        <TabBtn active={tab === 'fixtures'} onClick={() => setTab('fixtures')}>📅 Jogos da Copa</TabBtn>
        <TabBtn active={tab === 'teams'} onClick={() => setTab('teams')}>🌍 Escolher Times</TabBtn>
      </div>

      {tab === 'fixtures' && (
        <FixturesView
          fixtures={filteredFixtures}
          groupFilter={groupFilter}
          setGroupFilter={setGroupFilter}
          onPick={loadFromFixture}
        />
      )}

      {tab === 'teams' && (
        <TeamsView
          teamsByGroup={teamsByGroup}
          pickedA={pickedA}
          pickedB={pickedB}
          onPick={(id) => {
            if (pickedA === id) { setPickedA(null); return; }
            if (pickedB === id) { setPickedB(null); return; }
            if (!pickedA) setPickedA(id);
            else if (!pickedB) setPickedB(id);
          }}
          onConfirm={() => pickedA && pickedB && loadMatch(pickedA, pickedB)}
          onClear={() => { setPickedA(null); setPickedB(null); }}
        />
      )}
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'none', border: 'none',
        borderBottom: `2px solid ${active ? '#d4af37' : 'transparent'}`,
        color: active ? '#d4af37' : 'var(--text2)',
        fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600,
        letterSpacing: 1, padding: '10px 16px', cursor: 'pointer',
        transition: 'all .2s',
      }}
    >
      {children}
    </button>
  );
}

function FixturesView({
  fixtures, groupFilter, setGroupFilter, onPick,
}: {
  fixtures: CopaFixture[];
  groupFilter: string;
  setGroupFilter: (g: string) => void;
  onPick: (f: CopaFixture) => void;
}) {
  const grouped = useMemo(() => {
    const map: Record<string, CopaFixture[]> = {};
    fixtures.forEach(f => {
      if (!map[f.group]) map[f.group] = [];
      map[f.group].push(f);
    });
    return map;
  }, [fixtures]);

  return (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
        <FilterChip active={groupFilter === 'ALL'} onClick={() => setGroupFilter('ALL')}>Todos</FilterChip>
        {COPA_GROUPS.map(g => (
          <FilterChip key={g} active={groupFilter === g} onClick={() => setGroupFilter(g)}>
            Grupo {g}
          </FilterChip>
        ))}
      </div>

      {Object.keys(grouped).sort().map(g => (
        <div key={g} style={{ marginBottom: 24 }}>
          <h3 style={{
            fontFamily: 'var(--font-head)', fontSize: 18, letterSpacing: 2,
            color: '#d4af37', borderBottom: '1px solid var(--border)',
            paddingBottom: 6, marginBottom: 10,
          }}>GRUPO {g}</h3>

          <div style={{ display: 'grid', gap: 8 }}>
            {grouped[g].map(f => {
              const tA = getCopaTeamById(f.teamA);
              const tB = getCopaTeamById(f.teamB);
              if (!tA || !tB) return null;
              return (
                <button
                  key={f.id}
                  onClick={() => onPick(f)}
                  style={{
                    background: 'var(--bg2)', border: '1px solid var(--border)',
                    borderRadius: 6, padding: '12px 14px', cursor: 'pointer',
                    display: 'grid', gridTemplateColumns: '60px 1fr auto', gap: 12,
                    alignItems: 'center', color: 'var(--text)',
                    fontFamily: 'var(--font-body)', textAlign: 'left',
                    transition: 'all .2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#d4af37'; e.currentTarget.style.background = 'var(--bg3)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg2)'; }}
                >
                  <div style={{ fontSize: 10, color: 'var(--text3)' }}>
                    Rodada {f.matchday}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 22 }}>{tA.flag}</span>
                    <strong style={{ fontSize: 14 }}>{tA.name}</strong>
                    <span style={{ color: 'var(--text3)', fontSize: 11 }}>×</span>
                    <strong style={{ fontSize: 14 }}>{tB.name}</strong>
                    <span style={{ fontSize: 22 }}>{tB.flag}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text2)', textAlign: 'right' }}>
                    <div>{formatDate(f.date)} · {f.time}</div>
                    <div style={{ color: 'var(--text3)' }}>{f.city}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </>
  );
}

function TeamsView({
  teamsByGroup, pickedA, pickedB, onPick, onConfirm, onClear,
}: {
  teamsByGroup: Record<string, CopaTeam[]>;
  pickedA: string | null;
  pickedB: string | null;
  onPick: (id: string) => void;
  onConfirm: () => void;
  onClear: () => void;
}) {
  const tA = pickedA ? getCopaTeamById(pickedA) : null;
  const tB = pickedB ? getCopaTeamById(pickedB) : null;

  return (
    <>
      <div style={{
        position: 'sticky', top: 0, background: 'var(--bg)',
        padding: '8px 0', marginBottom: 12, zIndex: 5,
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
      }}>
        <div style={{ flex: 1, minWidth: 200, fontSize: 13 }}>
          <strong style={{ color: '#3b82f6' }}>Time A:</strong>{' '}
          {tA ? `${tA.flag} ${tA.name}` : <span style={{ color: 'var(--text3)' }}>selecione um time</span>}
          <span style={{ margin: '0 12px', color: 'var(--text3)' }}>×</span>
          <strong style={{ color: '#ef4444' }}>Time B:</strong>{' '}
          {tB ? `${tB.flag} ${tB.name}` : <span style={{ color: 'var(--text3)' }}>selecione um time</span>}
        </div>
        <button
          onClick={onClear}
          disabled={!pickedA && !pickedB}
          style={{
            background: 'none', border: '1px solid var(--border)',
            color: 'var(--text2)', fontSize: 11, padding: '6px 12px',
            borderRadius: 4, cursor: pickedA || pickedB ? 'pointer' : 'not-allowed',
            opacity: pickedA || pickedB ? 1 : 0.4, fontFamily: 'var(--font-body)',
          }}
        >Limpar</button>
        <button
          onClick={onConfirm}
          disabled={!pickedA || !pickedB}
          style={{
            background: pickedA && pickedB ? '#d4af37' : 'var(--bg3)',
            border: 'none', color: pickedA && pickedB ? '#000' : 'var(--text3)',
            fontSize: 12, fontWeight: 700, letterSpacing: 1,
            padding: '8px 18px', borderRadius: 4,
            cursor: pickedA && pickedB ? 'pointer' : 'not-allowed',
            fontFamily: 'var(--font-body)',
          }}
        >NARRAR ESTA PARTIDA</button>
      </div>

      {COPA_GROUPS.map(g => (
        <div key={g} style={{ marginBottom: 20 }}>
          <h3 style={{
            fontFamily: 'var(--font-head)', fontSize: 16, letterSpacing: 2,
            color: '#d4af37', marginBottom: 8,
          }}>GRUPO {g}</h3>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8,
          }}>
            {teamsByGroup[g].map(t => {
              const isA = pickedA === t.id;
              const isB = pickedB === t.id;
              const borderColor = isA ? '#3b82f6' : isB ? '#ef4444' : 'var(--border)';
              return (
                <button
                  key={t.id}
                  onClick={() => onPick(t.id)}
                  style={{
                    background: 'var(--bg2)', border: `2px solid ${borderColor}`,
                    borderRadius: 8, padding: '14px 8px', cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    gap: 6, color: 'var(--text)', fontFamily: 'var(--font-body)',
                    transition: 'all .15s',
                  }}
                  onMouseEnter={e => { if (!isA && !isB) e.currentTarget.style.borderColor = '#d4af37'; }}
                  onMouseLeave={e => { if (!isA && !isB) e.currentTarget.style.borderColor = 'var(--border)'; }}
                >
                  <span style={{ fontSize: 36, lineHeight: 1 }}>{t.flag}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, textAlign: 'center' }}>{t.name}</span>
                  <span style={{ fontSize: 9, color: 'var(--text3)', letterSpacing: 1 }}>GRUPO {t.group}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? '#d4af37' : 'var(--bg3)',
        color: active ? '#000' : 'var(--text2)',
        border: `1px solid ${active ? '#d4af37' : 'var(--border)'}`,
        fontSize: 11, fontWeight: 600, letterSpacing: 1,
        padding: '5px 10px', borderRadius: 4, cursor: 'pointer',
        fontFamily: 'var(--font-body)',
      }}
    >{children}</button>
  );
}

function formatDate(iso: string) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y.slice(2)}`;
}
