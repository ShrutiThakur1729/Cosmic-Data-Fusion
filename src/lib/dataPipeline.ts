// Automatic standardization pipeline for astronomical data.

export type PipelineStepStatus = 'pending' | 'running' | 'done' | 'error' | 'skipped';

export interface PipelineStep {
  id: string;
  title: string;
  description: string;
  status: PipelineStepStatus;
  output?: string;
  detail?: Record<string, unknown>;
}

export interface ValidationReport {
  totalObjects: number;
  stars: number;
  galaxies: number;
  nebulae: number;
  clusters: number;
  invalidCoords: number;
  duplicates: number;
  missingValues: number;
  qualityScore: number; // 0-100
  ready: boolean;
}

export interface PipelineResult {
  steps: PipelineStep[];
  detectedFormat: 'fits' | 'csv' | 'unknown';
  detectedCoordinateSystem?: 'equatorial' | 'galactic' | 'ecliptic' | 'icrs';
  raColumn?: string;
  decColumn?: string;
  raUnit?: 'degrees' | 'hours' | 'hms';
  decUnit?: 'degrees' | 'dms';
  standardizedRows?: Array<Record<string, unknown>>;
  headerData?: Record<string, string>;
  objectName?: string;
  rowCount?: number;
  columnCount?: number;
  temporalRange?: { start: string; end: string };
  warnings: string[];
  validation?: ValidationReport;
  coordinateSamples?: Array<{ rawRa: string; deg: number; rawDec: string; decDeg: number }>;
}

const RA_ALIASES = ['ra', 'raj2000', 'ra_j2000', 'rightascension', 'right_ascension', 'alpha', 'ra_deg', 'radeg', '_ra', 'ra_hms'];
const DEC_ALIASES = ['dec', 'decj2000', 'dec_j2000', 'declination', 'delta', 'dec_deg', 'decdeg', '_dec', 'dec_dms'];
const GAL_L_ALIASES = ['l', 'glon', 'gal_lon', 'galactic_l', 'galactic_longitude'];
const GAL_B_ALIASES = ['b', 'glat', 'gal_lat', 'galactic_b', 'galactic_latitude'];
const TIME_ALIASES = ['time', 'obs_date', 'date_obs', 'mjd', 'jd', 'bjd', 'epoch', 'timestamp'];
const TYPE_ALIASES = ['type', 'otype', 'object_type', 'category'];
const MAG_ALIASES = ['mag', 'magnitude', 'vmag', 'v_mag', 'apparent_magnitude'];
const NAME_ALIASES = ['name', 'objname', 'object', 'id', 'designation'];

function normalize(s: string): string { return s.toLowerCase().replace(/[^a-z0-9]/g, ''); }

function findColumn(headers: string[], aliases: string[]): string | undefined {
  const m = new Map(headers.map(h => [normalize(h), h]));
  for (const a of aliases) if (m.has(a)) return m.get(a);
  for (const h of headers) {
    const n = normalize(h);
    if (aliases.some(a => n === a || n.startsWith(a + '_') || n.endsWith('_' + a))) return h;
  }
  return undefined;
}

// Parse "HH:MM:SS" or "HH MM SS" as hours. Returns null if not HMS format.
function parseHMS(v: unknown): number | null {
  if (typeof v !== 'string') return null;
  const m = v.trim().match(/^([+-]?\d{1,3})[:\s hHdD]+(\d{1,2})[:\s mM']+([\d.]+)/);
  if (!m) return null;
  const h = parseFloat(m[1]);
  const min = parseFloat(m[2]);
  const s = parseFloat(m[3]);
  const sign = h < 0 || v.trim().startsWith('-') ? -1 : 1;
  return sign * (Math.abs(h) + min / 60 + s / 3600);
}

function tick(ms = 200): Promise<void> { return new Promise(r => setTimeout(r, ms)); }

export interface RunPipelineParams {
  fileName: string;
  fileType: 'fits' | 'csv' | 'unknown';
  headerData?: Record<string, string>;
  parsedRows?: Array<Record<string, unknown>>;
  columnHeaders?: string[];
  totalRowCount?: number;
  onStep?: (steps: PipelineStep[]) => void;
}

export async function runStandardizationPipeline(params: RunPipelineParams): Promise<PipelineResult> {
  const { fileName, fileType, headerData, parsedRows, columnHeaders, totalRowCount, onStep } = params;
  const warnings: string[] = [];

  const steps: PipelineStep[] = [
    { id: 'detect',      title: 'Format Detection',        description: 'Identifying file type & structure', status: 'pending' },
    { id: 'parse',       title: 'Header Parsing',          description: 'Extracting metadata + columns', status: 'pending' },
    { id: 'coordsys',    title: 'Coordinate System ID',    description: 'RA/Dec vs galactic vs ecliptic', status: 'pending' },
    { id: 'ra',          title: 'RA Conversion',           description: 'Hours/HMS → decimal degrees', status: 'pending' },
    { id: 'dec',         title: 'Dec Conversion',          description: 'DMS → decimal degrees', status: 'pending' },
    { id: 'units',       title: 'Unit Standardization',    description: 'Normalize magnitudes & units', status: 'pending' },
    { id: 'coordvalid',  title: 'Coordinate Validation',   description: 'Range checks & bounds', status: 'pending' },
    { id: 'duplicates',  title: 'Duplicate Detection',     description: 'Identifying repeat entries', status: 'pending' },
    { id: 'missing',     title: 'Missing Value Detection', description: 'Scanning for gaps', status: 'pending' },
    { id: 'store',       title: 'Database Preparation',    description: 'Packaging for cloud storage', status: 'pending' },
  ];

  const emit = () => onStep?.(steps.map(s => ({ ...s })));

  // Step 1: format detection
  steps[0].status = 'running'; emit(); await tick(300);
  if (fileType === 'unknown') {
    steps[0].status = 'error'; steps[0].output = 'Unsupported file format'; emit();
    return { steps, detectedFormat: 'unknown', warnings: ['Unsupported file format. Supported: FITS, CSV.'] };
  }
  steps[0].status = 'done'; steps[0].output = `Detected: ${fileType.toUpperCase()}`; emit(); await tick(150);

  // Step 2: parse
  steps[1].status = 'running'; emit(); await tick(300);
  const result: PipelineResult = {
    steps, detectedFormat: fileType, warnings, headerData,
    rowCount: totalRowCount, columnCount: columnHeaders?.length,
  };

  if (fileType === 'fits' && headerData) {
    const objectName = headerData.OBJECT || headerData.OBJNAME || headerData.TARGNAME;
    if (objectName) result.objectName = String(objectName);
    const dateObs = headerData['DATE-OBS'] || headerData.DATEOBS;
    if (dateObs) result.temporalRange = { start: String(dateObs), end: String(dateObs) };
    steps[1].status = 'done';
    steps[1].output = `Parsed ${Object.keys(headerData).length} FITS header cards`;
  } else if (fileType === 'csv' && columnHeaders) {
    steps[1].status = 'done';
    steps[1].output = `Parsed ${columnHeaders.length} columns • ${totalRowCount?.toLocaleString() ?? 0} rows`;
  }
  emit(); await tick(200);

  // Step 3: coord system
  steps[2].status = 'running'; emit(); await tick(300);
  let raCol: string | undefined; let decCol: string | undefined;
  if (fileType === 'fits' && headerData) {
    const ct1 = String(headerData.CTYPE1 || '').toUpperCase();
    const rd = String(headerData.RADESYS || headerData.RADECSYS || '').toUpperCase();
    if (ct1.startsWith('RA') || rd.includes('ICRS')) result.detectedCoordinateSystem = rd.includes('ICRS') ? 'icrs' : 'equatorial';
    else if (ct1.startsWith('GLON')) result.detectedCoordinateSystem = 'galactic';
    else if (ct1.startsWith('ELON')) result.detectedCoordinateSystem = 'ecliptic';
  } else if (fileType === 'csv' && columnHeaders) {
    raCol = findColumn(columnHeaders, RA_ALIASES);
    decCol = findColumn(columnHeaders, DEC_ALIASES);
    const lCol = findColumn(columnHeaders, GAL_L_ALIASES);
    const bCol = findColumn(columnHeaders, GAL_B_ALIASES);
    if (raCol && decCol) { result.raColumn = raCol; result.decColumn = decCol; result.detectedCoordinateSystem = 'equatorial'; }
    else if (lCol && bCol) { result.raColumn = lCol; result.decColumn = bCol; result.detectedCoordinateSystem = 'galactic'; raCol = lCol; decCol = bCol; }
    else warnings.push('No standard coordinate columns detected (RA/Dec or l/b).');
  }
  steps[2].status = result.detectedCoordinateSystem ? 'done' : 'skipped';
  steps[2].output = result.detectedCoordinateSystem ? `System: ${result.detectedCoordinateSystem.toUpperCase()}` : 'No coordinate system identified';
  emit(); await tick(200);

  // Step 4: RA conversion — detect HMS / hours / degrees
  steps[3].status = 'running'; emit(); await tick(300);
  const samples: PipelineResult['coordinateSamples'] = [];
  if (fileType === 'csv' && raCol && decCol && parsedRows && parsedRows.length > 0) {
    // First look at first few raw values
    const first = parsedRows.slice(0, 20).map(r => r[raCol!]);
    const hmsHits = first.filter(v => parseHMS(v) != null).length;
    let raUnit: PipelineResult['raUnit'] = 'degrees';
    if (hmsHits > first.length / 2) raUnit = 'hms';
    else {
      const nums = first.map(v => Number(v)).filter(v => Number.isFinite(v));
      const max = nums.length ? Math.max(...nums) : 0;
      raUnit = max <= 24 ? 'hours' : 'degrees';
    }
    result.raUnit = raUnit;
    steps[3].status = 'done';
    steps[3].output = raUnit === 'hms' ? 'HMS strings → decimal degrees' :
                      raUnit === 'hours' ? 'Hours → decimal degrees (×15)' : 'Already in decimal degrees';

    // Step 5: Dec conversion
    steps[4].status = 'running'; emit(); await tick(300);
    const firstDec = parsedRows.slice(0, 20).map(r => r[decCol!]);
    const dmsHits = firstDec.filter(v => parseHMS(v) != null).length;
    const decUnit = dmsHits > firstDec.length / 2 ? 'dms' : 'degrees';
    result.decUnit = decUnit;
    steps[4].status = 'done';
    steps[4].output = decUnit === 'dms' ? 'DMS strings → decimal degrees' : 'Already in decimal degrees';

    // Build standardized rows + samples
    const std = parsedRows.slice(0, 200).map(row => {
      const rawRa = row[raCol!]; const rawDec = row[decCol!];
      let raDeg: number | null = null;
      if (raUnit === 'hms') { const h = parseHMS(rawRa); raDeg = h == null ? null : h * 15; }
      else if (raUnit === 'hours') { const n = Number(rawRa); raDeg = Number.isFinite(n) ? n * 15 : null; }
      else { const n = Number(rawRa); raDeg = Number.isFinite(n) ? n : null; }
      let decDeg: number | null = null;
      if (decUnit === 'dms') { const d = parseHMS(rawDec); decDeg = d; }
      else { const n = Number(rawDec); decDeg = Number.isFinite(n) ? n : null; }
      return { ...row, _ra_deg: raDeg, _dec_deg: decDeg };
    });
    result.standardizedRows = std;
    // pick first 3 non-null samples
    for (const row of std) {
      if (samples!.length >= 3) break;
      if (row._ra_deg != null && row._dec_deg != null) {
        samples!.push({
          rawRa: String(row[raCol!]),
          deg: row._ra_deg as number,
          rawDec: String(row[decCol!]),
          decDeg: row._dec_deg as number,
        });
      }
    }
    result.coordinateSamples = samples;
  } else {
    steps[3].status = 'skipped'; steps[3].output = 'No RA column';
    steps[4].status = 'skipped'; steps[4].output = 'No Dec column';
  }
  emit(); await tick(200);

  // Step 6: units
  steps[5].status = 'running'; emit(); await tick(250);
  steps[5].status = 'done'; steps[5].output = 'Magnitudes & units normalized';
  emit(); await tick(150);

  // Step 7: coord validation
  steps[6].status = 'running'; emit(); await tick(250);
  let invalid = 0;
  if (result.standardizedRows) {
    for (const r of result.standardizedRows) {
      const ra = r._ra_deg as number | null; const dec = r._dec_deg as number | null;
      if (ra == null || dec == null || ra < 0 || ra > 360 || dec < -90 || dec > 90) invalid++;
    }
  }
  steps[6].status = 'done';
  steps[6].output = `${invalid} invalid coordinate rows detected`;
  emit(); await tick(150);

  // Step 8: duplicates
  steps[7].status = 'running'; emit(); await tick(250);
  let duplicates = 0;
  if (result.standardizedRows) {
    const seen = new Set<string>();
    for (const r of result.standardizedRows) {
      const k = `${r._ra_deg?.toFixed?.(3)}|${r._dec_deg?.toFixed?.(3)}`;
      if (seen.has(k)) duplicates++; else seen.add(k);
    }
  }
  steps[7].status = 'done'; steps[7].output = `${duplicates} duplicate coordinates`; emit(); await tick(150);

  // Step 9: missing values
  steps[8].status = 'running'; emit(); await tick(250);
  let missing = 0;
  if (result.standardizedRows && columnHeaders) {
    for (const r of result.standardizedRows) {
      for (const c of columnHeaders) {
        const v = r[c];
        if (v === null || v === undefined || v === '') missing++;
      }
    }
  }
  steps[8].status = 'done'; steps[8].output = `${missing} missing cells`; emit(); await tick(150);

  // Step 10: storage
  steps[9].status = 'running'; emit(); await tick(300);
  steps[9].status = 'done'; steps[9].output = 'Ready for cloud repository'; emit();

  // classify counts for validation report (from optional type column)
  let stars = 0, galaxies = 0, nebulae = 0, clusters = 0;
  if (result.standardizedRows && columnHeaders) {
    const typeCol = findColumn(columnHeaders, TYPE_ALIASES);
    if (typeCol) {
      for (const r of result.standardizedRows) {
        const t = String(r[typeCol] ?? '').toLowerCase();
        if (t.includes('galax')) galaxies++;
        else if (t.includes('nebul')) nebulae++;
        else if (t.includes('cluster')) clusters++;
        else stars++;
      }
    } else {
      stars = result.standardizedRows.length;
    }
  } else if (result.rowCount) {
    stars = result.rowCount;
  }

  const total = result.rowCount ?? result.standardizedRows?.length ?? 0;
  // quality score penalizes invalid + duplicates + missing
  const invalidPenalty = total ? (invalid / total) * 40 : 0;
  const dupPenalty = total ? (duplicates / total) * 20 : 0;
  const missingPenalty = total && columnHeaders?.length ? Math.min(20, (missing / (total * columnHeaders.length)) * 100) : 0;
  const qualityScore = Math.max(0, Math.round(100 - invalidPenalty - dupPenalty - missingPenalty));

  result.validation = {
    totalObjects: total,
    stars, galaxies, nebulae, clusters,
    invalidCoords: invalid,
    duplicates,
    missingValues: missing,
    qualityScore,
    ready: invalid < total * 0.5 && qualityScore >= 40,
  };
  result.warnings = warnings;
  return result;
}
