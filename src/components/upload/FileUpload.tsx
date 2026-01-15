import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, X, CheckCircle, AlertCircle, Loader2, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Papa from 'papaparse';

interface ParsedFile {
  name: string;
  type: 'fits' | 'csv' | 'unknown';
  size: number;
  status: 'parsing' | 'success' | 'error';
  data?: any;
  error?: string;
  headers?: string[];
  rowCount?: number;
  metadata?: Record<string, any>;
}

interface FileUploadProps {
  onFileParsed?: (file: ParsedFile) => void;
}

// FITS file header parser (simplified)
function parseFITSHeader(buffer: ArrayBuffer): Record<string, any> {
  const header: Record<string, any> = {};
  const view = new Uint8Array(buffer);
  const headerText = new TextDecoder('ascii').decode(view.slice(0, 2880));
  
  // Parse FITS header cards (80 characters each)
  for (let i = 0; i < headerText.length; i += 80) {
    const card = headerText.slice(i, i + 80);
    if (card.startsWith('END')) break;
    
    const keyword = card.slice(0, 8).trim();
    if (keyword && card[8] === '=') {
      let value = card.slice(10, 30).trim();
      // Remove quotes from string values
      if (value.startsWith("'")) {
        value = value.replace(/^'|'$/g, '').trim();
      }
      header[keyword] = value;
    }
  }
  
  return header;
}

// Parse FITS data (binary table or image)
function parseFITSData(buffer: ArrayBuffer, header: Record<string, any>): any {
  const naxis = parseInt(header.NAXIS || '0');
  const bitpix = parseInt(header.BITPIX || '0');
  
  if (naxis === 0) {
    return { type: 'empty', message: 'No data array present' };
  }
  
  const dimensions = [];
  for (let i = 1; i <= naxis; i++) {
    dimensions.push(parseInt(header[`NAXIS${i}`] || '0'));
  }
  
  // For now, return metadata about the data structure
  return {
    type: naxis === 2 ? 'image' : naxis === 1 ? 'spectrum' : 'datacube',
    dimensions,
    bitpix,
    dataSize: dimensions.reduce((a, b) => a * b, 1) * Math.abs(bitpix) / 8,
    sampleData: Array.from(new Float32Array(buffer.slice(2880, 2880 + 40))).slice(0, 10)
  };
}

export function FileUpload({ onFileParsed }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<ParsedFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseFile = useCallback(async (file: File) => {
    const parsedFile: ParsedFile = {
      name: file.name,
      type: 'unknown',
      size: file.size,
      status: 'parsing',
    };

    // Determine file type
    const extension = file.name.toLowerCase().split('.').pop();
    if (extension === 'fits' || extension === 'fit') {
      parsedFile.type = 'fits';
    } else if (extension === 'csv') {
      parsedFile.type = 'csv';
    }

    setFiles((prev) => [...prev, parsedFile]);

    try {
      if (parsedFile.type === 'csv') {
        // Parse CSV
        const text = await file.text();
        Papa.parse(text, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          complete: (results) => {
            setFiles((prev) =>
              prev.map((f) =>
                f.name === file.name
                  ? {
                      ...f,
                      status: 'success',
                      data: results.data.slice(0, 100), // Preview first 100 rows
                      headers: results.meta.fields || [],
                      rowCount: results.data.length,
                      metadata: {
                        delimiter: results.meta.delimiter,
                        linebreak: results.meta.linebreak,
                        fields: results.meta.fields?.length || 0,
                      },
                    }
                  : f
              )
            );
            if (onFileParsed) {
              onFileParsed({
                ...parsedFile,
                status: 'success',
                data: results.data.slice(0, 100),
                headers: results.meta.fields || [],
                rowCount: results.data.length,
              });
            }
          },
          error: (error) => {
            setFiles((prev) =>
              prev.map((f) =>
                f.name === file.name
                  ? { ...f, status: 'error', error: error.message }
                  : f
              )
            );
          },
        });
      } else if (parsedFile.type === 'fits') {
        // Parse FITS
        const buffer = await file.arrayBuffer();
        const header = parseFITSHeader(buffer);
        const data = parseFITSData(buffer, header);
        
        setFiles((prev) =>
          prev.map((f) =>
            f.name === file.name
              ? {
                  ...f,
                  status: 'success',
                  metadata: header,
                  data: data,
                  headers: Object.keys(header),
                }
              : f
          )
        );
        
        if (onFileParsed) {
          onFileParsed({
            ...parsedFile,
            status: 'success',
            metadata: header,
            data: data,
            headers: Object.keys(header),
          });
        }
      } else {
        setFiles((prev) =>
          prev.map((f) =>
            f.name === file.name
              ? { ...f, status: 'error', error: 'Unsupported file format' }
              : f
          )
        );
      }
    } catch (error) {
      setFiles((prev) =>
        prev.map((f) =>
          f.name === file.name
            ? { ...f, status: 'error', error: (error as Error).message }
            : f
        )
      );
    }
  }, [onFileParsed]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const droppedFiles = Array.from(e.dataTransfer.files);
      droppedFiles.forEach(parseFile);
    },
    [parseFile]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = Array.from(e.target.files || []);
      selectedFiles.forEach(parseFile);
    },
    [parseFile]
  );

  const removeFile = (name: string) => {
    setFiles((prev) => prev.filter((f) => f.name !== name));
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
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
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
        
        <motion.div
          animate={isDragging ? { scale: 1.1 } : { scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Upload className="w-8 h-8 text-primary" />
          </div>
          <div>
            <p className="text-lg font-display font-semibold text-foreground">
              Drop astronomical files here
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Supports FITS, CSV formats • Click or drag files
            </p>
          </div>
          <div className="flex gap-2">
            <span className="px-3 py-1 rounded-full text-xs bg-primary/10 text-primary border border-primary/20">
              .fits
            </span>
            <span className="px-3 py-1 rounded-full text-xs bg-secondary/10 text-secondary border border-secondary/20">
              .csv
            </span>
          </div>
        </motion.div>
      </motion.div>

      {/* File List */}
      <AnimatePresence mode="popLayout">
        {files.map((file, index) => (
          <motion.div
            key={file.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ delay: index * 0.1 }}
            className="glass-card p-4"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  file.type === 'fits' ? 'bg-secondary/20' : 
                  file.type === 'csv' ? 'bg-accent/20' : 'bg-muted'
                }`}>
                  {file.status === 'parsing' ? (
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  ) : file.type === 'fits' ? (
                    <Database className="w-6 h-6 text-secondary" />
                  ) : (
                    <FileText className="w-6 h-6 text-accent" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{file.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)}
                    </span>
                    {file.status === 'success' && (
                      <CheckCircle className="w-4 h-4 text-accent" />
                    )}
                    {file.status === 'error' && (
                      <AlertCircle className="w-4 h-4 text-destructive" />
                    )}
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
                          {file.data?.dimensions && ` • ${file.data.dimensions.join(' × ')} pixels`}
                        </span>
                      )}
                    </div>
                  )}
                  
                  {file.status === 'error' && (
                    <p className="mt-1 text-sm text-destructive">{file.error}</p>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeFile(file.name)}
                className="text-muted-foreground hover:text-destructive"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Data Preview */}
            {file.status === 'success' && file.type === 'csv' && file.data && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                className="mt-4 overflow-hidden"
              >
                <div className="text-xs font-medium text-muted-foreground mb-2">
                  Data Preview (first 5 rows)
                </div>
                <div className="overflow-x-auto rounded-lg border border-border/50">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50">
                      <tr>
                        {file.headers?.slice(0, 6).map((header) => (
                          <th key={header} className="px-3 py-2 text-left font-medium text-muted-foreground">
                            {header}
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
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                className="mt-4 overflow-hidden"
              >
                <div className="text-xs font-medium text-muted-foreground mb-2">
                  FITS Header Metadata
                </div>
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
