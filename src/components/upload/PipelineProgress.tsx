import { motion, AnimatePresence } from 'framer-motion';
import { Check, Loader2, AlertCircle, MinusCircle, Sparkles } from 'lucide-react';
import { PipelineStep, PipelineResult } from '@/lib/dataPipeline';

interface PipelineProgressProps {
  steps: PipelineStep[];
  result?: PipelineResult;
}

export function PipelineProgress({ steps, result }: PipelineProgressProps) {
  return (
    <div className="glass-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-primary" />
        <h4 className="font-display font-semibold text-sm">Automatic Standardization Pipeline</h4>
      </div>

      <div className="space-y-3">
        {steps.map((step, i) => (
          <div key={step.id} className="flex items-start gap-3">
            {/* Status icon */}
            <div className="mt-0.5 flex-shrink-0">
              {step.status === 'done' && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-6 h-6 rounded-full bg-accent/20 border border-accent/50 flex items-center justify-center"
                >
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

            {/* Line connector */}
            {i < steps.length - 1 && (
              <div className="absolute left-[26px] mt-8 w-0.5 h-3 bg-border/50" />
            )}

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-foreground">{step.title}</span>
                <span className={`text-[10px] uppercase tracking-wider ${
                  step.status === 'done' ? 'text-accent' :
                  step.status === 'running' ? 'text-primary' :
                  step.status === 'error' ? 'text-destructive' :
                  'text-muted-foreground'
                }`}>
                  {step.status}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
              <AnimatePresence>
                {step.output && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-1.5 text-xs text-foreground/80 font-mono px-2 py-1 rounded bg-muted/40 border border-border/30 inline-block"
                  >
                    → {step.output}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        ))}
      </div>

      {/* Summary once pipeline completes */}
      {result && steps.every(s => s.status === 'done' || s.status === 'skipped') && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="pt-4 border-t border-border/30 grid grid-cols-2 gap-2 text-xs"
        >
          {result.detectedCoordinateSystem && (
            <Stat label="Coord System" value={result.detectedCoordinateSystem.toUpperCase()} />
          )}
          {result.raColumn && (
            <Stat label="RA Column" value={result.raColumn} />
          )}
          {result.decColumn && (
            <Stat label="Dec Column" value={result.decColumn} />
          )}
          {result.raUnit && (
            <Stat label="RA Unit" value={result.raUnit} />
          )}
          {result.rowCount != null && (
            <Stat label="Rows" value={result.rowCount.toLocaleString()} />
          )}
          {result.columnCount != null && (
            <Stat label="Columns" value={String(result.columnCount)} />
          )}
          {result.objectName && (
            <Stat label="Object" value={result.objectName} />
          )}
          {result.temporalRange && (
            <Stat label="Epoch" value={result.temporalRange.start} />
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-2 rounded bg-muted/30 border border-border/30">
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-xs font-mono text-foreground mt-0.5 truncate">{value}</div>
    </div>
  );
}
