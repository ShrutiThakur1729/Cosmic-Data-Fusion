import { useMemo } from 'react';
import { SkyMap } from './SkyMap';
import { CelestialObject } from '@/data/celestialObjects';

interface Props {
  points: Array<{ ra: number; dec: number; name?: string }>;
}

export function MiniSkyPreview({ points }: Props) {
  const custom = useMemo<Array<Partial<CelestialObject> & { name: string; ra: number; dec: number }>>(
    () => points.map((p, i) => ({
      name: p.name ?? `obj-${i}`,
      ra: p.ra,
      dec: p.dec,
      type: 'star',
      mag: 3,
      constellation: 'Uploaded',
      distance: 'Unknown',
      description: 'Uploaded dataset point.',
      imageUrl: '',
      sourceLink: '',
    })),
    [points]
  );

  return (
    <div className="glass-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border/30 flex items-center justify-between">
        <div>
          <div className="text-sm font-display font-semibold">Mini Sky Preview</div>
          <div className="text-[10px] text-muted-foreground">{points.length} points from your upload</div>
        </div>
      </div>
      <div className="h-64">
        <SkyMap customObjects={custom} compact />
      </div>
    </div>
  );
}
