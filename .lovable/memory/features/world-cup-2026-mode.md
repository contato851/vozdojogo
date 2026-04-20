---
name: World Cup 2026 Mode
description: Optional 'copa' mode with 48 nations, 72 fixtures and mode selector gate
type: feature
---
- localStorage key: `vdj-mode` (values: 'normal' | 'copa' | null)
- Context: `src/context/CopaModeContext.tsx` (CopaModeProvider wraps inside AuthProvider)
- Mode selector (`ModeSelector.tsx`) renders inside SubscriptionGate when mode === null, AFTER subscription check
- 'normal' mode renders AppLayout (unchanged), 'copa' renders CopaLayout (replaces SetupScreen with CopaMatchPicker on /escalacao)
- Data: `src/data/worldCup2026.ts` — 48 CopaTeams (generic numbered squads "Jogador 1..11", "Reserva 1..12"), 72 CopaFixtures with real 2026 stadiums
- Squads are editable after pre-load (no lock). Player names converted via copaTeamToTeam() preserving uppercase team names.
- TopBar shows golden "🏆 COPA 2026" badge when mode === 'copa'; clicking it confirms then resets mode to null
- Demo route /demo unaffected. Copa mode requires login + subscription.
