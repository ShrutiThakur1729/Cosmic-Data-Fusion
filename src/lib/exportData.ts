// Export helpers: CSV, minimal FITS BINTABLE, and JSON summary.

export function downloadBlob(data: BlobPart, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function rowsToCSV(rows: Record<string, unknown>[]): string {
  if (!rows.length) return '';
  const cols = Array.from(rows.reduce((s, r) => { Object.keys(r).forEach(k => s.add(k)); return s; }, new Set<string>()));
  const esc = (v: unknown) => {
    if (v == null) return '';
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(','), ...rows.map(r => cols.map(c => esc(r[c])).join(','))].join('\n');
}

const card = (k: string, v: string, comment = '') => {
  const s = `${k.padEnd(8)}= ${v.padStart(20)}${comment ? ' / ' + comment : ''}`;
  return s.slice(0, 80).padEnd(80);
};
const strVal = (s: string) => `'${s.replace(/'/g, "''").padEnd(8)}'`;
const pad2880 = (len: number) => (2880 - (len % 2880)) % 2880;

// Writes numeric columns as 64-bit doubles in a BINTABLE extension.
export function rowsToFITS(rows: Record<string, unknown>[], extname = 'STANDARDIZED'): Uint8Array {
  const cols = Array.from(rows.reduce((s, r) => {
    Object.entries(r).forEach(([k, v]) => { if (typeof v === 'number') s.add(k); });
    return s;
  }, new Set<string>())).slice(0, 999);

  const primary = [card('SIMPLE', 'T'), card('BITPIX', '8'), card('NAXIS', '0'), card('EXTEND', 'T'),
    card('ORIGIN', strVal('COSMIC Data Fusion')), 'END'.padEnd(80)].join('');
  const rowBytes = cols.length * 8;
  const ext: string[] = [
    card('XTENSION', strVal('BINTABLE')), card('BITPIX', '8'), card('NAXIS', '2'),
    card('NAXIS1', String(rowBytes)), card('NAXIS2', String(rows.length)),
    card('PCOUNT', '0'), card('GCOUNT', '1'), card('TFIELDS', String(cols.length)),
  ];
  cols.forEach((c, i) => {
    ext.push(card(`TTYPE${i + 1}`, strVal(c.replace(/[^\x20-\x7e]/g, '').slice(0, 60))));
    ext.push(card(`TFORM${i + 1}`, strVal('D')));
  });
  ext.push(card('EXTNAME', strVal(extname)), 'END'.padEnd(80));
  const extHdr = ext.join('');

  const dataLen = rowBytes * rows.length;
  const total = primary.length + pad2880(primary.length) + extHdr.length + pad2880(extHdr.length) + dataLen + pad2880(dataLen);
  const out = new Uint8Array(total);
  let o = 0;
  const writeStr = (s: string) => { for (let i = 0; i < s.length; i++) out[o++] = s.charCodeAt(i); };
  writeStr(primary); writeStr(' '.repeat(pad2880(primary.length)));
  writeStr(extHdr); writeStr(' '.repeat(pad2880(extHdr.length)));
  const dv = new DataView(out.buffer);
  for (const r of rows) for (const c of cols) {
    const v = r[c];
    dv.setFloat64(o, typeof v === 'number' ? v : NaN, false); o += 8;
  }
  return out;
}
