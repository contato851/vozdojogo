import { useState } from 'react';
import { Sparkles, Loader2, Check } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useTeamLogo } from '../hooks/useTeamLogo';
import { supabase } from '@/integrations/supabase/client';

function NoteTeamLogo({ teamName, color, accent, size = 38 }: { teamName: string; color: string; accent: string; size?: number }) {
  const { logoUrl, loading } = useTeamLogo(teamName);
  const [err, setErr] = useState(false);

  if (logoUrl && !err) {
    return (
      <img src={logoUrl} alt={teamName} onError={() => setErr(true)}
        style={{ width: size, height: size, objectFit: 'contain', flexShrink: 0 }} />
    );
  }

  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', display: 'flex',
      alignItems: 'center', justifyContent: 'center', background: color, flexShrink: 0
    }}>
      <span style={{ fontSize: size * 0.45, fontWeight: 700, fontFamily: 'var(--font-head)', color: accent }}>
        {loading ? '…' : (teamName || 'T').charAt(0)}
      </span>
    </div>
  );
}

export default function NotesScreen() {
  const { match, setMatch, isDemo } = useApp();
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  const updateCuriosities = (tk: 'teamA' | 'teamB', value: string) => {
    setMatch(m => ({ ...m, [tk]: { ...m[tk], curiosities: value } }));
  };

  const updateGeneralNotes = (value: string) => {
    setMatch(m => ({ ...m, generalNotes: value }));
  };

  const teamASelected = match.teamA.name && match.teamA.name !== 'TIME A';
  const teamBSelected = match.teamB.name && match.teamB.name !== 'TIME B';
  const canGenerate = teamASelected && teamBSelected && !match.aiNotesGenerated;

  const handleGenerate = async () => {
    setGenerating(true);
    setGenError(null);
    try {
      const { data, error } = await supabase.functions.invoke('generate-match-notes', {
        body: {
          teamA: match.teamA.name,
          teamB: match.teamB.name,
          competition: match.competition,
          round: match.round,
          matchDate: match.matchDate,
        },
      });
      if (error) {
        // supabase-js only gives a generic "non-2xx status code" message here --
        // the actual friendly message (daily limit, missing key, etc.) is in
        // the response body, reachable via error.context.
        let serverMessage: string | null = null;
        try {
          const body = await error.context?.json?.();
          serverMessage = body?.error ?? null;
        } catch { /* body wasn't JSON or already consumed */ }
        throw new Error(serverMessage || error.message);
      }
      if (data?.error) throw new Error(data.error);
      setMatch(m => ({
        ...m,
        aiNotesGenerated: true,
        teamA: { ...m.teamA, curiosities: data.teamA },
        teamB: { ...m.teamB, curiosities: data.teamB },
      }));
    } catch (err: any) {
      setGenError(err?.message || 'Não foi possível gerar as curiosidades. Tente novamente.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div style={{ animation: 'fadeUp .3s ease-out' }}>
      <div style={{ textAlign: 'center', marginBottom: 14 }}>
        <span style={{ fontSize: 12, color: 'var(--text3)' }}>
          Anote curiosidades para consultar durante a transmissão ao vivo.
        </span>
      </div>

      {!isDemo && teamASelected && teamBSelected && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, marginBottom: 14 }}>
          <button
            onClick={handleGenerate}
            disabled={generating || !canGenerate}
            className={canGenerate ? 'btn-green' : 'btn-ghost'}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '10px 22px', fontSize: 13,
              letterSpacing: 0.5, opacity: !canGenerate && !generating ? 0.6 : 1,
              cursor: generating ? 'wait' : canGenerate ? 'pointer' : 'default'
            }}
          >
            {generating ? <><Loader2 size={14} className="animate-spin" /> Pesquisando e gerando...</>
              : match.aiNotesGenerated ? <><Check size={14} /> Curiosidades geradas por IA</>
              : <><Sparkles size={14} /> Gerar curiosidades com IA</>}
          </button>
          <span style={{ fontSize: 9, color: 'var(--text3)' }}>
            {match.aiNotesGenerated ? 'Uma geração por partida — edite os textos livremente abaixo.' : 'Pesquisa o confronto na web e preenche os dois times de uma vez.'}
          </span>
          {match.aiNotesGenerated && (
            <span style={{ fontSize: 9, color: 'var(--text2)' }}>
              Gerado por IA — confira as informações antes de usar ao vivo.
            </span>
          )}
          {genError && <span style={{ fontSize: 11, color: 'var(--red)' }}>{genError}</span>}
        </div>
      )}
      {isDemo && (
        <div style={{ textAlign: 'center', marginBottom: 14, fontSize: 10, color: 'var(--text3)' }}>
          Geração de curiosidades com IA disponível na versão completa.
        </div>
      )}

      <div style={{
        background: 'var(--bg2)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius)', padding: 20, marginBottom: 14
      }}>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 2 }}>Observações Gerais</div>
        <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 12 }}>Não ligadas a um time específico — pauta, patrocinador, árbitro, etc.</div>
        <textarea
          value={match.generalNotes || ''}
          onChange={e => updateGeneralNotes(e.target.value)}
          placeholder="• Árbitro estreante na competição&#10;• Pauta do patrocinador aos 15min&#10;• Clássico regional, rivalidade histórica"
          style={{
            background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
            padding: 12, color: 'var(--text)', fontSize: 13, width: '100%', outline: 'none',
            fontFamily: 'var(--font-body)', lineHeight: 1.8, resize: 'vertical', minHeight: 100
          }}
        />
      </div>

      <div style={{ display: 'flex', gap: 14 }}>
        {(['teamA', 'teamB'] as const).map(tk => {
          const t = match[tk];
          return (
            <div key={tk} style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                background: 'var(--bg2)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius)', padding: 20,
                borderTop: `3px solid ${t.color}`
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <NoteTeamLogo teamName={t.name} color={t.color} accent={t.accent} size={38} />
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>{t.name || 'TIME'}</div>
                    <div style={{ fontSize: 10, color: 'var(--text3)' }}>Curiosidades e anotações</div>
                  </div>
                </div>
                <textarea
                  value={t.curiosities}
                  onChange={e => updateCuriosities(tk, e.target.value)}
                  placeholder="• Invicto há 5 jogos&#10;• Artilheiro: João com 8 gols&#10;• Não perde em casa desde março"
                  style={{
                    background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
                    padding: 12, color: 'var(--text)', fontSize: 13, width: '100%', outline: 'none',
                    fontFamily: 'var(--font-body)', lineHeight: 1.8, resize: 'vertical', minHeight: 250
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
