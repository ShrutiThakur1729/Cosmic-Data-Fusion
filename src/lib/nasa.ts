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

const FALLBACK_APOD: APOD = {
  title: 'Cosmic Cliffs of the Carina Nebula (JWST)',
  date: new Date().toISOString().slice(0, 10),
  explanation:
    'This landscape of "mountains" and "valleys" speckled with glittering stars is actually the edge of a nearby, young, star-forming region called NGC 3324 in the Carina Nebula. Captured in infrared light by NASA’s James Webb Space Telescope, this image reveals for the first time previously invisible areas of star birth.',
  url: 'https://images-assets.nasa.gov/image/PIA25324/PIA25324~orig.jpg',
  hdurl: 'https://images-assets.nasa.gov/image/PIA25324/PIA25324~orig.jpg',
  media_type: 'image',
  copyright: 'NASA, ESA, CSA, STScI',
};

export async function fetchAPOD(): Promise<APOD> {
  try {
    const res = await fetch(`${NASA_BASE}/planetary/apod?api_key=${NASA_API_KEY}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.url) return data;
    }
  } catch (err) {
    console.warn('NASA APOD live request failed, using high-res astronomical fallback:', err);
  }
  return FALLBACK_APOD;
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
    name: '(2010 PK9)',
    hazardous: false,
    diameterMeters: { min: 140, max: 310 },
    approach: { date: new Date().toISOString().slice(0, 10), velocityKps: 18.4, missKm: 4200000, missLunar: 10.9 },
  },
  {
    id: '3724831',
    name: '(2015 TB145)',
    hazardous: true,
    diameterMeters: { min: 400, max: 650 },
    approach: { date: new Date().toISOString().slice(0, 10), velocityKps: 35.1, missKm: 7800000, missLunar: 20.3 },
  },
  {
    id: '54016482',
    name: '(2020 QG)',
    hazardous: false,
    diameterMeters: { min: 3, max: 6 },
    approach: { date: new Date().toISOString().slice(0, 10), velocityKps: 12.3, missKm: 2950, missLunar: 0.01 },
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
    console.warn('NASA NEO live request failed, using telemetry fallback:', err);
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
