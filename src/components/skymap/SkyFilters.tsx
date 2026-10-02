import { SlidersHorizontal } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export interface SkyFilterState {
  raMin: number; raMax: number; decMin: number; decMax: number;
  coneRa: string; coneDec: string; coneRadius: string;
  magMin: string; magMax: string; snrMin: string;
}

export const DEFAULT_FILTERS: SkyFilterState = {
  raMin: 0, raMax: 360, decMin: -90, decMax: 90,
  coneRa: '', coneDec: '', coneRadius: '', magMin: '', magMax: '', snrMin: '',
};

export function applyFilters<T extends { ra: number; dec: number; mag?: number; snr?: number }>(pts: T[], f: SkyFilterState): T[] {
  const num = (s: string) => (s.trim() === '' ? null : Number(s));
  const cRa = num(f.coneRa), cDec = num(f.coneDec), cR = num(f.coneRadius);
  const mMin = num(f.magMin), mMax = num(f.magMax), sMin = num(f.snrMin);
  const r = Math.PI / 180;
  return pts.filter(p => {
    if (p.ra < f.raMin || p.ra > f.raMax || p.dec < f.decMin || p.dec > f.decMax) return false;
    if (cRa != null && cDec != null && cR != null) {
      const c = Math.sin(p.dec * r) * Math.sin(cDec * r) + Math.cos(p.dec * r) * Math.cos(cDec * r) * Math.cos((p.ra - cRa) * r);
      if (Math.acos(Math.min(1, Math.max(-1, c))) / r > cR) return false;
    }
    if (mMin != null && (p.mag == null || p.mag < mMin)) return false;
    if (mMax != null && (p.mag == null || p.mag > mMax)) return false;
    if (sMin != null && (p.snr == null || p.snr < sMin)) return false;
    return true;
  });
}

interface Props { value: SkyFilterState; onChange: (f: SkyFilterState) => void; shown: number; total: number }

export function SkyFilters({ value: f, onChange, shown, total }: Props) {
  const set = (k: keyof SkyFilterState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...f, [k]: typeof DEFAULT_FILTERS[k] === 'number' ? Number(e.target.value) : e.target.value });
  const field = (k: keyof SkyFilterState, label: string, ph?: string) => (
    <label className="text-[10px] text-muted-foreground space-y-1">
      <span>{label}</span>
      <Input type="number" value={f[k] as any} onChange={set(k)} placeholder={ph} className="h-7 text-xs" />
    </label>
  );
  return (
    <div className="glass-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <SlidersHorizontal className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-display font-semibold">Filters</h3>
        <span className="ml-auto text-[10px] text-muted-foreground">{shown}/{total} shown</span>
      </div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">RA/Dec box (°)</div>
      <div className="grid grid-cols-2 gap-2">
        {field('raMin', 'RA min')}{field('raMax', 'RA max')}{field('decMin', 'Dec min')}{field('decMax', 'Dec max')}
      </div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Cone search</div>
      <div className="grid grid-cols-3 gap-2">
        {field('coneRa', 'RA°', '—')}{field('coneDec', 'Dec°', '—')}{field('coneRadius', 'Radius°', '—')}
      </div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Quality</div>
      <div className="grid grid-cols-3 gap-2">
        {field('magMin', 'Mag min', '—')}{field('magMax', 'Mag max', '—')}{field('snrMin', 'SNR ≥', '—')}
      </div>
      <Button variant="ghost" size="sm" className="w-full h-7 text-xs" onClick={() => onChange(DEFAULT_FILTERS)}>Reset filters</Button>
    </div>
  );
}
