import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Info, Maximize2, Sparkles, Download, Camera, FileSpreadsheet, Database, Filter, FileText } from 'lucide-react';
import { ObjectDetailsModal } from '@/components/skymap/ObjectDetailsModal';
import { SkyFilters, DEFAULT_FILTERS, applyFilters, SkyFilterState } from '@/components/skymap/SkyFilters';
import { AnalysisCharts, AnalysisSnapshot } from '@/components/skymap/AnalysisCharts';
import { useDatasets } from '@/hooks/useDatasets';
import { downloadBlob, rowsToCSV, rowsToFITS, captureSkyMapCanvas } from '@/lib/exportData';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Navbar } from '@/components/layout/Navbar';
import { StarField } from '@/components/cosmic/StarField';
import { SkyMap } from '@/components/skymap/SkyMap';
import { DatasetPicker } from '@/components/skymap/DatasetPicker';
import { SkyMapLoadStatus } from '@/components/skymap/SkyMapLoadStatus';
import { useDatasetPoints } from '@/hooks/useDatasetPoints';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function SkyMapPage() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string | null>(null);
  const load = useDatasetPoints(selectedDatasetId);
  const { datasets } = useDatasets();
  const dataset = datasets.find(d => d.id === selectedDatasetId);
  const [filters, setFilters] = useState<SkyFilterState>(DEFAULT_FILTERS);
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const [history, setHistory] = useState<AnalysisSnapshot[]>(() => {
    try { return JSON.parse(localStorage.getItem('skymap-analysis-history') ?? '[]'); } catch { return []; }
  });
  const visible = useMemo(() => applyFilters(load.points, filters), [load.points, filters]);

  const completeness = useMemo(() => {
    const r = load.result; if (!r?.validation) return 0;
    const cells = (r.rowCount ?? 0) * (r.columnCount ?? 0);
    return cells ? Math.round(100 * (1 - r.validation.missingValues / cells)) : 0;
  }, [load.result]);

  useEffect(() => {
    if (load.stage !== 'ready' || !load.result?.validation) return;
    const snap: AnalysisSnapshot = {
      t: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      dataset: dataset?.name ?? 'dataset',
      objects: load.result.validation.totalObjects,
      completeness,
      quality: load.result.validation.qualityScore,
    };
    setHistory(h => {
      const next = [...h, snap].slice(-30);
      localStorage.setItem('skymap-analysis-history', JSON.stringify(next));
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load.stage, load.result]);

  const baseName = (dataset?.name ?? 'dataset').replace(/[^\w.-]+/g, '_');
  const summary = () => ({
    dataset: dataset?.name ?? 'Standardized Sky Observation',
    exportedAt: new Date().toISOString(),
    coordinateSystem: load.result?.detectedCoordinateSystem || 'ICRS',
    raColumn: load.result?.raColumn,
    decColumn: load.result?.decColumn,
    validation: load.result?.validation,
    completeness,
    qualityScore: load.result?.validation?.qualityScore,
    filters,
    pointsPlotted: visible.length,
    pointsTotal: load.points.length,
  });

  const exportCSV = () => {
    try {
      const rows = load.result?.standardizedRows ?? [];
      const csvStr = rowsToCSV(rows, summary());
      downloadBlob(csvStr, `${baseName}_standardized.csv`, 'text/csv;charset=utf-8;');
      toast.success(`Standardized CSV exported successfully (${rows.length.toLocaleString()} records + analysis header)`);
    } catch (err: any) {
      toast.error(err?.message || 'CSV export failed');
    }
  };

  const exportFITS = () => {
    try {
      const rows = load.result?.standardizedRows ?? [];
      const fitsBuf = rowsToFITS(rows, 'STANDARDIZED', summary());
      downloadBlob(fitsBuf, `${baseName}_standardized.fits`, 'application/fits');
      toast.success(`Standardized FITS file exported (${rows.length.toLocaleString()} records + primary HDU cards)`);
    } catch (err: any) {
      toast.error(err?.message || 'FITS export failed');
    }
  };

  const exportFiltered = () => {
    try {
      const rows = visible.map(p => p.row);
      if (rows.length === 0) {
        toast.error('Cannot export: 0 objects match your current sky filters. Please adjust bounds.');
        return;
      }
      const csvStr = rowsToCSV(rows, summary());
      downloadBlob(csvStr, `${baseName}_filtered_${rows.length}pts.csv`, 'text/csv;charset=utf-8;');
      toast.success(`Exported ${rows.length.toLocaleString()} filtered records to CSV`);
    } catch (err: any) {
      toast.error(err?.message || 'Filtered export failed');
    }
  };

  const exportSummary = () => {
    try {
      const jsonStr = JSON.stringify(summary(), null, 2);
      downloadBlob(jsonStr, `${baseName}_skymap_summary.json`, 'application/json');
      toast.success('Analysis summary JSON exported successfully');
    } catch (err: any) {
      toast.error(err?.message || 'Summary export failed');
    }
  };

  const exportSkyMapImage = () => {
    try {
      const container = document.getElementById('skymap-canvas-container');
      captureSkyMapCanvas(container, `${baseName}_skymap_snapshot.png`);
      toast.success('Sky Map 3D view downloaded as high-res PNG image!');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to capture Sky Map view');
    }
  };

  const canExport = load.stage === 'ready' && !!load.result?.standardizedRows?.length;

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
    () => visible.map(p => ({
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
    [visible]
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
            <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="shadow-sm">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="glass-card w-64 p-1.5 space-y-1">
                <div className="px-2 py-1 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground border-b border-border/20">
                  Visual Sky Capture
                </div>
                <DropdownMenuItem onClick={exportSkyMapImage} className="cursor-pointer flex items-center gap-2">
                  <Camera className="w-4 h-4 text-accent" />
                  <span>Download Sky Map View (PNG)</span>
                </DropdownMenuItem>
                <div className="px-2 py-1 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground border-b border-border/20 mt-1">
                  Scientific Data & Catalogs
                </div>
                <DropdownMenuItem onClick={exportCSV} disabled={!canExport} className="cursor-pointer flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-primary" />
                  <span>Standardized data (CSV + Header)</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportFITS} disabled={!canExport} className="cursor-pointer flex items-center gap-2">
                  <Database className="w-4 h-4 text-primary" />
                  <span>Standardized data (FITS BINTABLE)</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportFiltered} disabled={!canExport} className="cursor-pointer flex items-center gap-2">
                  <Filter className="w-4 h-4 text-primary" />
                  <span>Filtered points ({visible.length}) (CSV)</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportSummary} disabled={!canExport} className="cursor-pointer flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  <span>Full Analysis Summary (JSON)</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" size="icon" onClick={toggleFullscreen}>
              <Maximize2 className="w-4 h-4" />
            </Button>
            </div>
          </motion.div>

          <div className="grid lg:grid-cols-[300px_1fr] gap-4">
            {/* Left column: dataset picker + live analysis */}
            <div className="space-y-4">
              <DatasetPicker selectedId={selectedDatasetId} onSelect={setSelectedDatasetId} />
              {selectedDatasetId && (
                <SkyFilters value={filters} onChange={setFilters} shown={visible.length} total={load.points.length} />
              )}

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
                       <Row label="Completeness" value={`${completeness}%`} />
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
                <SkyMap customObjects={customObjects} onCustomObjectClick={setOpenIdx} />
                <SkyMapLoadStatus
                  stage={load.stage}
                  progress={load.progress}
                  message={load.message}
                  pointCount={visible.length}
                />
              </motion.div>

              <div className="glass-card p-3 mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                <Info className="w-3.5 h-3.5" />
                Click any object to fly to it; dataset points open a details window. Drag to rotate, scroll to zoom, Esc to reset. Uploaded points appear as extra sprites labelled "Dataset".
              </div>
              <div className="mt-3"><AnalysisCharts history={history} /></div>
            </div>
          </div>
        </div>
      </main>
      <ObjectDetailsModal
        point={openIdx != null ? visible[openIdx] ?? null : null}
        datasetName={dataset?.name}
        meta={dataset?.metadata as unknown as Record<string, unknown> | undefined}
        onClose={() => setOpenIdx(null)}
      />
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
