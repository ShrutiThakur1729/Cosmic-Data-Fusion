import { motion, AnimatePresence } from 'framer-motion';
import { Check, Loader2, AlertCircle, MinusCircle, Sparkles, ArrowDown } from 'lucide-react';
import { PipelineStep, PipelineResult } from '@/lib/dataPipeline';

interface Props { steps: PipelineStep[]; result?: PipelineResult; }

export function PipelineProgress({ steps, result }: Props) {
  return (
    <div className="glass-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-primary" />
        <h4 className="font-display font-semibold text-sm">Automatic Standardization Pipeline</h4>
      </div>

      <div className="space-y-2.5">
        {steps.map((step, i) => (
          <div key={step.id} className="flex items-start gap-3">
            <div className="mt-0.5 flex-shrink-0">
              {step.status === 'done' && (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                  className="w-6 h-6 rounded-full bg-accent/20 border border-accent/50 flex items-center justify-center">
                  <Check className="w-3.5 h-3.5 text-accent" />
                </motion.div>
              )}
              {step.status === 'running' && (
                <div className="w-6 h-6 rounded-full bg-primary/20 border border-primary/50 flex items-center justify-center">
                  <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
                </div>
              )}
              {step.status === 'pending' && (
                <div className="w-6 h-6 rounded-full bg-muted/50 border border-border/50 flex items-center justify-center">
                  <span className="text-[10px] text-muted-foreground font-mono">{i + 1}</span>
                </div>
              )}
              {step.status === 'error' && (
                <div className="w-6 h-6 rounded-full bg-destructive/20 border border-destructive/50 flex items-center justify-center">
                  <AlertCircle className="w-3.5 h-3.5 text-destructive" />
                </div>
              )}
              {step.status === 'skipped' && (
                <div className="w-6 h-6 rounded-full bg-muted/50 border border-border/50 flex items-center justify-center">
                  <MinusCircle className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-foreground">{step.title}</span>
                <span className={`text-[10px] uppercase tracking-wider ${
                  step.status === 'done' ? 'text-accent' :
                  step.status === 'running' ? 'text-primary' :
                  step.status === 'error' ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {step.status}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
              <AnimatePresence>
                {step.output && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    className="mt-1 text-xs text-foreground/80 font-mono px-2 py-0.5 rounded bg-muted/40 border border-border/30 inline-block">
                    → {step.output}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        ))}
      </div>

      {/* Coordinate conversion preview */}
      {result?.coordinateSamples && result.coordinateSamples.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pt-4 border-t border-border/30">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Coordinate Conversion Preview</div>
          <div className="space-y-1.5">
            {result.coordinateSamples.map((s, i) => (
              <div key={i} className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center text-xs font-mono">
                <div className="text-muted-foreground truncate">
                  <div>RA: {s.rawRa}</div>
                  <div>Dec: {s.rawDec}</div>
                </div>
                <ArrowDown className="w-3 h-3 text-primary rotate-[-90deg]" />
                <div className="text-foreground">
                  <div>{s.deg.toFixed(4)}°</div>
                  <div>{s.decDeg.toFixed(4)}°</div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Validation report */}
      {result?.validation && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="pt-4 border-t border-border/30 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Dataset Validation</div>
            <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider ${
              result.validation.ready ? 'bg-accent/20 text-accent' : 'bg-yellow-500/20 text-yellow-400'
            }`}>
              {result.validation.ready ? 'Dataset Ready' : 'Needs Review'}
            </span>
          </div>

          {/* Quality score bar */}
          <div>
            <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
              <span>Quality Score</span>
              <span className="font-mono text-foreground">{result.validation.qualityScore}/100</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: `${result.validation.qualityScore}%` }}
                transition={{ duration: 0.8 }}
                className={`h-full ${result.validation.qualityScore >= 70 ? 'bg-accent' :
                  result.validation.qualityScore >= 40 ? 'bg-yellow-500' : 'bg-destructive'}`} />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Stat label="Objects" value={result.validation.totalObjects.toLocaleString()} />
            <Stat label="Stars" value={String(result.validation.stars)} />
            <Stat label="Galaxies" value={String(result.validation.galaxies)} />
            <Stat label="Nebulae" value={String(result.validation.nebulae)} />
            <Stat label="Clusters" value={String(result.validation.clusters)} />
            <Stat label="Missing" value={String(result.validation.missingValues)} tone={result.validation.missingValues > 0 ? 'warn' : 'ok'} />
            <Stat label="Duplicates" value={String(result.validation.duplicates)} tone={result.validation.duplicates > 0 ? 'warn' : 'ok'} />
            <Stat label="Invalid Coords" value={String(result.validation.invalidCoords)} tone={result.validation.invalidCoords > 0 ? 'warn' : 'ok'} />
          </div>

          {(result.detectedCoordinateSystem || result.raUnit) && (
            <div className="grid grid-cols-2 gap-2">
              {result.detectedCoordinateSystem && <Stat label="Coord System" value={result.detectedCoordinateSystem.toUpperCase()} />}
              {result.raUnit && <Stat label="RA Unit" value={result.raUnit.toUpperCase()} />}
            </div>
          )}
        </motion.div>
      )}

      {result?.warnings && result.warnings.length > 0 && (
        <div className="pt-3 border-t border-border/30 space-y-1">
          {result.warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
              <AlertCircle className="w-3 h-3 text-yellow-500 flex-shrink-0 mt-0.5" />
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, tone = 'default' }: { label: string; value: string; tone?: 'default' | 'ok' | 'warn' }) {
  const color = tone === 'warn' ? 'text-yellow-400' : tone === 'ok' ? 'text-accent' : 'text-foreground';
  return (
    <div className="p-2 rounded bg-muted/30 border border-border/30">
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`text-xs font-mono mt-0.5 truncate ${color}`}>{value}</div>
    </div>
  );
}
