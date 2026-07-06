import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, X, CheckCircle, AlertCircle, Loader2, Database, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import Papa from 'papaparse';
import { useDatasets } from '@/hooks/useDatasets';
import { useAuth } from '@/hooks/useAuth';
import { runStandardizationPipeline, PipelineStep, PipelineResult } from '@/lib/dataPipeline';
import { PipelineProgress } from './PipelineProgress';
import { MiniSkyPreview } from '@/components/skymap/MiniSkyPreview';

interface ParsedFile {
  name: string;
  type: 'fits' | 'csv' | 'unknown';
  size: number;
  status: 'parsing' | 'processing' | 'success' | 'error' | 'uploading' | 'uploaded';
  data?: any;
  error?: string;
  headers?: string[];
  rowCount?: number;
  metadata?: Record<string, any>;
  file?: File;
  fullRows?: Array<Record<string, unknown>>;
  pipelineSteps?: PipelineStep[];
  pipelineResult?: PipelineResult;
}

interface FileUploadProps {
  onFileParsed?: (file: ParsedFile) => void;
  onDatasetUploaded?: () => void;
}

// FITS file header parser (simplified)
function parseFITSHeader(buffer: ArrayBuffer): Record<string, any> {
  const header: Record<string, any> = {};
  const view = new Uint8Array(buffer);
  const headerText = new TextDecoder('ascii').decode(view.slice(0, 2880));
  for (let i = 0; i < headerText.length; i += 80) {
    const card = headerText.slice(i, i + 80);
    if (card.startsWith('END')) break;
    const keyword = card.slice(0, 8).trim();
    if (keyword && card[8] === '=') {
      let value = card.slice(10, 30).trim();
      if (value.startsWith("'")) value = value.replace(/^'|'$/g, '').trim();
      header[keyword] = value;
    }
  }
  return header;
}

function parseFITSData(buffer: ArrayBuffer, header: Record<string, any>): any {
  const naxis = parseInt(header.NAXIS || '0');
  const bitpix = parseInt(header.BITPIX || '0');
  if (naxis === 0) return { type: 'empty', message: 'No data array present' };
  const dimensions: number[] = [];
  for (let i = 1; i <= naxis; i++) dimensions.push(parseInt(header[`NAXIS${i}`] || '0'));
  return {
    type: naxis === 2 ? 'image' : naxis === 1 ? 'spectrum' : 'datacube',
    dimensions,
    bitpix,
    dataSize: dimensions.reduce((a, b) => a * b, 1) * Math.abs(bitpix) / 8,
  };
}

export function FileUpload({ onFileParsed, onDatasetUploaded }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<ParsedFile[]>([]);
  const [datasetName, setDatasetName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<ParsedFile | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadDataset } = useDatasets();
  const { user } = useAuth();

  // Update a single file in state by name, and also update selectedFile if it's the one.
  const updateFile = useCallback((name: string, patch: Partial<ParsedFile>) => {
    setFiles((prev) => prev.map((f) => (f.name === name ? { ...f, ...patch } : f)));
    setSelectedFile((prev) => (prev && prev.name === name ? { ...prev, ...patch } : prev));
  }, []);

  const runPipeline = useCallback(
    async (fileName: string, args: Parameters<typeof runStandardizationPipeline>[0]) => {
      updateFile(fileName, { status: 'processing' });
      const result = await runStandardizationPipeline({
        ...args,
        onStep: (steps) => updateFile(fileName, { pipelineSteps: steps }),
      });
      updateFile(fileName, {
        status: result.detectedFormat === 'unknown' ? 'error' : 'success',
        pipelineResult: result,
        pipelineSteps: result.steps,
      });
      return result;
    },
    [updateFile]
  );

  const parseFile = useCallback(async (file: File) => {
    const parsedFile: ParsedFile = {
      name: file.name,
      type: 'unknown',
      size: file.size,
      status: 'parsing',
      file,
    };
    const extension = file.name.toLowerCase().split('.').pop();
    if (extension === 'fits' || extension === 'fit') parsedFile.type = 'fits';
    else if (extension === 'csv') parsedFile.type = 'csv';

    setFiles((prev) => [...prev, parsedFile]);
    setSelectedFile(parsedFile);

    try {
      if (parsedFile.type === 'csv') {
        const text = await file.text();
        Papa.parse(text, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          complete: async (results) => {
            const rows = results.data as Array<Record<string, unknown>>;
            const headers = results.meta.fields || [];
            const preview = rows.slice(0, 100);

            updateFile(file.name, {
              data: preview,
              headers,
              rowCount: rows.length,
              fullRows: rows.slice(0, 1000), // cap
              metadata: {
                delimiter: results.meta.delimiter,
                fields: headers.length,
              },
            });
            setDatasetName(file.name.replace(/\.[^/.]+$/, ''));

            // Run standardization pipeline
            const result = await runPipeline(file.name, {
              fileName: file.name,
              fileType: 'csv',
              parsedRows: rows,
              columnHeaders: headers,
              totalRowCount: rows.length,
            });
            onFileParsed?.({ ...parsedFile, status: 'success', pipelineResult: result });
          },
          error: (error) => {
            updateFile(file.name, { status: 'error', error: error.message });
          },
        });
      } else if (parsedFile.type === 'fits') {
        const buffer = await file.arrayBuffer();
        const header = parseFITSHeader(buffer);
        const data = parseFITSData(buffer, header);

        updateFile(file.name, {
          metadata: header,
          data,
          headers: Object.keys(header),
        });
        setDatasetName(header.OBJECT || file.name.replace(/\.[^/.]+$/, ''));

        const result = await runPipeline(file.name, {
          fileName: file.name,
          fileType: 'fits',
          headerData: header,
        });
        onFileParsed?.({ ...parsedFile, status: 'success', pipelineResult: result });
      } else {
        updateFile(file.name, { status: 'error', error: 'Unsupported file format' });
      }
    } catch (error) {
      updateFile(file.name, { status: 'error', error: (error as Error).message });
    }
  }, [onFileParsed, runPipeline, updateFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    droppedFiles.forEach(parseFile);
  }, [parseFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    selectedFiles.forEach(parseFile);
  }, [parseFile]);

  const removeFile = (name: string) => {
    setFiles((prev) => prev.filter((f) => f.name !== name));
    if (selectedFile?.name === name) {
      setSelectedFile(null);
      setDatasetName('');
      setDescription('');
    }
  };

  const handleSaveToDatabase = async () => {
    if (!selectedFile?.file || !datasetName || !user) return;
    updateFile(selectedFile.name, { status: 'uploading' });

    const p = selectedFile.pipelineResult;
    const result = await uploadDataset({
      name: datasetName,
      description: description || undefined,
      file: selectedFile.file,
      metadata: {
        file_name: selectedFile.name,
        file_format: selectedFile.type,
        file_size_bytes: selectedFile.size,
        object_name: p?.objectName ?? selectedFile.metadata?.OBJECT,
        num_rows: selectedFile.rowCount,
        num_columns: selectedFile.headers?.length,
        header_data: selectedFile.metadata,
        coordinate_system: p?.detectedCoordinateSystem,
        units: p?.raUnit ? `RA: ${p.raUnit === 'hours' ? 'hours→deg' : 'deg'}` : undefined,
      },
    });

    if (result) {
      updateFile(selectedFile.name, { status: 'uploaded' });
      setSelectedFile(null);
      setDatasetName('');
      setDescription('');
      onDatasetUploaded?.();
    } else {
      updateFile(selectedFile.name, { status: 'success' });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* Upload Zone */}
      <motion.div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`upload-zone cursor-pointer ${isDragging ? 'dragover' : ''}`}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".fits,.fit,.csv"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
        <motion.div animate={isDragging ? { scale: 1.1 } : { scale: 1 }} className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Upload className="w-8 h-8 text-primary" />
          </div>
          <div>
            <p className="text-lg font-display font-semibold text-foreground">Drop astronomical files here</p>
            <p className="text-sm text-muted-foreground mt-1">Supports FITS, CSV formats • Click or drag files</p>
          </div>
          <div className="flex gap-2">
            <span className="px-3 py-1 rounded-full text-xs bg-primary/10 text-primary border border-primary/20">.fits</span>
            <span className="px-3 py-1 rounded-full text-xs bg-secondary/10 text-secondary border border-secondary/20">.csv</span>
          </div>
        </motion.div>
      </motion.div>

      {/* Pipeline progress + mini sky preview */}
      {selectedFile?.pipelineSteps && (
        <div className="grid lg:grid-cols-[1fr_360px] gap-4">
          <PipelineProgress steps={selectedFile.pipelineSteps} result={selectedFile.pipelineResult} />
          {selectedFile.pipelineResult?.standardizedRows && (() => {
            const rows = selectedFile.pipelineResult.standardizedRows;
            const points = rows
              .map((r: any) => ({ ra: r._ra_deg, dec: r._dec_deg, name: r.name ?? r.Name ?? r.id }))
              .filter(p => typeof p.ra === 'number' && typeof p.dec === 'number')
              .slice(0, 500);
            return points.length > 0 ? <MiniSkyPreview points={points} /> : null;
          })()}
        </div>
      )}

      {/* Save to Database Form */}
      {selectedFile && selectedFile.status === 'success' && user && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
          <h3 className="font-display font-semibold text-lg mb-4 flex items-center gap-2">
            <Save className="w-5 h-5 text-primary" />
            Save to Cloud Repository
          </h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="datasetName">Dataset Name</Label>
              <Input
                id="datasetName"
                value={datasetName}
                onChange={(e) => setDatasetName(e.target.value)}
                placeholder="Enter dataset name"
                className="bg-muted/30 border-border/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe this dataset..."
                className="bg-muted/30 border-border/50 min-h-[80px]"
              />
            </div>
            <Button variant="cosmic" onClick={handleSaveToDatabase} disabled={!datasetName} className="w-full">
              <Database className="w-4 h-4" />
              Save Standardized Dataset to Cloud
            </Button>
          </div>
        </motion.div>
      )}

      {/* Auth prompt */}
      {selectedFile && selectedFile.status === 'success' && !user && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 text-center">
          <p className="text-muted-foreground mb-4">Sign in to save datasets to your cloud repository</p>
          <Button variant="cosmic" asChild><a href="/login">Sign In</a></Button>
        </motion.div>
      )}

      {/* File List */}
      <AnimatePresence mode="popLayout">
        {files.map((file, index) => (
          <motion.div
            key={file.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ delay: index * 0.1 }}
            className={`glass-card p-4 cursor-pointer ${selectedFile?.name === file.name ? 'ring-2 ring-primary' : ''}`}
            onClick={() => setSelectedFile(file)}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  file.type === 'fits' ? 'bg-secondary/20' : file.type === 'csv' ? 'bg-accent/20' : 'bg-muted'
                }`}>
                  {file.status === 'parsing' || file.status === 'processing' || file.status === 'uploading' ? (
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  ) : file.type === 'fits' ? (
                    <Database className="w-6 h-6 text-secondary" />
                  ) : (
                    <FileText className="w-6 h-6 text-accent" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{file.name}</span>
                    <span className="text-xs text-muted-foreground">{formatFileSize(file.size)}</span>
                    {file.status === 'success' && <CheckCircle className="w-4 h-4 text-accent" />}
                    {file.status === 'uploaded' && (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-accent/20 text-accent">Saved</span>
                    )}
                    {file.status === 'uploading' && (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-primary/20 text-primary">Uploading...</span>
                    )}
                    {file.status === 'processing' && (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-primary/20 text-primary">Standardizing...</span>
                    )}
                    {file.status === 'error' && <AlertCircle className="w-4 h-4 text-destructive" />}
                  </div>

                  {file.status === 'success' && (
                    <div className="mt-2 text-sm text-muted-foreground">
                      {file.type === 'csv' && (
                        <span>{file.rowCount?.toLocaleString()} rows • {file.headers?.length} columns</span>
                      )}
                      {file.type === 'fits' && file.metadata && (
                        <span>
                          {file.metadata.OBJECT && `Object: ${file.metadata.OBJECT} • `}
                          {file.data?.type && `Type: ${file.data.type}`}
                          {file.data?.dimensions && ` • ${file.data.dimensions.join(' × ')}`}
                        </span>
                      )}
                      {file.pipelineResult?.detectedCoordinateSystem && (
                        <span> • Coord: {file.pipelineResult.detectedCoordinateSystem.toUpperCase()}</span>
                      )}
                    </div>
                  )}
                  {file.status === 'error' && <p className="mt-1 text-sm text-destructive">{file.error}</p>}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => { e.stopPropagation(); removeFile(file.name); }}
                className="text-muted-foreground hover:text-destructive"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* CSV Preview */}
            {file.status === 'success' && file.type === 'csv' && file.data && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="mt-4 overflow-hidden">
                <div className="text-xs font-medium text-muted-foreground mb-2">Data Preview (first 5 rows)</div>
                <div className="overflow-x-auto rounded-lg border border-border/50">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50">
                      <tr>
                        {file.headers?.slice(0, 6).map((header) => (
                          <th key={header} className="px-3 py-2 text-left font-medium text-muted-foreground">
                            {header}
                            {file.pipelineResult?.raColumn === header && (
                              <span className="ml-1 text-[9px] text-primary">[RA]</span>
                            )}
                            {file.pipelineResult?.decColumn === header && (
                              <span className="ml-1 text-[9px] text-secondary">[Dec]</span>
                            )}
                          </th>
                        ))}
                        {(file.headers?.length || 0) > 6 && (
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground">...</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {file.data.slice(0, 5).map((row: any, i: number) => (
                        <tr key={i} className="border-t border-border/30">
                          {file.headers?.slice(0, 6).map((header) => (
                            <td key={header} className="px-3 py-2 text-foreground">
                              {typeof row[header] === 'number'
                                ? row[header].toFixed?.(4) ?? row[header]
                                : String(row[header] ?? '')}
                            </td>
                          ))}
                          {(file.headers?.length || 0) > 6 && (
                            <td className="px-3 py-2 text-muted-foreground">...</td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {/* FITS Metadata Preview */}
            {file.status === 'success' && file.type === 'fits' && file.metadata && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="mt-4 overflow-hidden">
                <div className="text-xs font-medium text-muted-foreground mb-2">FITS Header Metadata</div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {Object.entries(file.metadata).slice(0, 8).map(([key, value]) => (
                    <div key={key} className="px-3 py-2 rounded-lg bg-muted/30 border border-border/30">
                      <div className="text-[10px] text-muted-foreground uppercase">{key}</div>
                      <div className="text-sm font-mono text-foreground truncate">{String(value)}</div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
