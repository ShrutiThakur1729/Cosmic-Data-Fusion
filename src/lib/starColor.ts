// Spectral-class based star colors and magnitude-based sizing / brightness.

// Known spectral classes for the built-in catalog (approximate).
const KNOWN_SPECTRAL: Record<string, string> = {
  'Sirius A': 'A1V',
  'Betelgeuse': 'M1',
  'Rigel': 'B8',
  'Vega': 'A0V',
  'Polaris (North Star)': 'F7',
  'Arcturus': 'K1III',
  'Alpha Centauri': 'G2V',
  'Canopus': 'A9II',
  'Procyon': 'F5IV',
  'Capella': 'G5III',
};

// Return an RGB hex color for a spectral class letter (O B A F G K M).
export function colorForSpectralClass(spectral?: string): string {
  if (!spectral) return '#ffffff';
  const cls = spectral[0].toUpperCase();
  switch (cls) {
    case 'O': return '#9bb8ff';
    case 'B': return '#aac6ff';
    case 'A': return '#cad7ff';
    case 'F': return '#f8f7ff';
    case 'G': return '#fff4e8';
    case 'K': return '#ffd2a1';
    case 'M': return '#ffb069';
    default:  return '#ffffff';
  }
}

export function colorForObject(name: string, type: string): string {
  const spec = KNOWN_SPECTRAL[name];
  if (spec) return colorForSpectralClass(spec);
  switch (type) {
    case 'galaxy':  return '#c9a7ff';
    case 'nebula':  return '#ff9dc9';
    case 'cluster': return '#ffe08a';
    case 'planet':  return '#8ee6b8';
    default:        return '#ffffff';
  }
}

// Magnitude to visible radius (world units). Brighter (lower mag) = larger.
// Formula tuned so mag -1.5 ≈ 0.22, mag 0 ≈ 0.14, mag 3 ≈ 0.07, mag 6 ≈ 0.035, mag 9 ≈ 0.02
export function radiusFromMagnitude(mag: number): number {
  const clamped = Math.max(-2, Math.min(mag, 10));
  const t = Math.pow(2.512, -clamped / 5); // brightness ratio to mag 0
  return 0.09 + Math.min(0.18, t * 0.10);
}

// Glow intensity 0..1 from magnitude.
export function glowFromMagnitude(mag: number): number {
  const clamped = Math.max(-2, Math.min(mag, 8));
  return Math.max(0.15, Math.min(1, (6 - clamped) / 7));
}

// Build a soft circular gradient texture used by billboards / sprites.
let _spriteTex: any = null;
export function getStarSpriteTexture(THREE: typeof import('three')) {
  if (_spriteTex) return _spriteTex;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.2, 'rgba(255,255,255,0.85)');
  grad.addColorStop(0.5, 'rgba(255,255,255,0.25)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  _spriteTex = new THREE.CanvasTexture(canvas);
  return _spriteTex;
}

// Convert decimal degrees to HMS / DMS strings.
export function raToHMS(deg: number): string {
  const total = ((deg % 360) + 360) % 360;
  const hours = total / 15;
  const h = Math.floor(hours);
  const mFloat = (hours - h) * 60;
  const m = Math.floor(mFloat);
  const s = (mFloat - m) * 60;
  return `${String(h).padStart(2,'0')}h ${String(m).padStart(2,'0')}m ${s.toFixed(2)}s`;
}

export function decToDMS(deg: number): string {
  const sign = deg < 0 ? '-' : '+';
  const abs = Math.abs(deg);
  const d = Math.floor(abs);
  const mFloat = (abs - d) * 60;
  const m = Math.floor(mFloat);
  const s = (mFloat - m) * 60;
  return `${sign}${String(d).padStart(2,'0')}° ${String(m).padStart(2,'0')}′ ${s.toFixed(1)}″`;
}
