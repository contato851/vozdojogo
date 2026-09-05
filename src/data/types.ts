export interface Player {
  id: string;
  number: string;
  name: string;
  yellowCards?: number;
  redCard?: boolean;
  goals?: number;
  subIn?: boolean;
}

export interface Team {
  name: string;
  coach: string;
  color: string;
  accent: string;
  formation: string;
  starters: Player[];
  reserves: Player[];
  unlisted: Player[];
  curiosities: string;
}

export interface Match {
  id: string;
  createdAt: string;
  competition: string;
  round: string;
  matchDate: string;
  matchTime: string;
  stadium: string;
  referee: string;
  assistant1: string;
  assistant2: string;
  var_ref: string;
  fourthReferee: string;
  reporter: string;
  commentator1: string;
  commentator2: string;
  generalNotes: string;
  aiNotesGenerated: boolean;
  sortOrder: 'number' | 'manual';
  teamA: Team;
  teamB: Team;
}

export interface GoalEntry {
  team: 'teamA' | 'teamB';
  playerName: string;
  playerNumber: string;
  minute: number;
}

export interface SubstitutedPlayer extends Player {
  replacedBy: string;
  eventSummary: string;
}

export interface LiveTeam extends Team {
  subsOut: SubstitutedPlayer[];
}

export interface ClockState {
  running: boolean;
  elapsed: number;
  startedAt: number | null;
}

export interface LiveState {
  sortOrder: string;
  goalLog: GoalEntry[];
  fieldPos: Record<string, { x: number; y: number }>;
  fieldFlipped: boolean;
  clock: ClockState;
  teamA: LiveTeam;
  teamB: LiveTeam;
}

export interface SavedLive {
  matchId: string;
  state: LiveState;
  showSubs: boolean;
  showCur: boolean;
  curTab: string;
  liveView: string;
}

export interface TeamDBEntry {
  name: string;
  s: string;
  color: string;
  accent: string;
}

export type CompetitionCategory = 'nacional' | 'regional_estadual' | 'internacional';

export interface Competition {
  id: string;
  name: string;
  category: CompetitionCategory;
  order: number;
  // References TeamDBEntry.name in TEAMS — the many-to-many link. A team can
  // appear in more than one Competition's teamNames at once (its estadual and
  // the Brasileirão, for example).
  teamNames: string[];
}
