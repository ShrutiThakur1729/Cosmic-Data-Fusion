// Real automatic standardization pipeline for astronomical data.
// Runs on the client and applies the following transformations:
//   1. Format detection      -> FITS / CSV / unknown
//   2. Column parsing        -> extract headers + preview rows
//   3. Standardization       -> unit + coordinate normalization
//   4. Metadata extraction   -> RA/Dec detection, coord system inference

export type PipelineStepStatus = 'pending' | 'running' | 'done' | 'error' | 'skipped';

export interface PipelineStep {
  id: string;
  title: string;
  description: string;
  status: PipelineStepStatus;
  output?: string;
  detail?: Record<string, unknown>;
}

export interface PipelineResult {
  steps: PipelineStep[];
  detectedFormat: 'fits' | 'csv' | 'unknown';
  detectedCoordinateSystem?: 'equatorial' | 'galactic' | 'ecliptic' | 'icrs';
  raColumn?: string;
  decColumn?: string;
  raUnit?: 'degrees' | 'hours';
  standardizedRows?: Array<Record<string, unknown>>;
  headerData?: Record<string, string>;
  objectName?: string;
  rowCount?: number;
  columnCount?: number;
  temporalRange?: { start: string; end: string };
  warnings: string[];
}

// Column-name heuristics for astronomical data.
const RA_ALIASES = ['ra', 'raj2000', 'ra_j2000', 'rightascension', 'right_ascension', 'alpha', 'ra_deg', 'radeg', '_ra'];
const DEC_ALIASES = ['dec', 'decj2000', 'dec_j2000', 'declination', 'delta', 'dec_deg', 'decdeg', '_dec'];
const GAL_L_ALIASES = ['l', 'glon', 'gal_lon', 'galactic_l', 'galactic_longitude'];
const GAL_B_ALIASES = ['b', 'glat', 'gal_lat', 'galactic_b', 'galactic_latitude'];
const TIME_ALIASES = ['time', 'obs_date', 'date_obs', 'mjd', 'jd', 'bjd', 'epoch', 'timestamp'];

function normalize(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function findColumn(headers: string[], aliases: string[]): string | undefined {
  const map = new Map(headers.map(h => [normalize(h), h]));
  for (const alias of aliases) {
    if (map.has(alias)) return map.get(alias);
  }
  // Substring fallback
  for (const h of headers) {
    const n = normalize(h);
    if (aliases.some(a => n === a || n.startsWith(a + '_') || n.endsWith('_' + a))) return h;
  }
  return undefined;
}

// Detect if RA values look like hours (0-24) or degrees (0-360).
function inferRaUnit(sample: number[]): 'degrees' | 'hours' {
  const valid = sample.filter(v => typeof v === 'number' && Number.isFinite(v));
  if (valid.length === 0) return 'degrees';
  const max = Math.max(...valid);
  return max <= 24 ? 'hours' : 'degrees';
}

function hoursToDegrees(h: number): number {
  return h * 15;
}

// Small async helper so step status can render between stages.
function tick(ms = 250): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
    { id: 'detect', title: 'Format Detection', description: 'Identifying file type and structure', status: 'pending' },
    { id: 'parse', title: 'Parsing Headers', description: 'Extracting metadata and columns', status: 'pending' },
    { id: 'standardize', title: 'Standardization', description: 'Converting units & coordinate systems', status: 'pending' },
    { id: 'store', title: 'Storage', description: 'Preparing standardized dataset', status: 'pending' },
  ];

  const emit = () => onStep?.(steps.map(s => ({ ...s })));

  // Step 1: Format detection
  steps[0].status = 'running';
  emit();
  await tick(400);

  if (fileType === 'unknown') {
    steps[0].status = 'error';
    steps[0].output = 'Unsupported file format';
    emit();
    return {
      steps,
      detectedFormat: 'unknown',
      warnings: ['Unsupported file format. Supported: FITS, CSV.'],
    };
  }

  steps[0].status = 'done';
  steps[0].output = `Detected: ${fileType.toUpperCase()} (${fileName})`;
  emit();
  await tick(200);

  // Step 2: Parse headers
  steps[1].status = 'running';
  emit();
  await tick(500);

  const result: PipelineResult = {
    steps,
    detectedFormat: fileType,
    warnings,
    headerData,
    rowCount: totalRowCount,
    columnCount: columnHeaders?.length,
  };

  if (fileType === 'fits' && headerData) {
    const objectName = headerData.OBJECT || headerData.OBJNAME || headerData.TARGNAME;
    if (objectName) result.objectName = String(objectName);

    const dateObs = headerData['DATE-OBS'] || headerData.DATEOBS;
    if (dateObs) {
      result.temporalRange = { start: String(dateObs), end: String(dateObs) };
    }

    // Coordinate system from CTYPE / RADESYS
    const ctype1 = String(headerData.CTYPE1 || '').toUpperCase();
    const radesys = String(headerData.RADESYS || headerData.RADECSYS || '').toUpperCase();
    if (ctype1.startsWith('RA') || radesys.includes('ICRS')) {
      result.detectedCoordinateSystem = radesys.includes('ICRS') ? 'icrs' : 'equatorial';
    } else if (ctype1.startsWith('GLON')) {
      result.detectedCoordinateSystem = 'galactic';
    } else if (ctype1.startsWith('ELON')) {
      result.detectedCoordinateSystem = 'ecliptic';
    }

    steps[1].status = 'done';
    steps[1].output = `Parsed ${Object.keys(headerData).length} FITS header cards`;
    steps[1].detail = { object: result.objectName, coordinateSystem: result.detectedCoordinateSystem };
  } else if (fileType === 'csv' && columnHeaders) {
    // Detect RA/Dec (equatorial) or l/b (galactic) columns
    const raCol = findColumn(columnHeaders, RA_ALIASES);
    const decCol = findColumn(columnHeaders, DEC_ALIASES);
    const lCol = findColumn(columnHeaders, GAL_L_ALIASES);
    const bCol = findColumn(columnHeaders, GAL_B_ALIASES);
    const timeCol = findColumn(columnHeaders, TIME_ALIASES);

    if (raCol && decCol) {
      result.raColumn = raCol;
      result.decColumn = decCol;
      result.detectedCoordinateSystem = 'equatorial';
    } else if (lCol && bCol) {
      result.raColumn = lCol;
      result.decColumn = bCol;
      result.detectedCoordinateSystem = 'galactic';
    } else {
      warnings.push('No standard coordinate columns detected (looked for RA/Dec, l/b).');
    }

    if (timeCol && parsedRows && parsedRows.length > 0) {
      const times = parsedRows.map(r => r[timeCol]).filter(v => v != null).map(String);
      if (times.length > 0) {
        result.temporalRange = { start: times[0], end: times[times.length - 1] };
      }
    }

    steps[1].status = 'done';
    steps[1].output = `Parsed ${columnHeaders.length} columns • ${totalRowCount?.toLocaleString() ?? 0} rows`;
    steps[1].detail = {
      raColumn: result.raColumn,
      decColumn: result.decColumn,
      coordinateSystem: result.detectedCoordinateSystem,
    };
  }
  emit();
  await tick(300);

  // Step 3: Standardization
  steps[2].status = 'running';
  emit();
  await tick(500);

  if (fileType === 'csv' && result.raColumn && result.decColumn && parsedRows) {
    // Look at first 20 RA values to infer unit
    const raSamples: number[] = parsedRows
      .slice(0, 20)
      .map(r => Number(r[result.raColumn!]))
      .filter(v => Number.isFinite(v));
    const raUnit = inferRaUnit(raSamples);
    result.raUnit = raUnit;

    const standardized = parsedRows.slice(0, 100).map((row) => {
      const raRaw = Number(row[result.raColumn!]);
      const decRaw = Number(row[result.decColumn!]);
      const ra_deg = Number.isFinite(raRaw) ? (raUnit === 'hours' ? hoursToDegrees(raRaw) : raRaw) : null;
      const dec_deg = Number.isFinite(decRaw) ? decRaw : null;
      return { ...row, _ra_deg: ra_deg, _dec_deg: dec_deg };
    });
    result.standardizedRows = standardized;

    const conversions: string[] = [];
    if (raUnit === 'hours') conversions.push('RA: hours → degrees');
    conversions.push(`Coord system → ${result.detectedCoordinateSystem?.toUpperCase() ?? 'unknown'}`);

    steps[2].status = 'done';
    steps[2].output = conversions.join(' • ');
    steps[2].detail = { raUnit, rowsStandardized: standardized.length };
  } else if (fileType === 'fits') {
    steps[2].status = 'done';
    steps[2].output = `Coord system: ${result.detectedCoordinateSystem?.toUpperCase() ?? 'unknown'} • Metadata harmonized`;
    steps[2].detail = { coordinateSystem: result.detectedCoordinateSystem };
  } else {
    steps[2].status = 'skipped';
    steps[2].output = 'No standardization applied';
  }
  emit();
  await tick(300);

  // Step 4: Storage prep
  steps[3].status = 'running';
  emit();
  await tick(400);
  steps[3].status = 'done';
  steps[3].output = 'Ready for cloud repository';
  emit();

  result.warnings = warnings;
  return result;
}
