import { motion } from 'framer-motion';
import { Database, Clock, FileText, MoreVertical, ExternalLink, Download, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface DatasetCardProps {
  name: string;
  type: 'fits' | 'csv' | 'processed';
  size: string;
  rowCount?: number;
  lastModified: string;
  status: 'processing' | 'ready' | 'error';
  source?: string;
  onView?: () => void;
  onDownload?: () => void;
  onDelete?: () => void;
}

export function DatasetCard({
  name,
  type,
  size,
  rowCount,
  lastModified,
  status,
  source,
  onView,
  onDownload,
  onDelete,
}: DatasetCardProps) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className="glass-card-hover p-5 group"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            type === 'fits' ? 'bg-secondary/20' :
            type === 'csv' ? 'bg-accent/20' :
            'bg-primary/20'
          }`}>
            {type === 'fits' ? (
              <Database className="w-6 h-6 text-secondary" />
            ) : (
              <FileText className="w-6 h-6 text-accent" />
            )}
          </div>

          {/* Info */}
          <div>
            <h3 className="font-display font-semibold text-foreground group-hover:text-primary transition-colors">
              {name}
            </h3>
            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
              <span className="uppercase text-xs font-medium px-2 py-0.5 rounded bg-muted">
                {type}
              </span>
              <span>{size}</span>
              {rowCount && <span>{rowCount.toLocaleString()} rows</span>}
            </div>
            {source && (
              <div className="text-xs text-muted-foreground mt-1">
                Source: {source}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="glass-card border-border/50">
            <DropdownMenuItem onClick={onView} className="cursor-pointer">
              <ExternalLink className="w-4 h-4 mr-2" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDownload} className="cursor-pointer">
              <Download className="w-4 h-4 mr-2" />
              Download
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDelete} className="cursor-pointer text-destructive">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/30">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="w-3.5 h-3.5" />
          <span>{lastModified}</span>
        </div>
        <div className={`status-${status === 'ready' ? 'success' : status === 'processing' ? 'processing' : 'error'}`}>
          {status === 'processing' && (
            <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
          )}
          {status === 'ready' ? 'Ready' : status === 'processing' ? 'Processing' : 'Error'}
        </div>
      </div>

      {/* Processing animation */}
      {status === 'processing' && (
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: '60%' }}
          transition={{ duration: 2, ease: 'easeInOut' }}
          className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-primary to-secondary rounded-full"
        />
      )}
    </motion.div>
  );
}
