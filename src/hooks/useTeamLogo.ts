import { useState, useEffect } from 'react';

const CACHE_KEY = 'vdj-team-logos';
const FLAG_CDN = 'https://flagcdn.com/w80';

// Map national team names to ISO country codes for flags
const COUNTRY_FLAGS: Record<string, string> = {
  'BRASIL': 'br',
  'ARGENTINA': 'ar',
  'URUGUAI': 'uy',
  'COLÔMBIA': 'co',
  'CHILE': 'cl',
  'PARAGUAI': 'py',
  'PERU': 'pe',
  'EQUADOR': 'ec',
  'VENEZUELA': 've',
  'BOLÍVIA': 'bo',
  'ALEMANHA': 'de',
  'ESPANHA': 'es',
  'FRANÇA': 'fr',
  'INGLATERRA': 'gb-eng',
  'ITÁLIA': 'it',
  'PORTUGAL': 'pt',
  'HOLANDA': 'nl',
  'BÉLGICA': 'be',
  'CROÁCIA': 'hr',
  'MÉXICO': 'mx',
  'JAPÃO': 'jp',
  'COREIA DO SUL': 'kr',
  'MARROCOS': 'ma',
  'NIGÉRIA': 'ng',
  'CAMARÕES': 'cm',
  'ESTADOS UNIDOS': 'us',
};

// Wikipedia search terms for clubs that need special mapping
const WIKI_OVERRIDES: Record<string, string> = {
  'FLAMENGO': 'Clube de Regatas do Flamengo',
  'VASCO': 'Club de Regatas Vasco da Gama',
  'BOTAFOGO': 'Botafogo de Futebol e Regatas',
  'FLUMINENSE': 'Fluminense Football Club',
  'PALMEIRAS': 'Sociedade Esportiva Palmeiras',
  'CORINTHIANS': 'Sport Club Corinthians Paulista',
  'SÃO PAULO': 'São Paulo Futebol Clube',
  'SANTOS': 'Santos Futebol Clube',
  'GRÊMIO': 'Grêmio Foot-Ball Porto Alegrense',
  'INTERNACIONAL': 'Sport Club Internacional',
  'CRUZEIRO': 'Cruzeiro Esporte Clube',
  'ATLÉTICO-MG': 'Clube Atlético Mineiro',
  'BAHIA': 'Esporte Clube Bahia',
  'VITÓRIA': 'Esporte Clube Vitória',
  'SPORT': 'Sport Club do Recife',
  'NÁUTICO': 'Clube Náutico Capibaribe',
  'SANTA CRUZ': 'Santa Cruz Futebol Clube',
  'CEARÁ': 'Ceará Sporting Club',
  'FORTALEZA': 'Fortaleza Esporte Clube',
  'CORITIBA': 'Coritiba Foot Ball Club',
  'ATHLETICO-PR': 'Club Athletico Paranaense',
  'PARANÁ': 'Paraná Clube',
  'GOIÁS': 'Goiás Esporte Clube',
  'ATLÉTICO-GO': 'Atlético Clube Goianiense',
  'VILA NOVA': 'Vila Nova Futebol Clube',
  'PONTE PRETA': 'Associação Atlética Ponte Preta',
  'GUARANI': 'Guarani Futebol Clube',
  'BRAGANTINO': 'Red Bull Bragantino',
  'AVAÍ': 'Avaí Futebol Clube',
  'FIGUEIRENSE': 'Figueirense Futebol Clube',
  'CHAPECOENSE': 'Associação Chapecoense de Futebol',
  'CRICIÚMA': 'Criciúma Esporte Clube',
  'JOINVILLE': 'Joinville Esporte Clube',
  'JUVENTUDE': 'Esporte Clube Juventude',
  'CUIABÁ': 'Cuiabá Esporte Clube',
  'AMÉRICA-MG': 'América Futebol Clube (Belo Horizonte)',
  'TOMBENSE': 'Tombense Futebol Clube',
  'REMO': 'Clube do Remo',
  'PAYSANDU': 'Paysandu Sport Club',
  'ABC': 'ABC Futebol Clube',
  'AMÉRICA-RN': 'América Futebol Clube (Natal)',
  'CSA': 'Centro Sportivo Alagoano',
  'CRB': 'Clube de Regatas Brasil',
  'SAMPAIO CORRÊA': 'Sampaio Corrêa Futebol Clube',
  'ITUANO': 'Ituano Futebol Clube',
  'MIRASSOL': 'Mirassol Futebol Clube',
  'NOVORIZONTINO': 'Grêmio Novorizontino',
  'BOTAFOGO-SP': 'Botafogo Futebol Clube (Ribeirão Preto)',
  'PORTUGUESA': 'Associação Portuguesa de Desportos',
  'BRASILIENSE': 'Brasiliense Futebol Clube',
  'GAMA': 'Sociedade Esportiva do Gama',
  'CONFIANÇA': 'Associação Desportiva Confiança',
  'SERGIPE': 'Club Sportivo Sergipe',
  'LONDRINA': 'Londrina Esporte Clube',
  'MARINGÁ': 'Maringá Futebol Clube',
  'OPERÁRIO-PR': 'Operário Ferroviário Esporte Clube',
  'SÃO BERNARDO': 'São Bernardo Futebol Clube',
  'ÁGUA SANTA': 'Esporte Clube Água Santa',
  'FERROVIÁRIA': 'Associação Ferroviária de Esportes',
  'XV DE PIRACICABA': 'Esporte Clube XV de Novembro (Piracicaba)',
  'INTER DE LIMEIRA': 'Associação Atlética Internacional (Limeira)',
};

function getLogoCache(): Record<string, string | null> {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    return cached ? JSON.parse(cached) : {};
  } catch {
    return {};
  }
}

function setLogoCache(cache: Record<string, string | null>) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch { /* ignore */ }
}

// In-flight requests to avoid duplicates
const pendingRequests: Record<string, Promise<string | null>> = {};

async function fetchWikiLogo(teamName: string): Promise<string | null> {
  const searchTerm = WIKI_OVERRIDES[teamName] || teamName;
  const searchQuery = WIKI_OVERRIDES[teamName] ? searchTerm : `${searchTerm} futebol clube`;
  
  try {
    const url = `https://pt.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(searchQuery)}&gsrlimit=1&prop=pageimages&format=json&pithumbsize=100&origin=*`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const pages = data?.query?.pages;
    if (!pages) return null;
    const firstPage = Object.values(pages)[0] as any;
    return firstPage?.thumbnail?.source || null;
  } catch {
    return null;
  }
}

export function getTeamLogoUrl(teamName: string, isNationalTeam: boolean): string | null {
  if (isNationalTeam) {
    const code = COUNTRY_FLAGS[teamName];
    return code ? `${FLAG_CDN}/${code}.png` : null;
  }
  
  const cache = getLogoCache();
  return cache[teamName] !== undefined ? cache[teamName] : null;
}

export function useTeamLogo(teamName: string, isNationalTeam: boolean, overrideUrl?: string | null) {
  const [logoUrl, setLogoUrl] = useState<string | null>(() =>
    overrideUrl || getTeamLogoUrl(teamName, isNationalTeam)
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (overrideUrl) {
      setLogoUrl(overrideUrl);
      setLoading(false);
      return;
    }

    if (isNationalTeam) {
      const code = COUNTRY_FLAGS[teamName];
      setLogoUrl(code ? `${FLAG_CDN}/${code}.png` : null);
      return;
    }


    const cache = getLogoCache();
    if (cache[teamName] !== undefined) {
      setLogoUrl(cache[teamName]);
      return;
    }

    // Fetch from Wikipedia
    if (!pendingRequests[teamName]) {
      pendingRequests[teamName] = fetchWikiLogo(teamName).then(url => {
        const c = getLogoCache();
        c[teamName] = url;
        setLogoCache(c);
        delete pendingRequests[teamName];
        return url;
      });
    }

    setLoading(true);
    pendingRequests[teamName].then(url => {
      setLogoUrl(url);
      setLoading(false);
    });
  }, [teamName, isNationalTeam, overrideUrl]);

  return { logoUrl, loading };
}

// Batch prefetch logos for visible teams
export function prefetchLogos(teamNames: string[], isNationalTeam: boolean) {
  if (isNationalTeam) return;
  
  const cache = getLogoCache();
  const toFetch = teamNames.filter(n => cache[n] === undefined);
  
  // Stagger requests to avoid rate limiting
  toFetch.forEach((name, i) => {
    if (!pendingRequests[name]) {
      setTimeout(() => {
        if (!pendingRequests[name]) {
          pendingRequests[name] = fetchWikiLogo(name).then(url => {
            const c = getLogoCache();
            c[name] = url;
            setLogoCache(c);
            delete pendingRequests[name];
            return url;
          });
        }
      }, i * 100); // 100ms stagger
    }
  });
}
