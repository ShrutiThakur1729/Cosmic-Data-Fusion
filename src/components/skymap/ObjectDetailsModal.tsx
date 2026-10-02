import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { CELESTIAL_OBJECTS } from '@/data/celestialObjects';
import { raToHMS, decToDMS } from '@/lib/starColor';
import type { DatasetPoint } from '@/hooks/useDatasetPoints';
import { explainCelestialObject, AIExplanationResult } from '@/lib/aiGateway';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sparkles, Bot, Copy, Check, ExternalLink, Lightbulb, Compass, Activity, FileText } from 'lucide-react';
import { toast } from 'sonner';

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

type ModelType = 'gemini-1.5-pro' | 'gpt-4o' | 'claude-3.5-sonnet' | 'cosmic-astro-ai';

export function ObjectDetailsModal({ point, datasetName, meta, onClose }: Props) {
  const [selectedModel, setSelectedModel] = useState<ModelType>('gemini-1.5-pro');
  const [customPrompt, setCustomPrompt] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<AIExplanationResult | null>(null);
  const [copied, setCopied] = useState(false);

  // Reset analysis when selecting a different point
  useEffect(() => {
    setAiResult(null);
    setCustomPrompt('');
  }, [point?.name, point?.ra, point?.dec]);

  const match = point
    ? CELESTIAL_OBJECTS.map(o => ({ o, sep: angSep(point.ra, point.dec, o.ra, o.dec) }))
        .sort((a, b) => a.sep - b.sep)[0]
    : null;
  const matched = match && match.sep <= 1 ? match : null;
  const measurements = point ? Object.entries(point.row).filter(([k]) => !k.startsWith('_')) : [];

  const handleRunAIExplanation = async () => {
    if (!point) return;
    setIsAnalyzing(true);
    try {
      const res = await explainCelestialObject({
        point,
        datasetName,
        meta,
        matchedCatalogObject: matched ? {
          name: matched.o.name,
          type: matched.o.type,
          constellation: matched.o.constellation,
          distance: matched.o.distance,
          description: matched.o.description,
          sep: matched.sep,
        } : null,
        model: selectedModel,
        customQuestion: customPrompt.trim() || undefined,
      });
      setAiResult(res);
      toast.success(`AI analysis generated via ${res.modelName}`);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to generate AI analysis');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCopyReport = () => {
    if (!aiResult || !point) return;
    const text = `COSMIC DATA FUSION - AI OBJECT REPORT
Object: ${point.name} (RA: ${point.ra}°, Dec: ${point.dec}°)
Dataset: ${datasetName || 'Standardized'}
Model: ${aiResult.modelName} (${aiResult.generatedAt})

EXECUTIVE SUMMARY:
${aiResult.executiveSummary}

ASTROPHYSICAL CLASSIFICATION:
${aiResult.astrophysicalClassification}

MEASUREMENT INTERPRETATION:
${aiResult.measurementBreakdown.map(m => `- ${m.metric} (${m.value}): ${m.interpretation}`).join('\n')}

CATALOG CONTEXT:
${aiResult.catalogContext}

RECOMMENDED OBSERVATIONS:
${aiResult.recommendedObservations.map(r => `* ${r}`).join('\n')}
`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('AI Report copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={!!point} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass-card max-w-3xl max-h-[90vh] overflow-y-auto border-primary/30">
        {point && (
          <>
            <DialogHeader className="border-b border-border/30 pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="font-display text-xl gradient-text-cosmic flex items-center gap-2">
                    {point.name}
                    {point.type && (
                      <span className="text-xs font-normal px-2.5 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">
                        {point.type}
                      </span>
                    )}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                    Dataset Source: <span className="text-foreground font-medium">{datasetName ?? 'Standardized Observation'}</span>
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {/* Position & Photometry */}
            <section className="space-y-2 pt-1">
              <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-primary" /> Astrometric & Photometric Position
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                <Cell k="RA (J2000)" v={`${raToHMS(point.ra)}`} sub={`${point.ra.toFixed(5)}°`} />
                <Cell k="Dec (J2000)" v={`${decToDMS(point.dec)}`} sub={`${point.dec.toFixed(5)}°`} />
                <Cell k="Magnitude" v={point.mag != null ? point.mag.toFixed(2) : '—'} sub="Apparent" />
                <Cell k="Signal-to-Noise" v={point.snr != null ? `${point.snr.toFixed(1)} σ` : '—'} sub="Detection" />
              </div>
            </section>

            {/* AI Gateway Section */}
            <section className="rounded-xl border border-primary/40 bg-gradient-to-br from-primary/10 via-card/70 to-accent/5 p-4 space-y-3 relative overflow-hidden shadow-lg">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/30 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
                    <Sparkles className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      AI Gateway Model Explanation
                      <span className="text-[10px] uppercase font-bold text-accent px-1.5 py-0.5 rounded bg-accent/15 border border-accent/30">
                        AI Gateway
                      </span>
                    </h3>
                    <p className="text-[11px] text-muted-foreground">
                      Synthesize measurements, survey boundaries & cross-matched catalog context
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value as ModelType)}
                    className="h-7 text-xs rounded-md bg-muted/60 border border-border/50 px-2 py-0.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                    <option value="gpt-4o">GPT-4o Astro Specialist</option>
                    <option value="claude-3.5-sonnet">Claude 3.5 Sonnet</option>
                    <option value="cosmic-astro-ai">Cosmic Astro-LLM</option>
                  </select>

                  <Button
                    size="sm"
                    variant="cosmic"
                    className="h-7 text-xs font-medium"
                    onClick={handleRunAIExplanation}
                    disabled={isAnalyzing}
                  >
                    {isAnalyzing ? (
                      <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                        Analyzing...
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        {aiResult ? 'Re-Analyze' : 'Explain with AI Gateway'}
                      </span>
                    )}
                  </Button>
                </div>
              </div>

              {/* Custom Researcher Prompt Field */}
              <div className="flex gap-2">
                <Input
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="Optional researcher prompt (e.g. 'Is this consistent with an active AGN or starburst galaxy?')"
                  className="h-8 text-xs bg-muted/30 border-border/40"
                  onKeyDown={(e) => e.key === 'Enter' && handleRunAIExplanation()}
                />
              </div>

              {/* AI Result Card */}
              {aiResult && (
                <div className="space-y-3 pt-1 text-xs">
                  <div className="p-3 rounded-lg bg-card/80 border border-border/40 space-y-2">
                    <div className="flex items-center justify-between text-muted-foreground border-b border-border/20 pb-1.5">
                      <span className="font-medium text-foreground flex items-center gap-1.5">
                        <Bot className="w-3.5 h-3.5 text-primary" /> {aiResult.modelName}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] text-muted-foreground">Generated at {aiResult.generatedAt}</span>
                        <button
                          onClick={handleCopyReport}
                          className="flex items-center gap-1 text-[11px] text-primary hover:underline"
                        >
                          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          {copied ? 'Copied' : 'Copy Report'}
                        </button>
                      </div>
                    </div>

                    <p className="text-foreground/95 leading-relaxed">
                      {aiResult.executiveSummary}
                    </p>

                    <div className="grid sm:grid-cols-2 gap-2 pt-1">
                      <div className="p-2 rounded bg-muted/30 border border-border/20">
                        <span className="text-[10px] uppercase text-muted-foreground font-semibold">Classification</span>
                        <div className="font-semibold text-primary mt-0.5">{aiResult.astrophysicalClassification}</div>
                      </div>
                      <div className="p-2 rounded bg-muted/30 border border-border/20">
                        <span className="text-[10px] uppercase text-muted-foreground font-semibold">Scientific Significance</span>
                        <div className="text-foreground/90 mt-0.5 text-[11px]">{aiResult.scientificSignificance}</div>
                      </div>
                    </div>
                  </div>

                  {/* Measurement Breakdown Details */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1">
                      <Activity className="w-3 h-3 text-primary" /> Measurement Interpretations
                    </span>
                    <div className="rounded-lg border border-border/30 divide-y divide-border/20 bg-card/60">
                      {aiResult.measurementBreakdown.map((m, idx) => (
                        <div key={idx} className="p-2 text-xs grid grid-cols-[140px_1fr] gap-2 items-start">
                          <div>
                            <span className="font-medium text-foreground">{m.metric}</span>
                            <div className="font-mono text-[11px] text-primary">{m.value}</div>
                          </div>
                          <div className="text-muted-foreground text-[11px]">{m.interpretation}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Cross-Catalog Context & Recommended Observations */}
                  <div className="grid sm:grid-cols-2 gap-2">
                    <div className="p-2.5 rounded-lg bg-card/60 border border-border/30 space-y-1">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Survey & Catalog Context</span>
                      <p className="text-[11px] text-foreground/80 leading-relaxed">{aiResult.catalogContext}</p>
                    </div>

                    <div className="p-2.5 rounded-lg bg-card/60 border border-border/30 space-y-1">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1">
                        <Lightbulb className="w-3 h-3 text-amber-400" /> Recommended Follow-up
                      </span>
                      <ul className="text-[11px] text-foreground/80 space-y-1 list-disc list-inside">
                        {aiResult.recommendedObservations.map((rec, i) => (
                          <li key={i}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* Catalog Match Section */}
            <section className="space-y-2">
              <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
                <ExternalLink className="w-3.5 h-3.5 text-primary" /> Reference Catalog Match
              </h4>
              {matched ? (
                <div className="rounded-lg bg-muted/30 border border-border/40 p-3 text-sm">
                  <div className="font-semibold text-foreground flex items-center gap-2">
                    {matched.o.name}
                    <span className="text-xs text-muted-foreground font-normal">
                      ({matched.o.type}, {matched.o.constellation})
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 flex gap-3">
                    <span>Separation: <span className="font-mono text-foreground">{(matched.sep * 3600).toFixed(1)}″</span></span>
                    <span>Distance: <span className="font-mono text-foreground">{matched.o.distance}</span></span>
                  </div>
                  <p className="text-xs mt-2 text-foreground/80">{matched.o.description}</p>
                </div>
              ) : (
                <div className="rounded-lg bg-muted/20 border border-border/30 p-3 text-xs text-muted-foreground flex items-center justify-between">
                  <span>No built-in catalog object within 1° cone.</span>
                  <a
                    className="text-primary hover:underline inline-flex items-center gap-1 font-medium"
                    target="_blank"
                    rel="noopener noreferrer"
                    href={`https://simbad.u-strasbg.fr/simbad/sim-coo?Coord=${point.ra}+${point.dec}&Radius=2&Radius.unit=arcmin`}
                  >
                    Search SIMBAD Database <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </section>

            {/* Raw Dataset Measurements */}
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-primary" /> Raw Row Attributes ({measurements.length})
                </h4>
              </div>
              <div className="rounded-lg border border-border/40 divide-y divide-border/20 text-xs font-mono max-h-40 overflow-y-auto bg-muted/10">
                {measurements.map(([k, v]) => (
                  <div key={k} className="flex justify-between px-3 py-1.5 hover:bg-muted/30">
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

function Cell({ k, v, sub }: { k: string; v: string; sub?: string }) {
  return (
    <div className="rounded-md bg-muted/30 border border-border/30 px-3 py-2">
      <div className="text-[10px] uppercase text-muted-foreground font-semibold">{k}</div>
      <div className="font-mono text-xs font-medium text-foreground mt-0.5 truncate">{v}</div>
      {sub && <div className="text-[9px] text-muted-foreground/75 mt-0.5">{sub}</div>}
    </div>
  );
}
