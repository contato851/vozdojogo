import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import TopBar from './TopBar';
import GraceBanner from './GraceBanner';
import NotesScreen from './NotesScreen';
import LiveScreen from './LiveScreen';
import SetupScreen from './SetupScreen';
import CopaMatchPicker from './copa/CopaMatchPicker';
import { useApp } from '../context/AppContext';

export default function CopaLayout() {
  const location = useLocation();
  const path = location.pathname;
  const { match } = useApp();

  // Show picker until a Copa match is loaded (i.e., team names differ from defaults).
  // Once loaded, show the regular SetupScreen so the user can edit lineups.
  const hasMatchLoaded =
    match.teamA.name !== 'TIME A' && match.teamB.name !== 'TIME B';

  const [showPicker, setShowPicker] = useState(!hasMatchLoaded);

  // When the match changes (user picked a new game), close the picker.
  useEffect(() => {
    if (hasMatchLoaded) setShowPicker(false);
  }, [match.id, hasMatchLoaded]);

  let content;
  if (path === '/notas') content = <NotesScreen />;
  else if (path === '/ao-vivo') content = <LiveScreen />;
  else if (showPicker || !hasMatchLoaded) content = <CopaMatchPicker />;
  else content = (
    <>
      <div style={{
        display: 'flex', justifyContent: 'flex-end', marginBottom: 12,
      }}>
        <button
          onClick={() => setShowPicker(true)}
          style={{
            background: 'rgba(212,175,55,0.12)',
            border: '1px solid rgba(212,175,55,0.5)',
            color: '#d4af37', fontSize: 11, fontWeight: 700, letterSpacing: 1,
            padding: '6px 14px', borderRadius: 4, cursor: 'pointer',
            fontFamily: 'var(--font-body)',
          }}
        >
          🏆 Trocar partida da Copa
        </button>
      </div>
      <SetupScreen />
    </>
  );

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '16px 20px', minHeight: '100vh' }}>
      <TopBar />
      <GraceBanner />
      {content}
    </div>
  );
}
