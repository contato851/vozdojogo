import { useState } from 'react';
import { CustomTeam, CustomTeamPlayer } from '@/hooks/useCustomTeams';

interface Props {
  team?: CustomTeam;
  onSave: (team: Omit<CustomTeam, 'id'> & { id?: string }) => Promise<any>;
  onCancel: () => void;
}

export default function CustomTeamEditor({ team, onSave, onCancel }: Props) {
  const [name, setName] = useState(team?.name || '');
  const [abbreviation, setAbbreviation] = useState(team?.abbreviation || '');
  const [color, setColor] = useState(team?.color || '#003399');
  const [accent, setAccent] = useState(team?.accent || '#ffffff');
  const [logoUrl, setLogoUrl] = useState(team?.logo_url || '');
  const [players, setPlayers] = useState<CustomTeamPlayer[]>(
    team?.players?.length ? team.players : [{ number: '', name: '' }]
  );
  const [saving, setSaving] = useState(false);

  const addPlayer = () => setPlayers([...players, { number: '', name: '' }]);

  const removePlayer = (idx: number) => {
    setPlayers(players.filter((_, i) => i !== idx));
  };

  const updatePlayer = (idx: number, field: 'number' | 'name', val: string) => {
    setPlayers(players.map((p, i) => i === idx ? { ...p, [field]: val } : p));
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const validPlayers = players.filter(p => p.name.trim());
    await onSave({
      id: team?.id,
      name: name.trim().toUpperCase(),
      abbreviation: abbreviation.trim().toUpperCase() || name.trim().substring(0, 3).toUpperCase(),
      color,
      accent,
      logo_url: logoUrl.trim() || null,
      players: validPlayers,
    });
    setSaving(false);
  };

  const inputStyle: React.CSSProperties = {
    background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 6,
    padding: '8px 12px', color: 'var(--text)', fontSize: 13,
    fontFamily: 'var(--font-body)', outline: 'none', width: '100%',
  };

  return (
    <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ fontSize: 16, fontFamily: 'var(--font-head)', color: 'var(--green)', letterSpacing: 1, fontWeight: 600 }}>
        {team ? 'Editar Time' : 'Novo Time'}
      </div>

      {/* Name & Abbreviation */}
      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ flex: 2 }}>
          <label style={labelStyle}>Nome do Time</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: AMIGOS FC" style={inputStyle} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Sigla</label>
          <input value={abbreviation} onChange={e => setAbbreviation(e.target.value.slice(0, 4))}
            placeholder="AFC" style={inputStyle} maxLength={4} />
        </div>
      </div>

      {/* Colors */}
      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Cor Principal</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="color" value={color} onChange={e => setColor(e.target.value)}
              style={{ width: 36, height: 36, border: 'none', background: 'none', cursor: 'pointer', padding: 0 }} />
            <span style={{ fontSize: 12, color: 'var(--text2)', fontFamily: 'var(--font-body)' }}>{color}</span>
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Cor Secundária</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="color" value={accent} onChange={e => setAccent(e.target.value)}
              style={{ width: 36, height: 36, border: 'none', background: 'none', cursor: 'pointer', padding: 0 }} />
            <span style={{ fontSize: 12, color: 'var(--text2)', fontFamily: 'var(--font-body)' }}>{accent}</span>
          </div>
        </div>
      </div>

      {/* Logo URL */}
      <div>
        <label style={labelStyle}>URL do Logo (opcional)</label>
        <input value={logoUrl} onChange={e => setLogoUrl(e.target.value)}
          placeholder="https://exemplo.com/logo.png" style={inputStyle} />
        {logoUrl && (
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <img src={logoUrl} alt="Preview" onError={e => (e.currentTarget.style.display = 'none')}
              style={{ width: 40, height: 40, objectFit: 'contain', borderRadius: 4 }} />
            <span style={{ fontSize: 11, color: 'var(--text3)' }}>Preview</span>
          </div>
        )}
      </div>

      {/* Players */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <label style={{ ...labelStyle, marginBottom: 0 }}>Elenco</label>
          <button onClick={addPlayer} style={{
            background: 'var(--green-dim)', border: '1px solid var(--green)', borderRadius: 6,
            color: 'var(--green)', fontSize: 11, fontWeight: 600, padding: '4px 12px',
            cursor: 'pointer', fontFamily: 'var(--font-body)'
          }}>+ Jogador</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 200, overflowY: 'auto' }}>
          {players.map((p, i) => (
            <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input value={p.number} onChange={e => updatePlayer(i, 'number', e.target.value)}
                placeholder="Nº" style={{ ...inputStyle, width: 50, flex: 'none', textAlign: 'center' }} maxLength={3} />
              <input value={p.name} onChange={e => updatePlayer(i, 'name', e.target.value)}
                placeholder="Nome do jogador" style={{ ...inputStyle, flex: 1 }} />
              <button onClick={() => removePlayer(i)} style={{
                background: 'none', border: 'none', color: 'var(--red)', fontSize: 16,
                cursor: 'pointer', padding: '2px 6px', opacity: 0.6
              }}>✕</button>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
        <button onClick={onCancel} style={{
          flex: 1, padding: '10px', borderRadius: 6, border: '1px solid var(--border)',
          background: 'var(--bg3)', color: 'var(--text2)', fontSize: 13, fontWeight: 600,
          cursor: 'pointer', fontFamily: 'var(--font-body)'
        }}>Cancelar</button>
        <button onClick={handleSave} disabled={saving || !name.trim()} style={{
          flex: 1, padding: '10px', borderRadius: 6, border: 'none',
          background: saving || !name.trim() ? 'var(--bg3)' : 'var(--green)',
          color: saving || !name.trim() ? 'var(--text3)' : '#000', fontSize: 13, fontWeight: 700,
          cursor: saving || !name.trim() ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-body)',
          letterSpacing: 0.5
        }}>
          {saving ? 'Salvando...' : team ? 'Salvar Alterações' : 'Criar Time'}
        </button>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: 10, fontWeight: 600, letterSpacing: 1, color: 'var(--text3)',
  fontFamily: 'var(--font-body)', textTransform: 'uppercase', display: 'block', marginBottom: 4,
};
