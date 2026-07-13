import { Loader2, CheckCircle2, AlertCircle, Database } from 'lucide-react';
import type { LoadStage } from '@/hooks/useDatasetPoints';

interface Props {
  stage: LoadStage;
  progress: number;
  message: string;
  pointCount: number;
}

const STAGE_LABEL: Record<LoadStage, string> = {
  idle: 'Idle',
  'fetching-file': 'Fetching file',
  downloading: 'Downloading',
  parsing: 'Parsing',
  standardizing: 'Standardizing',
  ready: 'Ready',
  error: 'Error',
};

export function SkyMapLoadStatus({ stage, progress, message, pointCount }: Props) {
  if (stage === 'idle') return null;
  const busy = stage !== 'ready' && stage !== 'error';
  const Icon = stage === 'ready' ? CheckCircle2 : stage === 'error' ? AlertCircle : busy ? Loader2 : Database;
  const tone =
    stage === 'error' ? 'text-destructive border-destructive/40 bg-destructive/10'
    : stage === 'ready' ? 'text-accent border-accent/40 bg-accent/10'
    : 'text-primary border-primary/40 bg-primary/10';

  return (
    <div className={`absolute bottom-4 right-4 z-20 glass-card px-4 py-3 min-w-[240px] border ${tone}`}>
      <div className="flex items-center gap-2">
        <Icon className={`w-4 h-4 ${busy ? 'animate-spin' : ''}`} />
        <div className="text-xs font-display font-semibold">{STAGE_LABEL[stage]}</div>
        <div className="text-[10px] text-muted-foreground ml-auto">
          {stage === 'ready' ? `${pointCount.toLocaleString()} pts` : `${Math.round(progress * 100)}%`}
        </div>
      </div>
      <div className="text-[10px] text-muted-foreground mt-1 truncate">{message}</div>
      <div className="mt-2 h-1 rounded-full bg-muted/40 overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${
            stage === 'error' ? 'bg-destructive' : stage === 'ready' ? 'bg-accent' : 'bg-primary'
          }`}
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </div>
    </div>
  );
}
