import { useEffect, useState, useRef } from 'react';
import Papa from 'papaparse';
import { supabase } from '@/integrations/supabase/client';
import { runStandardizationPipeline, PipelineResult } from '@/lib/dataPipeline';

export type LoadStage = 'idle' | 'fetching-file' | 'downloading' | 'parsing' | 'standardizing' | 'ready' | 'error';

export interface DatasetPoint { ra: number; dec: number; name: string; mag?: number; type?: string; snr?: number; row: Record<string, unknown> }

export interface DatasetLoadState {
  stage: LoadStage;
  progress: number;         // 0..1
  message: string;
  points: DatasetPoint[];
  result?: PipelineResult;
  error?: string;
}

const initial: DatasetLoadState = { stage: 'idle', progress: 0, message: '', points: [] };

// Downloads the latest version file for a dataset from storage, parses it, and
// runs the standardization pipeline — same code path used at upload time —
// producing normalized RA/Dec points for the sky map.
export function useDatasetPoints(datasetId: string | null): DatasetLoadState {
  const [state, setState] = useState<DatasetLoadState>(initial);
  const currentId = useRef<string | null>(null);

  useEffect(() => {
    currentId.current = datasetId;
    if (!datasetId) { setState(initial); return; }

    let cancelled = false;
    const patch = (p: Partial<DatasetLoadState>) => {
      if (cancelled || currentId.current !== datasetId) return;
      setState(s => ({ ...s, ...p }));
    };

    (async () => {
      try {
        patch({ stage: 'fetching-file', progress: 0.05, message: 'Locating stored file…', points: [] });
        const { data: versions, error: vErr } = await supabase
          .from('dataset_versions')
          .select('file_path, version_number')
          .eq('dataset_id', datasetId)
          .order('version_number', { ascending: false })
          .limit(1);
        if (vErr) throw vErr;
        const path = versions?.[0]?.file_path;
        if (!path) throw new Error('No file version found for this dataset.');

        patch({ stage: 'downloading', progress: 0.2, message: `Downloading ${path.split('/').pop()}…` });
        const { data: blob, error: dErr } = await supabase.storage.from('datasets').download(path);
        if (dErr) throw dErr;

        patch({ stage: 'parsing', progress: 0.45, message: 'Parsing CSV…' });
        const text = await blob.text();
        const parsed = Papa.parse<Record<string, unknown>>(text, {
          header: true, dynamicTyping: true, skipEmptyLines: true,
        });
        const rows = parsed.data ?? [];
        const headers = parsed.meta.fields ?? [];

        patch({ stage: 'standardizing', progress: 0.65, message: `Standardizing ${rows.length.toLocaleString()} rows…` });
        const result = await runStandardizationPipeline({
          fileName: path,
          fileType: 'csv',
          parsedRows: rows,
          columnHeaders: headers,
          totalRowCount: rows.length,
        });

        const std = result.standardizedRows ?? [];
        const points: DatasetPoint[] = [];
        for (const r of std) {
          const ra = r._ra_deg as number | null;
          const dec = r._dec_deg as number | null;
          if (typeof ra === 'number' && typeof dec === 'number' &&
              ra >= 0 && ra <= 360 && dec >= -90 && dec <= 90) {
            const anyR = r as any;
            points.push({
              ra, dec,
              name: String(anyR.name ?? anyR.Name ?? anyR.id ?? anyR.designation ?? `row-${points.length + 1}`),
              mag: Number(anyR.mag ?? anyR.magnitude ?? anyR.Vmag ?? anyR.vmag) || undefined,
              type: (anyR.type ?? anyR.otype ?? undefined) as string | undefined,
              snr: Number(anyR.snr ?? anyR.SNR ?? anyR.s_n ?? anyR.signal_to_noise) || undefined,
              row: r,
            });
          }
          if (points.length >= 2000) break;
        }

        patch({
          stage: 'ready',
          progress: 1,
          message: `Loaded ${points.length.toLocaleString()} points`,
          points,
          result,
        });
      } catch (e: any) {
        patch({ stage: 'error', progress: 1, message: e.message ?? 'Failed to load dataset', error: e.message });
      }
    })();

    return () => { cancelled = true; };
  }, [datasetId]);

  return state;
}
