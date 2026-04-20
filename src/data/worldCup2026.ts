// World Cup 2026 data — 48 nations (group draw 5/Dec/2025) and group-stage fixtures.
// Squads use generic numbered placeholders; users can edit any player after pre-loading.

export interface CopaPlayer {
  number: string;
  name: string;
}

export interface CopaTeam {
  id: string;
  name: string;
  shortName: string;
  flag: string;
  color: string;
  accent: string;
  formation: string;
  coach: string;
  group: string;
  curiosities: string;
  starters: CopaPlayer[];
  reserves: CopaPlayer[];
}

export interface CopaFixture {
  id: string;
  group: string;
  matchday: number;
  teamA: string;
  teamB: string;
  date: string;
  time: string;
  stadium: string;
  city: string;
  country: string;
}

const STARTER_NUMBERS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'];
const RESERVE_NUMBERS = ['12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23'];

function makeStarters(): CopaPlayer[] {
  return STARTER_NUMBERS.map((n, i) => ({ number: n, name: `Jogador ${i + 1}` }));
}

function makeReserves(): CopaPlayer[] {
  return RESERVE_NUMBERS.map((n, i) => ({ number: n, name: `Reserva ${i + 1}` }));
}

interface SeedTeam {
  id: string;
  name: string;
  shortName: string;
  flag: string;
  color: string;
  accent: string;
  formation: string;
  coach: string;
  group: string;
  curiosities: string;
}

const SEEDS: SeedTeam[] = [
  // Group A
  { id: 'MEX', name: 'México', shortName: 'MEX', flag: '🇲🇽', color: '#006847', accent: '#ce1126', formation: '4-3-3', coach: 'Javier Aguirre', group: 'A', curiosities: 'País-sede da abertura. Joga no Estádio Azteca, palco das finais de 1970 e 1986.' },
  { id: 'RSA', name: 'África do Sul', shortName: 'RSA', flag: '🇿🇦', color: '#007a4d', accent: '#ffb612', formation: '4-2-3-1', coach: 'Hugo Broos', group: 'A', curiosities: 'Volta a uma Copa após sediar a edição de 2010.' },
  { id: 'KOR', name: 'Coreia do Sul', shortName: 'KOR', flag: '🇰🇷', color: '#cd2e3a', accent: '#0047a0', formation: '4-2-3-1', coach: 'Hong Myung-bo', group: 'A', curiosities: 'Semifinalista em 2002, é a seleção asiática mais constante em Copas neste século.' },
  { id: 'EUR_D', name: 'Repescagem Europa D', shortName: 'EUD', flag: '🇪🇺', color: '#003399', accent: '#ffcc00', formation: '4-3-3', coach: 'A definir', group: 'A', curiosities: 'Vaga decidida na repescagem europeia caminho D.' },

  // Group B
  { id: 'CAN', name: 'Canadá', shortName: 'CAN', flag: '🇨🇦', color: '#d52b1e', accent: '#ffffff', formation: '4-3-3', coach: 'Jesse Marsch', group: 'B', curiosities: 'País co-anfitrião. Disputa apenas sua terceira Copa do Mundo.' },
  { id: 'EUR_A', name: 'Repescagem Europa A', shortName: 'EUA', flag: '🇪🇺', color: '#003399', accent: '#ffcc00', formation: '4-3-3', coach: 'A definir', group: 'B', curiosities: 'Vaga decidida na repescagem europeia caminho A.' },
  { id: 'QAT', name: 'Catar', shortName: 'QAT', flag: '🇶🇦', color: '#8a1538', accent: '#ffffff', formation: '5-3-2', coach: 'Bartolomé Márquez', group: 'B', curiosities: 'Sediou a Copa de 2022. Buscam o primeiro ponto histórico em uma Copa fora de casa.' },
  { id: 'SUI', name: 'Suíça', shortName: 'SUI', flag: '🇨🇭', color: '#d52b1e', accent: '#ffffff', formation: '4-2-3-1', coach: 'Murat Yakin', group: 'B', curiosities: 'Já chegou às oitavas em quatro das últimas cinco Copas.' },

  // Group C
  { id: 'BRA', name: 'Brasil', shortName: 'BRA', flag: '🇧🇷', color: '#fedf00', accent: '#009c3b', formation: '4-2-3-1', coach: 'Carlo Ancelotti', group: 'C', curiosities: 'Pentacampeão mundial. Único país a participar de todas as Copas da história.' },
  { id: 'MAR', name: 'Marrocos', shortName: 'MAR', flag: '🇲🇦', color: '#c1272d', accent: '#006233', formation: '4-3-3', coach: 'Walid Regragui', group: 'C', curiosities: 'Semifinalista em 2022, primeira seleção africana a chegar tão longe em Copas.' },
  { id: 'HAI', name: 'Haiti', shortName: 'HAI', flag: '🇭🇹', color: '#00209f', accent: '#d21034', formation: '4-4-2', coach: 'Sébastien Migné', group: 'C', curiosities: 'Volta à Copa do Mundo após 52 anos — última participação foi em 1974.' },
  { id: 'SCO', name: 'Escócia', shortName: 'SCO', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', color: '#0065bd', accent: '#ffffff', formation: '3-5-2', coach: 'Steve Clarke', group: 'C', curiosities: 'Volta a uma Copa do Mundo após 28 anos de ausência.' },

  // Group D
  { id: 'USA', name: 'Estados Unidos', shortName: 'USA', flag: '🇺🇸', color: '#b22234', accent: '#3c3b6e', formation: '4-3-3', coach: 'Mauricio Pochettino', group: 'D', curiosities: 'Anfitrião principal. Sede da final no MetLife Stadium em 19/jul/2026.' },
  { id: 'PAR', name: 'Paraguai', shortName: 'PAR', flag: '🇵🇾', color: '#d52b1e', accent: '#0038a8', formation: '4-4-2', coach: 'Gustavo Alfaro', group: 'D', curiosities: 'Volta à Copa após 16 anos. Última participação foi em 2010.' },
  { id: 'AUS', name: 'Austrália', shortName: 'AUS', flag: '🇦🇺', color: '#00843d', accent: '#ffcd00', formation: '4-2-3-1', coach: 'Tony Popovic', group: 'D', curiosities: 'Sexta Copa consecutiva da seleção australiana, agora pela confederação asiática.' },
  { id: 'EUR_C', name: 'Repescagem Europa C', shortName: 'EUC', flag: '🇪🇺', color: '#003399', accent: '#ffcc00', formation: '4-3-3', coach: 'A definir', group: 'D', curiosities: 'Vaga decidida na repescagem europeia caminho C.' },

  // Group E
  { id: 'GER', name: 'Alemanha', shortName: 'GER', flag: '🇩🇪', color: '#000000', accent: '#dd0000', formation: '4-2-3-1', coach: 'Julian Nagelsmann', group: 'E', curiosities: 'Tetracampeã mundial. Busca recuperar o protagonismo após eliminações precoces em 2018 e 2022.' },
  { id: 'CUW', name: 'Curaçao', shortName: 'CUW', flag: '🇨🇼', color: '#00256b', accent: '#ffd200', formation: '4-4-2', coach: 'Dick Advocaat', group: 'E', curiosities: 'Estreia histórica em uma Copa do Mundo. Menor país (em população) a se classificar.' },
  { id: 'CIV', name: 'Costa do Marfim', shortName: 'CIV', flag: '🇨🇮', color: '#ff8200', accent: '#009e60', formation: '4-3-3', coach: 'Emerse Faé', group: 'E', curiosities: 'Atual campeã da Copa Africana das Nações (2023).' },
  { id: 'ECU', name: 'Equador', shortName: 'ECU', flag: '🇪🇨', color: '#ffdd00', accent: '#034ea2', formation: '4-3-3', coach: 'Sebastián Beccacece', group: 'E', curiosities: 'Quinta Copa do Mundo da seleção equatoriana.' },

  // Group F
  { id: 'NED', name: 'Holanda', shortName: 'NED', flag: '🇳🇱', color: '#ff6c00', accent: '#21468b', formation: '4-3-3', coach: 'Ronald Koeman', group: 'F', curiosities: 'Tricampeã vice-mundial (1974, 1978, 2010). Berço do "Futebol Total".' },
  { id: 'JPN', name: 'Japão', shortName: 'JPN', flag: '🇯🇵', color: '#bc002d', accent: '#ffffff', formation: '4-2-3-1', coach: 'Hajime Moriyasu', group: 'F', curiosities: 'Foi a primeira seleção do mundo a se classificar para a Copa de 2026.' },
  { id: 'EUR_B', name: 'Repescagem Europa B', shortName: 'EUB', flag: '🇪🇺', color: '#003399', accent: '#ffcc00', formation: '4-3-3', coach: 'A definir', group: 'F', curiosities: 'Vaga decidida na repescagem europeia caminho B.' },
  { id: 'TUN', name: 'Tunísia', shortName: 'TUN', flag: '🇹🇳', color: '#e70013', accent: '#ffffff', formation: '4-3-3', coach: 'Sami Trabelsi', group: 'F', curiosities: 'Sétima Copa do Mundo da seleção tunisiana.' },

  // Group G
  { id: 'BEL', name: 'Bélgica', shortName: 'BEL', flag: '🇧🇪', color: '#ed2939', accent: '#fae042', formation: '4-3-3', coach: 'Rudi Garcia', group: 'G', curiosities: 'Geração dourada renovada. Terceira colocada em 2018.' },
  { id: 'EGY', name: 'Egito', shortName: 'EGY', flag: '🇪🇬', color: '#ce1126', accent: '#000000', formation: '4-3-3', coach: 'Hossam Hassan', group: 'G', curiosities: 'Volta à Copa após 8 anos. Liderada por Mohamed Salah.' },
  { id: 'IRN', name: 'Irã', shortName: 'IRN', flag: '🇮🇷', color: '#239f40', accent: '#da0000', formation: '5-3-2', coach: 'Amir Ghalenoei', group: 'G', curiosities: 'Sétima Copa do Mundo. Maior potência do futebol asiático nos últimos 20 anos.' },
  { id: 'NZL', name: 'Nova Zelândia', shortName: 'NZL', flag: '🇳🇿', color: '#000000', accent: '#ffffff', formation: '4-4-2', coach: 'Darren Bazeley', group: 'G', curiosities: 'Volta à Copa após 16 anos. Em 2010, foi a única seleção invicta do torneio.' },

  // Group H
  { id: 'ESP', name: 'Espanha', shortName: 'ESP', flag: '🇪🇸', color: '#aa151b', accent: '#f1bf00', formation: '4-3-3', coach: 'Luis de la Fuente', group: 'H', curiosities: 'Campeã mundial em 2010 e atual campeã europeia (Euro 2024).' },
  { id: 'CPV', name: 'Cabo Verde', shortName: 'CPV', flag: '🇨🇻', color: '#003893', accent: '#cf2027', formation: '4-3-3', coach: 'Bubista', group: 'H', curiosities: 'Estreia histórica em Copas. Menor país africano a se classificar.' },
  { id: 'KSA', name: 'Arábia Saudita', shortName: 'KSA', flag: '🇸🇦', color: '#006c35', accent: '#ffffff', formation: '4-3-3', coach: 'Hervé Renard', group: 'H', curiosities: 'Em 2022, derrotou a Argentina campeã na fase de grupos.' },
  { id: 'URU', name: 'Uruguai', shortName: 'URU', flag: '🇺🇾', color: '#7b9ad0', accent: '#000000', formation: '4-4-2', coach: 'Marcelo Bielsa', group: 'H', curiosities: 'Bicampeão mundial (1930, 1950). Conquistou o primeiro Mundial da história.' },

  // Group I
  { id: 'FRA', name: 'França', shortName: 'FRA', flag: '🇫🇷', color: '#0055a4', accent: '#ef4135', formation: '4-2-3-1', coach: 'Didier Deschamps', group: 'I', curiosities: 'Bicampeã mundial (1998, 2018) e vice em 2022.' },
  { id: 'SEN', name: 'Senegal', shortName: 'SEN', flag: '🇸🇳', color: '#00853f', accent: '#fdef42', formation: '4-3-3', coach: 'Pape Thiaw', group: 'I', curiosities: 'Campeã africana em 2021. Quartas de final em 2002.' },
  { id: 'WC_2', name: 'Repescagem Mundial 2', shortName: 'RM2', flag: '🌍', color: '#555555', accent: '#cccccc', formation: '4-4-2', coach: 'A definir', group: 'I', curiosities: 'Vaga decidida na repescagem intercontinental caminho 2.' },
  { id: 'NOR', name: 'Noruega', shortName: 'NOR', flag: '🇳🇴', color: '#ef2b2d', accent: '#002868', formation: '4-3-3', coach: 'Ståle Solbakken', group: 'I', curiosities: 'Volta à Copa do Mundo após 28 anos. Liderada por Erling Haaland.' },

  // Group J
  { id: 'ARG', name: 'Argentina', shortName: 'ARG', flag: '🇦🇷', color: '#74acdf', accent: '#ffffff', formation: '4-4-2', coach: 'Lionel Scaloni', group: 'J', curiosities: 'Atual campeã do mundo. Tricampeã mundial (1978, 1986, 2022).' },
  { id: 'ALG', name: 'Argélia', shortName: 'ALG', flag: '🇩🇿', color: '#006233', accent: '#d21034', formation: '4-3-3', coach: 'Vladimir Petković', group: 'J', curiosities: 'Quinta Copa do Mundo. Eliminou a Alemanha campeã na fase de grupos em 1982.' },
  { id: 'AUT', name: 'Áustria', shortName: 'AUT', flag: '🇦🇹', color: '#ed2939', accent: '#ffffff', formation: '4-2-3-1', coach: 'Ralf Rangnick', group: 'J', curiosities: 'Volta à Copa após 28 anos.' },
  { id: 'JOR', name: 'Jordânia', shortName: 'JOR', flag: '🇯🇴', color: '#000000', accent: '#ce1126', formation: '4-3-3', coach: 'Jamal Sellami', group: 'J', curiosities: 'Estreia histórica em Copas do Mundo.' },

  // Group K
  { id: 'POR', name: 'Portugal', shortName: 'POR', flag: '🇵🇹', color: '#006600', accent: '#ff0000', formation: '4-3-3', coach: 'Roberto Martínez', group: 'K', curiosities: 'Liderada por Cristiano Ronaldo, possivelmente em sua última Copa.' },
  { id: 'WC_1', name: 'Repescagem Mundial 1', shortName: 'RM1', flag: '🌍', color: '#555555', accent: '#cccccc', formation: '4-4-2', coach: 'A definir', group: 'K', curiosities: 'Vaga decidida na repescagem intercontinental caminho 1.' },
  { id: 'UZB', name: 'Uzbequistão', shortName: 'UZB', flag: '🇺🇿', color: '#0099b5', accent: '#ce1126', formation: '4-3-3', coach: 'Timur Kapadze', group: 'K', curiosities: 'Estreia histórica em Copas do Mundo.' },
  { id: 'COL', name: 'Colômbia', shortName: 'COL', flag: '🇨🇴', color: '#fcd116', accent: '#003893', formation: '4-3-3', coach: 'Néstor Lorenzo', group: 'K', curiosities: 'Vice-campeã da Copa América 2024. Liderada por James Rodríguez.' },

  // Group L
  { id: 'ENG', name: 'Inglaterra', shortName: 'ENG', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', color: '#ffffff', accent: '#ce1124', formation: '4-2-3-1', coach: 'Thomas Tuchel', group: 'L', curiosities: 'Campeã mundial em 1966. Vice da Euro 2020 e 2024.' },
  { id: 'CRO', name: 'Croácia', shortName: 'CRO', flag: '🇭🇷', color: '#ff0000', accent: '#ffffff', formation: '4-3-3', coach: 'Zlatko Dalić', group: 'L', curiosities: 'Vice em 2018 e terceira colocada em 2022.' },
  { id: 'PAN', name: 'Panamá', shortName: 'PAN', flag: '🇵🇦', color: '#db0000', accent: '#005aa7', formation: '4-4-2', coach: 'Thomas Christiansen', group: 'L', curiosities: 'Segunda Copa do Mundo da história panamenha.' },
  { id: 'GHA', name: 'Gana', shortName: 'GHA', flag: '🇬🇭', color: '#ce1126', accent: '#fcd116', formation: '4-3-3', coach: 'Otto Addo', group: 'L', curiosities: 'Quartas de final em 2010, melhor campanha africana à época.' },
];

export const COPA_TEAMS: CopaTeam[] = SEEDS.map(s => ({
  ...s,
  starters: makeStarters(),
  reserves: makeReserves(),
}));

export function getCopaTeamById(id: string): CopaTeam | undefined {
  return COPA_TEAMS.find(t => t.id === id);
}

export const COPA_GROUPS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'] as const;

// Stadiums (real venues for World Cup 2026)
const ST = {
  AZTECA: { stadium: 'Estadio Azteca', city: 'Cidade do México', country: 'México' },
  BBVA: { stadium: 'Estadio BBVA', city: 'Monterrey', country: 'México' },
  AKRON: { stadium: 'Estadio Akron', city: 'Guadalajara', country: 'México' },
  BMO: { stadium: 'BMO Field', city: 'Toronto', country: 'Canadá' },
  BC: { stadium: 'BC Place', city: 'Vancouver', country: 'Canadá' },
  METLIFE: { stadium: 'MetLife Stadium', city: 'Nova York/NJ', country: 'EUA' },
  ATT: { stadium: 'AT&T Stadium', city: 'Dallas', country: 'EUA' },
  SOFI: { stadium: 'SoFi Stadium', city: 'Los Angeles', country: 'EUA' },
  LEVIS: { stadium: "Levi's Stadium", city: 'San Francisco', country: 'EUA' },
  ARROW: { stadium: 'Arrowhead Stadium', city: 'Kansas City', country: 'EUA' },
  GILL: { stadium: 'Gillette Stadium', city: 'Boston', country: 'EUA' },
  LFF: { stadium: 'Lincoln Financial Field', city: 'Filadélfia', country: 'EUA' },
  MBS: { stadium: 'Mercedes-Benz Stadium', city: 'Atlanta', country: 'EUA' },
  NRG: { stadium: 'NRG Stadium', city: 'Houston', country: 'EUA' },
  LUMEN: { stadium: 'Lumen Field', city: 'Seattle', country: 'EUA' },
  HRS: { stadium: 'Hard Rock Stadium', city: 'Miami', country: 'EUA' },
};

interface FixtureSeed {
  group: string;
  matchday: number;
  teamA: string;
  teamB: string;
  date: string;
  time: string;
  venue: keyof typeof ST;
}

// 12 groups × 6 games = 72 fixtures. Within each group: 3 matchdays of 2 games each.
// Standard rotation: MD1 (1v2, 3v4), MD2 (1v3, 4v2), MD3 (4v1, 2v3).
const FIXTURE_SEEDS: FixtureSeed[] = [
  // Group A — opens the World Cup on 11/Jun (MEX vs RSA at Azteca)
  { group: 'A', matchday: 1, teamA: 'MEX', teamB: 'RSA', date: '2026-06-11', time: '13:00', venue: 'AZTECA' },
  { group: 'A', matchday: 1, teamA: 'KOR', teamB: 'EUR_D', date: '2026-06-11', time: '17:00', venue: 'AKRON' },
  { group: 'A', matchday: 2, teamA: 'MEX', teamB: 'KOR', date: '2026-06-17', time: '16:00', venue: 'AZTECA' },
  { group: 'A', matchday: 2, teamA: 'EUR_D', teamB: 'RSA', date: '2026-06-17', time: '13:00', venue: 'AKRON' },
  { group: 'A', matchday: 3, teamA: 'EUR_D', teamB: 'MEX', date: '2026-06-24', time: '17:00', venue: 'BBVA' },
  { group: 'A', matchday: 3, teamA: 'RSA', teamB: 'KOR', date: '2026-06-24', time: '17:00', venue: 'AKRON' },

  // Group B
  { group: 'B', matchday: 1, teamA: 'CAN', teamB: 'EUR_A', date: '2026-06-12', time: '17:00', venue: 'BMO' },
  { group: 'B', matchday: 1, teamA: 'QAT', teamB: 'SUI', date: '2026-06-12', time: '14:00', venue: 'BC' },
  { group: 'B', matchday: 2, teamA: 'CAN', teamB: 'QAT', date: '2026-06-18', time: '17:00', venue: 'BMO' },
  { group: 'B', matchday: 2, teamA: 'SUI', teamB: 'EUR_A', date: '2026-06-18', time: '14:00', venue: 'BC' },
  { group: 'B', matchday: 3, teamA: 'SUI', teamB: 'CAN', date: '2026-06-25', time: '17:00', venue: 'BC' },
  { group: 'B', matchday: 3, teamA: 'EUR_A', teamB: 'QAT', date: '2026-06-25', time: '17:00', venue: 'BMO' },

  // Group C — Brazil debuts MD1
  { group: 'C', matchday: 1, teamA: 'BRA', teamB: 'MAR', date: '2026-06-13', time: '17:00', venue: 'METLIFE' },
  { group: 'C', matchday: 1, teamA: 'HAI', teamB: 'SCO', date: '2026-06-13', time: '14:00', venue: 'GILL' },
  { group: 'C', matchday: 2, teamA: 'BRA', teamB: 'HAI', date: '2026-06-19', time: '16:00', venue: 'METLIFE' },
  { group: 'C', matchday: 2, teamA: 'SCO', teamB: 'MAR', date: '2026-06-19', time: '13:00', venue: 'GILL' },
  { group: 'C', matchday: 3, teamA: 'SCO', teamB: 'BRA', date: '2026-06-25', time: '21:00', venue: 'GILL' },
  { group: 'C', matchday: 3, teamA: 'MAR', teamB: 'HAI', date: '2026-06-25', time: '21:00', venue: 'METLIFE' },

  // Group D — USA opens at SoFi
  { group: 'D', matchday: 1, teamA: 'USA', teamB: 'PAR', date: '2026-06-12', time: '21:00', venue: 'SOFI' },
  { group: 'D', matchday: 1, teamA: 'AUS', teamB: 'EUR_C', date: '2026-06-13', time: '21:00', venue: 'LEVIS' },
  { group: 'D', matchday: 2, teamA: 'USA', teamB: 'AUS', date: '2026-06-19', time: '21:00', venue: 'SOFI' },
  { group: 'D', matchday: 2, teamA: 'EUR_C', teamB: 'PAR', date: '2026-06-19', time: '18:00', venue: 'LEVIS' },
  { group: 'D', matchday: 3, teamA: 'EUR_C', teamB: 'USA', date: '2026-06-26', time: '17:00', venue: 'SOFI' },
  { group: 'D', matchday: 3, teamA: 'PAR', teamB: 'AUS', date: '2026-06-26', time: '17:00', venue: 'LEVIS' },

  // Group E — Germany opens
  { group: 'E', matchday: 1, teamA: 'GER', teamB: 'CUW', date: '2026-06-14', time: '13:00', venue: 'ARROW' },
  { group: 'E', matchday: 1, teamA: 'CIV', teamB: 'ECU', date: '2026-06-14', time: '17:00', venue: 'NRG' },
  { group: 'E', matchday: 2, teamA: 'GER', teamB: 'CIV', date: '2026-06-20', time: '14:00', venue: 'ARROW' },
  { group: 'E', matchday: 2, teamA: 'ECU', teamB: 'CUW', date: '2026-06-20', time: '17:00', venue: 'NRG' },
  { group: 'E', matchday: 3, teamA: 'ECU', teamB: 'GER', date: '2026-06-26', time: '21:00', venue: 'ARROW' },
  { group: 'E', matchday: 3, teamA: 'CUW', teamB: 'CIV', date: '2026-06-26', time: '21:00', venue: 'NRG' },

  // Group F — Netherlands & Japan
  { group: 'F', matchday: 1, teamA: 'NED', teamB: 'JPN', date: '2026-06-14', time: '21:00', venue: 'LUMEN' },
  { group: 'F', matchday: 1, teamA: 'EUR_B', teamB: 'TUN', date: '2026-06-15', time: '13:00', venue: 'HRS' },
  { group: 'F', matchday: 2, teamA: 'NED', teamB: 'EUR_B', date: '2026-06-21', time: '13:00', venue: 'LUMEN' },
  { group: 'F', matchday: 2, teamA: 'TUN', teamB: 'JPN', date: '2026-06-21', time: '17:00', venue: 'HRS' },
  { group: 'F', matchday: 3, teamA: 'TUN', teamB: 'NED', date: '2026-06-27', time: '13:00', venue: 'HRS' },
  { group: 'F', matchday: 3, teamA: 'JPN', teamB: 'EUR_B', date: '2026-06-27', time: '13:00', venue: 'LUMEN' },

  // Group G — Belgium
  { group: 'G', matchday: 1, teamA: 'BEL', teamB: 'EGY', date: '2026-06-15', time: '17:00', venue: 'LFF' },
  { group: 'G', matchday: 1, teamA: 'IRN', teamB: 'NZL', date: '2026-06-15', time: '21:00', venue: 'MBS' },
  { group: 'G', matchday: 2, teamA: 'BEL', teamB: 'IRN', date: '2026-06-21', time: '21:00', venue: 'LFF' },
  { group: 'G', matchday: 2, teamA: 'NZL', teamB: 'EGY', date: '2026-06-22', time: '13:00', venue: 'MBS' },
  { group: 'G', matchday: 3, teamA: 'NZL', teamB: 'BEL', date: '2026-06-27', time: '17:00', venue: 'LFF' },
  { group: 'G', matchday: 3, teamA: 'EGY', teamB: 'IRN', date: '2026-06-27', time: '17:00', venue: 'MBS' },

  // Group H — Spain
  { group: 'H', matchday: 1, teamA: 'ESP', teamB: 'CPV', date: '2026-06-16', time: '13:00', venue: 'BC' },
  { group: 'H', matchday: 1, teamA: 'KSA', teamB: 'URU', date: '2026-06-16', time: '17:00', venue: 'BMO' },
  { group: 'H', matchday: 2, teamA: 'ESP', teamB: 'KSA', date: '2026-06-22', time: '17:00', venue: 'BC' },
  { group: 'H', matchday: 2, teamA: 'URU', teamB: 'CPV', date: '2026-06-22', time: '14:00', venue: 'BMO' },
  { group: 'H', matchday: 3, teamA: 'URU', teamB: 'ESP', date: '2026-06-28', time: '13:00', venue: 'BC' },
  { group: 'H', matchday: 3, teamA: 'CPV', teamB: 'KSA', date: '2026-06-28', time: '13:00', venue: 'BMO' },

  // Group I — France
  { group: 'I', matchday: 1, teamA: 'FRA', teamB: 'SEN', date: '2026-06-16', time: '21:00', venue: 'METLIFE' },
  { group: 'I', matchday: 1, teamA: 'WC_2', teamB: 'NOR', date: '2026-06-17', time: '21:00', venue: 'GILL' },
  { group: 'I', matchday: 2, teamA: 'FRA', teamB: 'WC_2', date: '2026-06-23', time: '17:00', venue: 'METLIFE' },
  { group: 'I', matchday: 2, teamA: 'NOR', teamB: 'SEN', date: '2026-06-23', time: '13:00', venue: 'GILL' },
  { group: 'I', matchday: 3, teamA: 'NOR', teamB: 'FRA', date: '2026-06-28', time: '17:00', venue: 'METLIFE' },
  { group: 'I', matchday: 3, teamA: 'SEN', teamB: 'WC_2', date: '2026-06-28', time: '17:00', venue: 'GILL' },

  // Group J — Argentina
  { group: 'J', matchday: 1, teamA: 'ARG', teamB: 'ALG', date: '2026-06-17', time: '21:00', venue: 'ATT' },
  { group: 'J', matchday: 1, teamA: 'AUT', teamB: 'JOR', date: '2026-06-18', time: '13:00', venue: 'ARROW' },
  { group: 'J', matchday: 2, teamA: 'ARG', teamB: 'AUT', date: '2026-06-23', time: '21:00', venue: 'ATT' },
  { group: 'J', matchday: 2, teamA: 'JOR', teamB: 'ALG', date: '2026-06-24', time: '13:00', venue: 'ARROW' },
  { group: 'J', matchday: 3, teamA: 'JOR', teamB: 'ARG', date: '2026-06-29', time: '17:00', venue: 'ATT' },
  { group: 'J', matchday: 3, teamA: 'ALG', teamB: 'AUT', date: '2026-06-29', time: '17:00', venue: 'ARROW' },

  // Group K — Portugal
  { group: 'K', matchday: 1, teamA: 'POR', teamB: 'WC_1', date: '2026-06-18', time: '21:00', venue: 'NRG' },
  { group: 'K', matchday: 1, teamA: 'UZB', teamB: 'COL', date: '2026-06-19', time: '14:00', venue: 'LFF' },
  { group: 'K', matchday: 2, teamA: 'POR', teamB: 'UZB', date: '2026-06-24', time: '21:00', venue: 'NRG' },
  { group: 'K', matchday: 2, teamA: 'COL', teamB: 'WC_1', date: '2026-06-25', time: '13:00', venue: 'LFF' },
  { group: 'K', matchday: 3, teamA: 'COL', teamB: 'POR', date: '2026-06-29', time: '21:00', venue: 'NRG' },
  { group: 'K', matchday: 3, teamA: 'WC_1', teamB: 'UZB', date: '2026-06-29', time: '21:00', venue: 'LFF' },

  // Group L — England
  { group: 'L', matchday: 1, teamA: 'ENG', teamB: 'CRO', date: '2026-06-20', time: '21:00', venue: 'MBS' },
  { group: 'L', matchday: 1, teamA: 'PAN', teamB: 'GHA', date: '2026-06-20', time: '13:00', venue: 'HRS' },
  { group: 'L', matchday: 2, teamA: 'ENG', teamB: 'PAN', date: '2026-06-26', time: '13:00', venue: 'MBS' },
  { group: 'L', matchday: 2, teamA: 'GHA', teamB: 'CRO', date: '2026-06-26', time: '13:00', venue: 'HRS' },
  { group: 'L', matchday: 3, teamA: 'GHA', teamB: 'ENG', date: '2026-07-02', time: '17:00', venue: 'MBS' },
  { group: 'L', matchday: 3, teamA: 'CRO', teamB: 'PAN', date: '2026-07-02', time: '17:00', venue: 'HRS' },
];

export const COPA_FIXTURES: CopaFixture[] = FIXTURE_SEEDS.map((f, i) => ({
  id: `WC26-${String(i + 1).padStart(3, '0')}`,
  group: f.group,
  matchday: f.matchday,
  teamA: f.teamA,
  teamB: f.teamB,
  date: f.date,
  time: f.time,
  ...ST[f.venue],
}));
