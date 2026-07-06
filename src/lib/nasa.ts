// NASA Open API helpers. The key is a public, rate-limited API key.
export const NASA_API_KEY =
  (import.meta.env.VITE_NASA_API_KEY as string | undefined) ||
  '4zd9ILEwaOTxf7UpFP9A2M4F2FdjIVZ7KRzDe2Eh';

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

export async function fetchAPOD(): Promise<APOD> {
  const res = await fetch(`${NASA_BASE}/planetary/apod?api_key=${NASA_API_KEY}`);
  if (!res.ok) throw new Error('APOD fetch failed');
  return res.json();
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

export async function fetchNEOToday(): Promise<NEOItem[]> {
  const today = new Date().toISOString().slice(0, 10);
  const res = await fetch(
    `${NASA_BASE}/neo/rest/v1/feed?start_date=${today}&end_date=${today}&api_key=${NASA_API_KEY}`
  );
  if (!res.ok) throw new Error('NEO fetch failed');
  const json = await res.json();
  const day = json.near_earth_objects?.[today] ?? [];
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
