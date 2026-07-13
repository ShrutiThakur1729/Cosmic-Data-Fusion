import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Info, Maximize2, Sparkles } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { StarField } from '@/components/cosmic/StarField';
import { SkyMap } from '@/components/skymap/SkyMap';
import { DatasetPicker } from '@/components/skymap/DatasetPicker';
import { SkyMapLoadStatus } from '@/components/skymap/SkyMapLoadStatus';
import { useDatasetPoints } from '@/hooks/useDatasetPoints';
import { Button } from '@/components/ui/button';

export default function SkyMapPage() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string | null>(null);
  const load = useDatasetPoints(selectedDatasetId);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const customObjects = useMemo(
    () => load.points.map(p => ({
      name: p.name,
      ra: p.ra,
      dec: p.dec,
      mag: p.mag ?? 4,
      type: (p.type?.toLowerCase().includes('galax') ? 'galaxy'
           : p.type?.toLowerCase().includes('nebul') ? 'nebula'
           : p.type?.toLowerCase().includes('cluster') ? 'cluster'
           : 'star') as 'star' | 'galaxy' | 'nebula' | 'cluster',
      constellation: 'Dataset',
      distance: 'From uploaded dataset',
      description: `Real observation from your dataset (RA ${p.ra.toFixed(3)}°, Dec ${p.dec.toFixed(3)}°).`,
      imageUrl: '',
      sourceLink: '',
    })),
    [load.points]
  );

  const v = load.result?.validation;

  return (
    <div className="min-h-screen relative">
      <StarField />
      <Navbar />

      <main className="relative pt-24 pb-12 px-4">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="mb-6 flex items-start justify-between"
          >
            <div>
              <h1 className="text-3xl md:text-4xl font-display font-bold">
                <span className="gradient-text-cosmic">Interactive Sky Map</span>
              </h1>
              <p className="text-muted-foreground mt-2">
                Plot your uploaded datasets on the celestial sphere in real time.
              </p>
            </div>
            <Button variant="outline" size="icon" onClick={toggleFullscreen}>
              <Maximize2 className="w-4 h-4" />
            </Button>
          </motion.div>

          <div className="grid lg:grid-cols-[300px_1fr] gap-4">
            {/* Left column: dataset picker + live analysis */}
            <div className="space-y-4">
              <DatasetPicker selectedId={selectedDatasetId} onSelect={setSelectedDatasetId} />

              {selectedDatasetId && (
                <div className="glass-card p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-4 h-4 text-accent" />
                    <h3 className="text-sm font-display font-semibold">Live Analysis</h3>
                  </div>
                  {load.stage !== 'ready' && (
                    <div className="text-xs text-muted-foreground">{load.message || 'Preparing…'}</div>
                  )}
                  {load.stage === 'ready' && v && (
                    <div className="space-y-2 text-xs">
                      <Row label="Objects" value={v.totalObjects.toLocaleString()} />
                      <Row label="Stars" value={v.stars.toLocaleString()} />
                      <Row label="Galaxies" value={v.galaxies.toLocaleString()} />
                      <Row label="Nebulae" value={v.nebulae.toLocaleString()} />
                      <Row label="Clusters" value={v.clusters.toLocaleString()} />
                      <Row label="Invalid coords" value={String(v.invalidCoords)} />
                      <Row label="Duplicates" value={String(v.duplicates)} />
                      <div className="pt-2 border-t border-border/30">
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground uppercase tracking-wider">
                          <span>Quality</span><span>{v.qualityScore}/100</span>
                        </div>
                        <div className="h-1.5 mt-1 rounded-full bg-muted/40 overflow-hidden">
                          <div
                            className={`h-full ${v.qualityScore >= 70 ? 'bg-accent' : v.qualityScore >= 40 ? 'bg-primary' : 'bg-destructive'}`}
                            style={{ width: `${v.qualityScore}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                  {load.stage === 'error' && (
                    <div className="text-xs text-destructive">{load.error}</div>
                  )}
                </div>
              )}
            </div>

            {/* Sky map */}
            <div className="relative">
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.15, duration: 0.4 }}
                className="h-[600px] lg:h-[720px]"
              >
                <SkyMap customObjects={customObjects} />
                <SkyMapLoadStatus
                  stage={load.stage}
                  progress={load.progress}
                  message={load.message}
                  pointCount={load.points.length}
                />
              </motion.div>

              <div className="glass-card p-3 mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                <Info className="w-3.5 h-3.5" />
                Click any object to fly to it. Drag to rotate, scroll to zoom, Esc to reset. Uploaded points appear as extra sprites labelled "Dataset".
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono text-foreground">{value}</span>
    </div>
  );
}
