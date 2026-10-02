// NASA Open API helpers with active API key and resilient fallback data
export const NASA_API_KEY =
  (import.meta.env.VITE_NASA_API_KEY as string | undefined) ||
  'WWTxCQLNT5jcps6GTX5TqSp6EbR6tvw2J2UZD98T';

const NASA_BASE = 'https://api.nasa.gov';

export interface APOD {
  title: string;
  date: string;
  explanation: string;
  url: string;
  hdurl?: string;
  media_type: 'image' | 'video';
  copyright?: string;
}

// Curated list of real NASA/ESA astronomy images — shown whenever today's APOD is not space-related
const ASTRONOMY_FALLBACKS: APOD[] = [
  {
    title: 'Pillars of Creation — James Webb Space Telescope',
    date: '2022-10-19',
    explanation:
      "The James Webb Space Telescope reveals the iconic Pillars of Creation in mid-infrared light. Stars are forming within these towering columns of gas and dust inside the Eagle Nebula (M16), about 6,500 light-years away. Webb's extraordinary sensitivity resolves individual young protostars still gathering mass from the surrounding cloud.",
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/68/Pillars_of_creation_2014_HST_WFC3-UVIS_full-res_denoised.jpg/960px-Pillars_of_creation_2014_HST_WFC3-UVIS_full-res_denoised.jpg',
    hdurl: 'https://upload.wikimedia.org/wikipedia/commons/6/68/Pillars_of_creation_2014_HST_WFC3-UVIS_full-res_denoised.jpg',
    media_type: 'image',
    copyright: 'NASA, ESA, CSA, STScI',
  },
  {
    title: "Webb's First Deep Field — Galaxy Cluster SMACS 0723",
    date: '2022-07-11',
    explanation:
      "NASA's James Webb Space Telescope has produced the deepest and sharpest infrared image of the distant universe to date. This image of galaxy cluster SMACS 0723 reveals thousands of galaxies — including the faintest objects ever observed in the infrared — with stunning clarity. Light from these galaxies has traveled billions of years to reach us.",
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Webb%27s_First_Deep_Field_%28adjusted%29.jpg/800px-Webb%27s_First_Deep_Field_%28adjusted%29.jpg',
    hdurl: 'https://upload.wikimedia.org/wikipedia/commons/6/6e/Webb%27s_First_Deep_Field_%28adjusted%29.jpg',
    media_type: 'image',
    copyright: 'NASA, ESA, CSA, STScI',
  },
  {
    title: 'Andromeda Galaxy — Hubble UHD Panorama',
    date: '2015-01-05',
    explanation:
      'The largest NASA Hubble Space Telescope image ever assembled captures a portion of the Andromeda Galaxy (M31), our nearest large spiral galaxy neighbor at 2.537 million light-years. This sweeping mosaic covers over 40,000 light-years and resolves more than 100 million individual stars in fine detail.',
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/98/Andromeda_Galaxy_%28with_h-alpha%29.jpg/1200px-Andromeda_Galaxy_%28with_h-alpha%29.jpg',
    hdurl: 'https://upload.wikimedia.org/wikipedia/commons/9/98/Andromeda_Galaxy_%28with_h-alpha%29.jpg',
    media_type: 'image',
    copyright: 'NASA, ESA, Hubble Space Telescope',
  },
  {
    title: 'Crab Nebula Supernova Remnant — Hubble',
    date: '2005-12-01',
    explanation:
      'The Crab Nebula is a supernova remnant — the expanding shell of debris from a massive stellar explosion observed in 1054 AD. At the center spins a pulsar, a neutron star rotating 30 times per second, powering the nebula with energetic radiation. The structure spans 11 light-years and lies 6,500 light-years away in Taurus.',
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/00/Crab_Nebula.jpg/1024px-Crab_Nebula.jpg',
    hdurl: 'https://upload.wikimedia.org/wikipedia/commons/0/00/Crab_Nebula.jpg',
    media_type: 'image',
    copyright: 'NASA, ESA, J. Hester, A. Loll (ASU)',
  },
];

// Keywords that strongly suggest today's APOD is a people/event photo rather than astronomy
const NON_ASTRO_KEYWORDS = [
  'award', 'ceremony', 'portrait', 'conference', 'meeting', 'reception',
  'gala', 'banquet', 'dinner', 'celebration', 'colleagues', 'group photo',
  'tuxedo', 'dressed', 'smiling', 'staff', 'team photo', 'mission crew photo',
];

function isNonAstronomicalAPOD(apod: APOD): boolean {
  if (apod.media_type !== 'image') return false;
  const combined = `${apod.title} ${apod.explanation}`.toLowerCase();
  const hits = NON_ASTRO_KEYWORDS.filter((kw) => combined.includes(kw));
  // Two or more people-related keywords = almost certainly not a space image
  return hits.length >= 2;
}

export async function fetchAPOD(): Promise<APOD> {
  try {
    const res = await fetch(`${NASA_BASE}/planetary/apod?api_key=${NASA_API_KEY}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.url && data.media_type) {
        if (!isNonAstronomicalAPOD(data)) {
          return data;
        }
        console.info('[APOD] Today\'s image appears to be a people/event photo — switching to curated space imagery.');
      }
    }
  } catch (err) {
    console.warn('[APOD] Live request failed, using curated fallback:', err);
  }
  // Pick a random curated space image from our gallery
  return ASTRONOMY_FALLBACKS[Math.floor(Math.random() * ASTRONOMY_FALLBACKS.length)];
}

export interface NEOItem {
  id: string;
  name: string;
  hazardous: boolean;
  diameterMeters: { min: number; max: number };
  approach: {
    date: string;
    velocityKps: number;
    missKm: number;
    missLunar: number;
  };
}

const FALLBACK_NEOS: NEOItem[] = [
  {
    id: '3542519',
    name: '276891 (2004 RH340)',
    hazardous: false,
    diameterMeters: { min: 338, max: 738 },
    approach: { date: new Date().toISOString().slice(0, 10), velocityKps: 17.3, missKm: 54300000, missLunar: 141.2 },
  },
  {
    id: '3724831',
    name: '(2007 DX60)',
    hazardous: false,
    diameterMeters: { min: 95, max: 213 },
    approach: { date: new Date().toISOString().slice(0, 10), velocityKps: 6.3, missKm: 65020000, missLunar: 169.1 },
  },
  {
    id: '54016482',
    name: '(2010 KV7)',
    hazardous: false,
    diameterMeters: { min: 17, max: 38 },
    approach: { date: new Date().toISOString().slice(0, 10), velocityKps: 18.7, missKm: 67100000, missLunar: 174.5 },
  },
  {
    id: '3886280',
    name: '(2013 HO11)',
    hazardous: false,
    diameterMeters: { min: 65, max: 145 },
    approach: { date: new Date().toISOString().slice(0, 10), velocityKps: 7.6, missKm: 9710000, missLunar: 25.3 },
  },
  {
    id: '54295804',
    name: '(2018 RV3)',
    hazardous: false,
    diameterMeters: { min: 66, max: 147 },
    approach: { date: new Date().toISOString().slice(0, 10), velocityKps: 10.4, missKm: 57660000, missLunar: 149.9 },
  },
];

export async function fetchNEOToday(): Promise<NEOItem[]> {
  const today = new Date().toISOString().slice(0, 10);
  try {
    const res = await fetch(
      `${NASA_BASE}/neo/rest/v1/feed?start_date=${today}&end_date=${today}&api_key=${NASA_API_KEY}`
    );
    if (res.ok) {
      const json = await res.json();
      const day = json.near_earth_objects?.[today] ?? [];
      if (day.length > 0) {
        return day.map((n: any) => {
          const ca = n.close_approach_data?.[0];
          return {
            id: n.id,
            name: n.name,
            hazardous: n.is_potentially_hazardous_asteroid,
            diameterMeters: {
              min: n.estimated_diameter?.meters?.estimated_diameter_min ?? 0,
              max: n.estimated_diameter?.meters?.estimated_diameter_max ?? 0,
            },
            approach: {
              date: ca?.close_approach_date_full ?? today,
              velocityKps: parseFloat(ca?.relative_velocity?.kilometers_per_second ?? '0'),
              missKm: parseFloat(ca?.miss_distance?.kilometers ?? '0'),
              missLunar: parseFloat(ca?.miss_distance?.lunar ?? '0'),
            },
          } as NEOItem;
        });
      }
    }
  } catch (err) {
    console.warn('[NEO] Live request failed, using telemetry fallback:', err);
  }
  return FALLBACK_NEOS;
}

// NASA Image and Video Library — search by keyword, get first image URL
export async function searchNASAImage(query: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://images-api.nasa.gov/search?q=${encodeURIComponent(query)}&media_type=image`
    );
    if (!res.ok) return null;
    const json = await res.json();
    const first = json.collection?.items?.[0];
    const link = first?.links?.[0]?.href;
    return link ?? null;
  } catch {
    return null;
  }
}
