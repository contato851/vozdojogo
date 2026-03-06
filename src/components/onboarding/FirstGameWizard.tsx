import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '../../context/AuthContext';
import { useOnboarding } from '../../context/OnboardingContext';
import { newMatchData, saveMatches } from '../../data/store';
import Logo from '../Logo';
import ProgressBar from './ProgressBar';
import TeamPicker from '../TeamPicker';

interface SelectedTeam {
  name: string;
  color: string;
  accent: string;
}

export default function FirstGameWizard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { clearOnboarding } = useOnboarding();

  const [wizardStep, setWizardStep] = useState(1);
  const [teamA, setTeamA] = useState<SelectedTeam | null>(null);
  const [teamB, setTeamB] = useState<SelectedTeam | null>(null);
  const [stadium, setStadium] = useState('');
  const [referee, setReferee] = useState('');
  const [showExtra, setShowExtra] = useState(false);
  const [assistant1, setAssistant1] = useState('');
  const [assistant2, setAssistant2] = useState('');
  const [varRef, setVarRef] = useState('');
  const [reporter, setReporter] = useState('');
  const [commentators, setCommentators] = useState('');
  const [showPicker, setShowPicker] = useState(false);

  const handleSelectTeam = (team: SelectedTeam) => {
    if (wizardStep === 1) {
      setTeamA(team);
    } else {
      setTeamB(team);
    }
    setShowPicker(false);
  };

  const handleFinish = async () => {
    const match = newMatchData();
    if (teamA) {
      match.teamA = { ...match.teamA, name: teamA.name, color: teamA.color, accent: teamA.accent };
    }
    if (teamB) {
      match.teamB = { ...match.teamB, name: teamB.name, color: teamB.color, accent: teamB.accent };
    }
    match.stadium = stadium;
    match.referee = referee;
    match.assistant1 = assistant1;
    match.assistant2 = assistant2;
    match.var_ref = varRef;
    match.reporter = reporter;
    match.commentators = commentators;

    saveMatches([match]);

    // Mark onboarding completed
    if (user) {
      await supabase.from('user_profiles').update({ onboarding_completed: true }).eq('user_id', user.id);
    }

    clearOnboarding();
    navigate('/escalacao');
  };

  const currentTeam = wizardStep === 1 ? teamA : teamB;
  const stepTitles = ['Escolha o Time da Casa', 'Escolha o Time Visitante', 'Informações da Partida'];

  const inputStyle = {
    width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)',
    borderRadius: 8, padding: '12px 16px', color: 'var(--text)',
    fontSize: 14, fontFamily: 'var(--font-body)', outline: 'none',
    transition: 'border-color .3s'
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '40px 20px', animation: 'fadeUp .3s ease-out'
    }}>
      <div style={{ maxWidth: 600, width: '100%' }}>
        {/* Logo */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
          <Logo size="sm" />
        </div>

        <h2 style={{
          fontFamily: 'var(--font-head)', fontSize: 28, fontWeight: 700,
          color: 'var(--text)', letterSpacing: 1, marginBottom: 8, textAlign: 'center'
        }}>
          Vamos configurar seu primeiro jogo!
        </h2>
        <p style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 24, textAlign: 'center' }}>
          Em 3 passos rápidos você estará pronto para narrar.
        </p>

        <ProgressBar total={3} current={wizardStep - 1} />
        <p style={{ fontSize: 11, color: 'var(--text3)', textAlign: 'center', marginBottom: 28, letterSpacing: 1 }}>
          Passo {wizardStep} de 3
        </p>

        <h3 style={{
          fontFamily: 'var(--font-head)', fontSize: 22, fontWeight: 600,
          color: 'var(--green)', letterSpacing: 1, marginBottom: 20, textAlign: 'center'
        }}>
          {stepTitles[wizardStep - 1]}
        </h3>

        {/* Steps 1 & 2: Team selection */}
        {(wizardStep === 1 || wizardStep === 2) && (
          <div style={{ animation: 'slideLeft .3s ease-out' }}>
            {currentTeam ? (
              <div style={{
                background: 'var(--bg2)', border: '1px solid var(--border)',
                borderRadius: 12, padding: 24, textAlign: 'center', marginBottom: 24
              }}>
                <div style={{
                  width: 64, height: 64, borderRadius: '50%',
                  background: currentTeam.color, border: `3px solid ${currentTeam.accent}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 12px', fontSize: 24, fontWeight: 700,
                  fontFamily: 'var(--font-head)', color: currentTeam.accent,
                  letterSpacing: 1
                }}>
                  {currentTeam.name.substring(0, 3).toUpperCase()}
                </div>
                <div style={{
                  fontFamily: 'var(--font-head)', fontSize: 24, fontWeight: 700,
                  color: 'var(--text)', letterSpacing: 1, marginBottom: 8
                }}>
                  {currentTeam.name}
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 12 }}>
                  <div style={{ width: 24, height: 24, borderRadius: 4, background: currentTeam.color, border: '1px solid var(--border2)' }} />
                  <div style={{ width: 24, height: 24, borderRadius: 4, background: currentTeam.accent, border: '1px solid var(--border2)' }} />
                </div>
                <button
                  onClick={() => setShowPicker(true)}
                  style={{
                    background: 'var(--bg3)', border: '1px solid var(--border2)',
                    borderRadius: 6, padding: '8px 20px', color: 'var(--text2)',
                    fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-body)'
                  }}
                >
                  Trocar time
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowPicker(true)}
                style={{
                  width: '100%', padding: '32px 20px', background: 'var(--bg2)',
                  border: '2px dashed var(--border2)', borderRadius: 12, cursor: 'pointer',
                  color: 'var(--text2)', fontSize: 16, fontFamily: 'var(--font-body)',
                  marginBottom: 24, transition: 'all .2s', display: 'flex',
                  flexDirection: 'column', alignItems: 'center', gap: 8
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--green)'; e.currentTarget.style.color = 'var(--green)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.color = 'var(--text2)'; }}
              >
                <span style={{ fontSize: 32 }}>⚽</span>
                Selecionar Time
              </button>
            )}

            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              {wizardStep === 2 && (
                <button
                  onClick={() => setWizardStep(1)}
                  style={{
                    background: 'none', border: 'none', color: 'var(--text3)',
                    fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-body)',
                    textDecoration: 'underline'
                  }}
                >
                  ← Voltar
                </button>
              )}
              <button
                onClick={() => setWizardStep(wizardStep + 1)}
                disabled={!currentTeam}
                style={{
                  flex: 1, padding: 14,
                  background: currentTeam ? 'var(--green)' : 'var(--bg3)',
                  color: currentTeam ? 'var(--bg)' : 'var(--text3)',
                  fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-head)',
                  border: 'none', borderRadius: 8,
                  cursor: currentTeam ? 'pointer' : 'not-allowed',
                  letterSpacing: 2, transition: 'all .2s'
                }}
              >
                PRÓXIMO →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Match info */}
        {wizardStep === 3 && (
          <div style={{ animation: 'slideLeft .3s ease-out' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text3)', letterSpacing: 1, display: 'block', marginBottom: 4 }}>ESTÁDIO</label>
                <input
                  type="text" placeholder="Nome do estádio" value={stadium}
                  onChange={e => setStadium(e.target.value)} style={inputStyle}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text3)', letterSpacing: 1, display: 'block', marginBottom: 4 }}>ÁRBITRO</label>
                <input
                  type="text" placeholder="Nome do árbitro" value={referee}
                  onChange={e => setReferee(e.target.value)} style={inputStyle}
                />
              </div>

              <button
                onClick={() => setShowExtra(!showExtra)}
                style={{
                  background: 'none', border: 'none', color: 'var(--text3)',
                  fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-body)',
                  textDecoration: 'underline', textAlign: 'left', padding: '4px 0'
                }}
              >
                {showExtra ? '▼ Menos informações' : '▶ Mais informações'}
              </button>

              {showExtra && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, animation: 'fadeUp .2s ease-out' }}>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--text3)', letterSpacing: 1, display: 'block', marginBottom: 4 }}>ASSISTENTE 1</label>
                    <input type="text" placeholder="Assistente 1" value={assistant1} onChange={e => setAssistant1(e.target.value)} style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--text3)', letterSpacing: 1, display: 'block', marginBottom: 4 }}>ASSISTENTE 2</label>
                    <input type="text" placeholder="Assistente 2" value={assistant2} onChange={e => setAssistant2(e.target.value)} style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--text3)', letterSpacing: 1, display: 'block', marginBottom: 4 }}>VAR</label>
                    <input type="text" placeholder="Árbitro de vídeo" value={varRef} onChange={e => setVarRef(e.target.value)} style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--text3)', letterSpacing: 1, display: 'block', marginBottom: 4 }}>REPORTAGEM</label>
                    <input type="text" placeholder="Repórter" value={reporter} onChange={e => setReporter(e.target.value)} style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--text3)', letterSpacing: 1, display: 'block', marginBottom: 4 }}>COMENTÁRIOS</label>
                    <input type="text" placeholder="Comentaristas" value={commentators} onChange={e => setCommentators(e.target.value)} style={inputStyle} />
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <button
                onClick={() => setWizardStep(2)}
                style={{
                  background: 'none', border: 'none', color: 'var(--text3)',
                  fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-body)',
                  textDecoration: 'underline'
                }}
              >
                ← Voltar
              </button>
              <button
                onClick={handleFinish}
                style={{
                  flex: 1, padding: 14, background: 'var(--green)',
                  color: 'var(--bg)', fontSize: 18, fontWeight: 700,
                  fontFamily: 'var(--font-head)', border: 'none', borderRadius: 8,
                  cursor: 'pointer', letterSpacing: 2, transition: 'all .2s'
                }}
                onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.15)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.filter = 'none'; e.currentTarget.style.transform = 'none'; }}
              >
                CRIAR JOGO E COMEÇAR 🎙️
              </button>
            </div>
          </div>
        )}

        {showPicker && (
          <TeamPicker
            onSelect={handleSelectTeam}
            onClose={() => setShowPicker(false)}
          />
        )}
      </div>
    </div>
  );
}
