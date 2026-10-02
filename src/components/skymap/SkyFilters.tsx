import { useState, useEffect } from 'react';
import { SlidersHorizontal, Bookmark, BookmarkPlus, Trash2, Check, RotateCcw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export interface SkyFilterState {
  raMin: number;
  raMax: number;
  decMin: number;
  decMax: number;
  coneRa: string;
  coneDec: string;
  coneRadius: string;
  magMin: string;
  magMax: string;
  snrMin: string;
}

export interface FilterPreset {
  id: string;
  name: string;
  description?: string;
  filters: SkyFilterState;
  isBuiltIn?: boolean;
}

export const DEFAULT_FILTERS: SkyFilterState = {
  raMin: 0,
  raMax: 360,
  decMin: -90,
  decMax: 90,
  coneRa: '',
  coneDec: '',
  coneRadius: '',
  magMin: '',
  magMax: '',
  snrMin: '',
};

export const BUILT_IN_PRESETS: FilterPreset[] = [
  {
    id: 'preset-all',
    name: 'All Sky (Default)',
    description: 'Full celestial sphere, unconstrained bounds',
    filters: DEFAULT_FILTERS,
    isBuiltIn: true,
  },
  {
    id: 'preset-galactic-center',
    name: 'Galactic Center (Sgr A*)',
    description: 'Milky Way core, high stellar density: Cone 266.4° / -29.0° (r=8°)',
    filters: {
      ...DEFAULT_FILTERS,
      raMin: 258,
      raMax: 275,
      decMin: -35,
      decMax: -22,
      coneRa: '266.42',
      coneDec: '-29.01',
      coneRadius: '8',
      snrMin: '5',
    },
    isBuiltIn: true,
  },
  {
    id: 'preset-deep-field',
    name: 'JWST / Hubble Deep Field',
    description: 'Low galactic extinction window: Cone 53.16° / -27.79° (r=4°)',
    filters: {
      ...DEFAULT_FILTERS,
      raMin: 50,
      raMax: 56,
      decMin: -30,
      decMax: -25,
      coneRa: '53.16',
      coneDec: '-27.79',
      coneRadius: '4',
      magMin: '16',
      snrMin: '3',
    },
    isBuiltIn: true,
  },
  {
    id: 'preset-andromeda',
    name: 'Andromeda Galaxy (M31)',
    description: 'Local Group spiral neighbor: Cone 10.68° / 41.27° (r=5°)',
    filters: {
      ...DEFAULT_FILTERS,
      raMin: 6,
      raMax: 16,
      decMin: 37,
      decMax: 46,
      coneRa: '10.68',
      coneDec: '41.27',
      coneRadius: '5',
      snrMin: '5',
    },
    isBuiltIn: true,
  },
  {
    id: 'preset-orion',
    name: 'Orion Nebula (M42)',
    description: 'Stellar nursery and H II region: Cone 83.82° / -5.39° (r=6°)',
    filters: {
      ...DEFAULT_FILTERS,
      raMin: 80,
      raMax: 88,
      decMin: -9,
      decMax: -1,
      coneRa: '83.82',
      coneDec: '-5.39',
      coneRadius: '6',
      snrMin: '5',
    },
    isBuiltIn: true,
  },
  {
    id: 'preset-high-snr',
    name: 'High-SNR Clean Catalog',
    description: 'Robust detections only: SNR ≥ 10.0σ',
    filters: {
      ...DEFAULT_FILTERS,
      snrMin: '10',
    },
    isBuiltIn: true,
  },
  {
    id: 'preset-bright-stars',
    name: 'Bright Sources (Mag ≤ 10)',
    description: 'High flux calibration objects: Mag ≤ 10, SNR ≥ 10.0',
    filters: {
      ...DEFAULT_FILTERS,
      magMax: '10',
      snrMin: '10',
    },
    isBuiltIn: true,
  },
  {
    id: 'preset-equatorial',
    name: 'Equatorial Celestial Belt',
    description: 'Dec -15° to +15° across full 360° RA',
    filters: {
      ...DEFAULT_FILTERS,
      decMin: -15,
      decMax: 15,
    },
    isBuiltIn: true,
  },
];

export function applyFilters<T extends { ra: number; dec: number; mag?: number; snr?: number }>(
  pts: T[],
  f: SkyFilterState
): T[] {
  const num = (s: string) => (s.trim() === '' ? null : Number(s));
  const cRa = num(f.coneRa),
    cDec = num(f.coneDec),
    cR = num(f.coneRadius);
  const mMin = num(f.magMin),
    mMax = num(f.magMax),
    sMin = num(f.snrMin);
  const r = Math.PI / 180;

  return pts.filter((p) => {
    // RA/Dec bounding box
    if (p.ra < f.raMin || p.ra > f.raMax || p.dec < f.decMin || p.dec > f.decMax) return false;

    // Cone search
    if (cRa != null && cDec != null && cR != null) {
      const c =
        Math.sin(p.dec * r) * Math.sin(cDec * r) +
        Math.cos(p.dec * r) * Math.cos(cDec * r) * Math.cos((p.ra - cRa) * r);
      if (Math.acos(Math.min(1, Math.max(-1, c))) / r > cR) return false;
    }

    // Photometric and SNR limits
    if (mMin != null && (p.mag == null || p.mag < mMin)) return false;
    if (mMax != null && (p.mag == null || p.mag > mMax)) return false;
    if (sMin != null && (p.snr == null || p.snr < sMin)) return false;

    return true;
  });
}

interface Props {
  value: SkyFilterState;
  onChange: (f: SkyFilterState) => void;
  shown: number;
  total: number;
}

export function SkyFilters({ value: f, onChange, shown, total }: Props) {
  const [customPresets, setCustomPresets] = useState<FilterPreset[]>(() => {
    try {
      const raw = localStorage.getItem('cosmic_skymap_presets');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const [isSaving, setIsSaving] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [activePresetId, setActivePresetId] = useState<string>('preset-all');

  // Sync custom presets to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('cosmic_skymap_presets', JSON.stringify(customPresets));
    } catch (e) {
      console.error('Failed to save presets:', e);
    }
  }, [customPresets]);

  const allPresets = [...BUILT_IN_PRESETS, ...customPresets];

  const handleSelectPreset = (presetId: string) => {
    const found = allPresets.find((p) => p.id === presetId);
    if (found) {
      setActivePresetId(found.id);
      onChange(found.filters);
      toast.info(`Applied filter preset: ${found.name}`);
    }
  };

  const handleSavePreset = () => {
    if (!newPresetName.trim()) {
      toast.error('Please enter a name for your filter preset.');
      return;
    }

    const newPreset: FilterPreset = {
      id: `custom-${Date.now()}`,
      name: newPresetName.trim(),
      description: `Custom preset (RA: ${f.raMin}°-${f.raMax}°, Dec: ${f.decMin}°-${f.decMax}°)`,
      filters: { ...f },
      isBuiltIn: false,
    };

    setCustomPresets((prev) => [newPreset, ...prev]);
    setActivePresetId(newPreset.id);
    setNewPresetName('');
    setIsSaving(false);
    toast.success(`Preset "${newPreset.name}" saved! You can reuse it across any dataset.`);
  };

  const handleDeletePreset = (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCustomPresets((prev) => prev.filter((p) => p.id !== id));
    if (activePresetId === id) setActivePresetId('preset-all');
    toast.success(`Preset "${name}" removed.`);
  };

  const set = (k: keyof SkyFilterState) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setActivePresetId('custom-active');
    onChange({
      ...f,
      [k]: typeof DEFAULT_FILTERS[k] === 'number' ? Number(e.target.value) : e.target.value,
    });
  };

  const field = (k: keyof SkyFilterState, label: string, ph?: string) => (
    <label className="text-[10px] text-muted-foreground space-y-1 block">
      <span className="font-medium text-foreground/80">{label}</span>
      <Input
        type="number"
        value={f[k] as any}
        onChange={set(k)}
        placeholder={ph}
        className="h-7 text-xs bg-muted/30 border-border/40 font-mono"
      />
    </label>
  );

  return (
    <div className="glass-card p-4 space-y-3.5 border-border/40">
      <div className="flex items-center justify-between border-b border-border/25 pb-2.5">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-display font-semibold">Sky Filters</h3>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
          {shown.toLocaleString()}/{total.toLocaleString()} objects
        </span>
      </div>

      {/* Preset Selector Dropdown */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground flex items-center gap-1">
            <Bookmark className="w-3 h-3 text-primary" /> Presets
          </label>
          <button
            type="button"
            onClick={() => setIsSaving(!isSaving)}
            className="text-[11px] text-primary hover:underline flex items-center gap-1 font-medium"
          >
            <BookmarkPlus className="w-3 h-3" />
            {isSaving ? 'Cancel' : 'Save current preset'}
          </button>
        </div>

        {/* Save Preset Form */}
        {isSaving && (
          <div className="p-2.5 rounded-lg bg-primary/10 border border-primary/30 space-y-2">
            <span className="text-[11px] text-foreground font-medium block">
              Save current bounds, cone radius, and SNR as a reusable preset:
            </span>
            <div className="flex gap-1.5">
              <Input
                value={newPresetName}
                onChange={(e) => setNewPresetName(e.target.value)}
                placeholder="e.g. Orion Survey Field, Faint AGNs"
                className="h-7 text-xs bg-card border-border/50"
                onKeyDown={(e) => e.key === 'Enter' && handleSavePreset()}
                autoFocus
              />
              <Button size="sm" variant="cosmic" className="h-7 px-3 text-xs" onClick={handleSavePreset}>
                <Check className="w-3.5 h-3.5 mr-1" /> Save
              </Button>
            </div>
          </div>
        )}

        <select
          value={activePresetId}
          onChange={(e) => handleSelectPreset(e.target.value)}
          className="w-full h-8 text-xs rounded-lg bg-muted/50 border border-border/50 px-2.5 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
        >
          <optgroup label="Astronomical Built-in Presets">
            {BUILT_IN_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </optgroup>
          {customPresets.length > 0 && (
            <optgroup label="Your Saved Presets">
              {customPresets.map((p) => (
                <option key={p.id} value={p.id}>
                  ★ {p.name}
                </option>
              ))}
            </optgroup>
          )}
          {activePresetId === 'custom-active' && <option value="custom-active">● Custom Settings (Unsaved)</option>}
        </select>

        {/* Active Custom Preset Delete Action */}
        {customPresets.some((p) => p.id === activePresetId) && (
          <div className="flex items-center justify-between px-1 text-[11px] text-muted-foreground">
            <span>Saved in your browser library</span>
            <button
              onClick={(e) => {
                const target = customPresets.find((p) => p.id === activePresetId);
                if (target) handleDeletePreset(target.id, target.name, e);
              }}
              className="text-destructive hover:underline flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" /> Delete preset
            </button>
          </div>
        )}
      </div>

      {/* RA/Dec Bounding Box */}
      <div className="space-y-1.5 pt-1 border-t border-border/20">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
          RA / Dec Bounding Box (°)
        </div>
        <div className="grid grid-cols-2 gap-2">
          {field('raMin', 'RA min (0-360)')}
          {field('raMax', 'RA max (0-360)')}
          {field('decMin', 'Dec min (-90 to +90)')}
          {field('decMax', 'Dec max (-90 to +90)')}
        </div>
      </div>

      {/* Cone Search */}
      <div className="space-y-1.5 pt-1 border-t border-border/20">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
          Cone Radial Search
        </div>
        <div className="grid grid-cols-3 gap-2">
          {field('coneRa', 'Center RA°', '—')}
          {field('coneDec', 'Center Dec°', '—')}
          {field('coneRadius', 'Radius°', '—')}
        </div>
      </div>

      {/* Quality & Detection SNR */}
      <div className="space-y-1.5 pt-1 border-t border-border/20">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
          Quality & Photometry
        </div>
        <div className="grid grid-cols-3 gap-2">
          {field('magMin', 'Mag min', '—')}
          {field('magMax', 'Mag max', '—')}
          {field('snrMin', 'SNR ≥ (σ)', '—')}
        </div>
      </div>

      {/* Reset */}
      <Button
        variant="ghost"
        size="sm"
        className="w-full h-7 text-xs text-muted-foreground hover:text-foreground"
        onClick={() => {
          setActivePresetId('preset-all');
          onChange(DEFAULT_FILTERS);
          toast.info('Filters reset to default full celestial sphere.');
        }}
      >
        <RotateCcw className="w-3 h-3 mr-1.5" /> Reset all filters
      </Button>
    </div>
  );
}
