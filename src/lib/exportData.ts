// Export helpers: CSV with metadata headers, validated FITS BINTABLE, Sky Map PNG snapshots, and JSON summary.

export function downloadBlob(data: BlobPart, filename: string, type: string) {
  const blob = new Blob([data], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export interface ExportValidationResult {
  valid: boolean;
  error?: string;
  rowCount: number;
  columns: string[];
  numericColumns: string[];
}

/**
 * Validates astronomical dataset rows before export
 */
export function validateExportData(rows: Record<string, unknown>[], format: 'CSV' | 'FITS'): ExportValidationResult {
  if (!rows || !Array.isArray(rows) || rows.length === 0) {
    return {
      valid: false,
      error: 'Cannot export: 0 data points selected. Please ensure your dataset is loaded and filter bounds match active points.',
      rowCount: 0,
      columns: [],
      numericColumns: [],
    };
  }

  // Collect all column names and identify numeric columns
  const colSet = new Set<string>();
  const numericColSet = new Set<string>();

  for (const r of rows) {
    if (r && typeof r === 'object') {
      for (const [k, v] of Object.entries(r)) {
        colSet.add(k);
        if (typeof v === 'number' && !Number.isNaN(v)) {
          numericColSet.add(k);
        }
      }
    }
  }

  const columns = Array.from(colSet);
  const numericColumns = Array.from(numericColSet);

  if (columns.length === 0) {
    return {
      valid: false,
      error: 'Cannot export: Dataset rows contain no attributes or columns.',
      rowCount: rows.length,
      columns: [],
      numericColumns: [],
    };
  }

  if (format === 'FITS' && numericColumns.length === 0) {
    return {
      valid: false,
      error: 'Cannot export FITS BINTABLE: At least one numeric column (e.g. coordinates or magnitude) is required.',
      rowCount: rows.length,
      columns,
      numericColumns: [],
    };
  }

  return {
    valid: true,
    rowCount: rows.length,
    columns,
    numericColumns,
  };
}

/**
 * Generates CSV string with optional embedded Analysis Summary header comments
 */
export function rowsToCSV(rows: Record<string, unknown>[], summaryMetadata?: Record<string, unknown>): string {
  const validation = validateExportData(rows, 'CSV');
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const cols = validation.columns;
  const esc = (v: unknown) => {
    if (v == null) return '';
    const s = String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const headerComments: string[] = [];
  if (summaryMetadata) {
    headerComments.push('# ==============================================================================');
    headerComments.push('# COSMIC DATA FUSION - STANDARDIZED ASTROPHYSICAL DATASET');
    headerComments.push(`# Exported At: ${new Date().toISOString()}`);
    if (summaryMetadata.dataset) headerComments.push(`# Dataset Name: ${summaryMetadata.dataset}`);
    if (summaryMetadata.coordinateSystem) headerComments.push(`# Coordinate System: ${summaryMetadata.coordinateSystem}`);
    if (summaryMetadata.qualityScore != null) headerComments.push(`# Pipeline Quality Score: ${summaryMetadata.qualityScore}/100`);
    if (summaryMetadata.completeness != null) headerComments.push(`# Data Completeness: ${summaryMetadata.completeness}%`);
    headerComments.push(`# Records Exported: ${rows.length}`);
    headerComments.push('# ==============================================================================');
  }

  const csvRows = [cols.join(','), ...rows.map(r => cols.map(c => esc(r[c])).join(','))];
  return [...headerComments, ...csvRows].join('\n');
}

const card = (k: string, v: string, comment = '') => {
  const s = `${k.padEnd(8)}= ${v.padStart(20)}${comment ? ' / ' + comment : ''}`;
  return s.slice(0, 80).padEnd(80);
};

const strVal = (s: string) => `'${s.replace(/'/g, "''").slice(0, 68).padEnd(8)}'`;
const pad2880 = (len: number) => (2880 - (len % 2880)) % 2880;

/**
 * Writes numeric columns as 64-bit IEEE doubles in a standard FITS BINTABLE extension,
 * embedding the Analysis Summary metadata directly into the Primary HDU headers.
 */
export function rowsToFITS(
  rows: Record<string, unknown>[],
  extname = "STANDARDIZED",
  summaryMetadata?: Record<string, unknown>
): ArrayBuffer {
  const validation = validateExportData(rows, 'FITS');
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const cols = validation.numericColumns.slice(0, 999);
  const rowBytes = cols.length * 8;

  // Build Primary Header with analysis summary
  const primaryCards: string[] = [
    card('SIMPLE', 'T'),
    card('BITPIX', '8'),
    card('NAXIS', '0'),
    card('EXTEND', 'T'),
    card('ORIGIN', strVal('COSMIC Data Fusion Platform')),
    card('DATE', strVal(new Date().toISOString().split('T')[0])),
  ];

  if (summaryMetadata) {
    if (summaryMetadata.dataset) {
      primaryCards.push(card('DATASET', strVal(String(summaryMetadata.dataset).slice(0, 40))));
    }
    if (summaryMetadata.coordinateSystem) {
      primaryCards.push(card('RADESYS', strVal(String(summaryMetadata.coordinateSystem).toUpperCase())));
    }
    if (summaryMetadata.qualityScore != null) {
      primaryCards.push(card('QUALITY', String(Math.round(Number(summaryMetadata.qualityScore))), 'Quality score 0-100'));
    }
    if (summaryMetadata.completeness != null) {
      primaryCards.push(card('COMPLET', String(Math.round(Number(summaryMetadata.completeness))), 'Completeness percent'));
    }
    primaryCards.push(card('NRECORDS', String(rows.length), 'Total standardized rows'));
  }

  primaryCards.push('END'.padEnd(80));
  const primaryHdr = primaryCards.join('');

  // Build BINTABLE extension header
  const extCards: string[] = [
    card('XTENSION', strVal('BINTABLE')),
    card('BITPIX', '8'),
    card('NAXIS', '2'),
    card('NAXIS1', String(rowBytes)),
    card('NAXIS2', String(rows.length)),
    card('PCOUNT', '0'),
    card('GCOUNT', '1'),
    card('TFIELDS', String(cols.length)),
  ];

  cols.forEach((c, i) => {
    extCards.push(card(`TTYPE${i + 1}`, strVal(c.replace(/[^\x20-\x7e]/g, '').slice(0, 60))));
    extCards.push(card(`TFORM${i + 1}`, strVal('D'))); // 64-bit float
  });

  extCards.push(card('EXTNAME', strVal(extname)));
  extCards.push('END'.padEnd(80));
  const extHdr = extCards.join('');

  const dataLen = rowBytes * rows.length;
  const total =
    primaryHdr.length +
    pad2880(primaryHdr.length) +
    extHdr.length +
    pad2880(extHdr.length) +
    dataLen +
    pad2880(dataLen);

  const out = new Uint8Array(total);
  let o = 0;
  const writeStr = (s: string) => {
    for (let i = 0; i < s.length; i++) out[o++] = s.charCodeAt(i);
  };

  writeStr(primaryHdr);
  writeStr(' '.repeat(pad2880(primaryHdr.length)));

  writeStr(extHdr);
  writeStr(' '.repeat(pad2880(extHdr.length)));

  const dv = new DataView(out.buffer);
  for (const r of rows) {
    for (const c of cols) {
      const v = r[c];
      dv.setFloat64(o, typeof v === 'number' && !Number.isNaN(v) ? v : NaN, false);
      o += 8;
    }
  }

  return out.buffer as ArrayBuffer;
}

/**
 * Captures the Sky Map WebGL Canvas as a high-resolution PNG image
 */
export function captureSkyMapCanvas(canvasOrContainer: HTMLElement | null, filename: string): boolean {
  if (!canvasOrContainer) {
    throw new Error('Sky Map view element not found. Please ensure the sky map is rendered on screen.');
  }

  const canvas = (canvasOrContainer.tagName === 'CANVAS'
    ? canvasOrContainer
    : canvasOrContainer.querySelector('canvas')) as HTMLCanvasElement | null;

  if (!canvas) {
    throw new Error('No active WebGL canvas detected in the Sky Map container.');
  }

  try {
    const dataUrl = canvas.toDataURL('image/png');
    if (!dataUrl || dataUrl === 'data:,') {
      throw new Error('Canvas buffer empty. Please move the view or enable preserveDrawingBuffer.');
    }

    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename.endsWith('.png') ? filename : `${filename}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return true;
  } catch (err: any) {
    throw new Error(`Failed to capture Sky Map canvas: ${err?.message || 'Rendering context error'}`);
  }
}
