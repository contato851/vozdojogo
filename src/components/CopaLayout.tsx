import { useLocation } from 'react-router-dom';
import TopBar from './TopBar';
import GraceBanner from './GraceBanner';
import NotesScreen from './NotesScreen';
import LiveScreen from './LiveScreen';
import CopaMatchPicker from './copa/CopaMatchPicker';

export default function CopaLayout() {
  const location = useLocation();
  const path = location.pathname;

  let content;
  if (path === '/notas') content = <NotesScreen />;
  else if (path === '/ao-vivo') content = <LiveScreen />;
  else content = <CopaMatchPicker />;

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '16px 20px', minHeight: '100vh' }}>
      <TopBar />
      <GraceBanner />
      {content}
    </div>
  );
}
