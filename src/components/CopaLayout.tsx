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
  else content = <SetupScreen onChangeMatch={() => setShowPicker(true)} />;

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '16px 20px', minHeight: '100vh' }}>
      <TopBar />
      <GraceBanner />
      {content}
    </div>
  );
}
