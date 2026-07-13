import { useEffect } from 'react';
import { Database, Loader2, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { useDatasets, Dataset } from '@/hooks/useDatasets';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

const STATUS_ICON: Record<Dataset['processing_status'], JSX.Element> = {
  pending: <Clock className="w-3 h-3 text-muted-foreground" />,
  processing: <Loader2 className="w-3 h-3 text-primary animate-spin" />,
  standardized: <CheckCircle2 className="w-3 h-3 text-accent" />,
  failed: <AlertCircle className="w-3 h-3 text-destructive" />,
};

export function DatasetPicker({ selectedId, onSelect }: Props) {
  const { datasets, loading, refreshDatasets } = useDatasets();

  // Realtime: any change to my datasets refreshes the list & selected state
  useEffect(() => {
    const channel = supabase
      .channel('skymap-datasets')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'datasets' }, () => refreshDatasets())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [refreshDatasets]);

  const usable = datasets.filter(d => d.processing_status !== 'failed');

  return (
    <div className="glass-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <Database className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-display font-semibold">Your Datasets</h3>
        <span className="text-[10px] text-muted-foreground ml-auto">Realtime</span>
      </div>

      {loading && <div className="text-xs text-muted-foreground">Loading datasets…</div>}
      {!loading && usable.length === 0 && (
        <div className="text-xs text-muted-foreground">
          No datasets yet. Upload a CSV with RA/Dec on the Datasets page to plot it here.
        </div>
      )}

      <div className="space-y-1.5 max-h-56 overflow-y-auto">
        <button
          onClick={() => onSelect(null)}
          className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors ${
            !selectedId ? 'bg-primary/20 text-primary border border-primary/40' : 'bg-muted/30 hover:bg-muted/50 border border-transparent'
          }`}
        >
          Built-in catalog only
        </button>
        {usable.map((d) => (
          <button
            key={d.id}
            onClick={() => onSelect(d.id)}
            className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex items-center gap-2 ${
              selectedId === d.id ? 'bg-primary/20 text-primary border border-primary/40' : 'bg-muted/30 hover:bg-muted/50 border border-transparent'
            }`}
          >
            {STATUS_ICON[d.processing_status]}
            <span className="flex-1 truncate">{d.name}</span>
            <span className="text-[9px] text-muted-foreground uppercase">
              {d.metadata?.file_format ?? '—'}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
