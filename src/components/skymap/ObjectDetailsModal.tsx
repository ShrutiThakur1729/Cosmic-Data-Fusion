import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { CELESTIAL_OBJECTS } from '@/data/celestialObjects';
import { raToHMS, decToDMS } from '@/lib/starColor';
import type { DatasetPoint } from '@/hooks/useDatasetPoints';

function angSep(ra1: number, d1: number, ra2: number, d2: number) {
  const r = Math.PI / 180;
  const c = Math.sin(d1 * r) * Math.sin(d2 * r) + Math.cos(d1 * r) * Math.cos(d2 * r) * Math.cos((ra1 - ra2) * r);
  return Math.acos(Math.min(1, Math.max(-1, c))) / r;
}

interface Props {
  point: DatasetPoint | null;
  datasetName?: string;
  meta?: Record<string, unknown>;
  onClose: () => void;
}

export function ObjectDetailsModal({ point, datasetName, meta, onClose }: Props) {
  const match = point
    ? CELESTIAL_OBJECTS.map(o => ({ o, sep: angSep(point.ra, point.dec, o.ra, o.dec) }))
        .sort((a, b) => a.sep - b.sep)[0]
    : null;
  const matched = match && match.sep <= 1 ? match : null;
  const measurements = point ? Object.entries(point.row).filter(([k]) => !k.startsWith('_')) : [];

  return (
    <Dialog open={!!point} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass-card max-w-2xl max-h-[85vh] overflow-y-auto">
        {point && (
          <>
            <DialogHeader>
              <DialogTitle className="font-display gradient-text-cosmic">{point.name}</DialogTitle>
              <DialogDescription>From dataset: {datasetName ?? '—'}</DialogDescription>
            </DialogHeader>

            <section className="space-y-2">
              <h4 className="text-xs uppercase tracking-wider text-muted-foreground">Position</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <Cell k="RA (J2000)" v={`${raToHMS(point.ra)} (${point.ra.toFixed(5)}°)`} />
                <Cell k="Dec (J2000)" v={`${decToDMS(point.dec)} (${point.dec.toFixed(5)}°)`} />
                <Cell k="Magnitude" v={point.mag != null ? point.mag.toFixed(2) : '—'} />
                <Cell k="SNR" v={point.snr != null ? point.snr.toFixed(1) : '—'} />
              </div>
            </section>

            <section className="space-y-2">
              <h4 className="text-xs uppercase tracking-wider text-muted-foreground">Catalog match</h4>
              {matched ? (
                <div className="rounded-lg bg-muted/30 p-3 text-sm">
                  <div className="font-semibold">{matched.o.name} <span className="text-xs text-muted-foreground">({matched.o.type}, {matched.o.constellation})</span></div>
                  <div className="text-xs text-muted-foreground mt-1">Separation {(matched.sep * 3600).toFixed(1)}″ • Distance {matched.o.distance}</div>
                  <p className="text-xs mt-2">{matched.o.description}</p>
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">
                  No built-in catalog object within 1°.{' '}
                  <a className="text-primary underline" target="_blank" rel="noopener noreferrer"
                    href={`https://simbad.u-strasbg.fr/simbad/sim-coo?Coord=${point.ra}+${point.dec}&Radius=2&Radius.unit=arcmin`}>
                    Search SIMBAD around this position
                  </a>
                </div>
              )}
            </section>

            {meta && (
              <section className="space-y-2">
                <h4 className="text-xs uppercase tracking-wider text-muted-foreground">Dataset metadata</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {Object.entries(meta).filter(([, v]) => v != null && typeof v !== 'object').slice(0, 12).map(([k, v]) => (
                    <Cell key={k} k={k} v={String(v)} />
                  ))}
                </div>
              </section>
            )}

            <section className="space-y-2">
              <h4 className="text-xs uppercase tracking-wider text-muted-foreground">Measurements ({measurements.length})</h4>
              <div className="rounded-lg border border-border/40 divide-y divide-border/30 text-xs font-mono">
                {measurements.map(([k, v]) => (
                  <div key={k} className="flex justify-between px-3 py-1.5">
                    <span className="text-muted-foreground">{k}</span>
                    <span className="text-foreground truncate ml-4">{v == null ? '—' : String(v)}</span>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Cell({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-md bg-muted/30 px-3 py-2">
      <div className="text-[10px] uppercase text-muted-foreground">{k}</div>
      <div className="font-mono text-xs break-all">{v}</div>
    </div>
  );
}
