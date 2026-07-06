import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, ExternalLink, Image as ImageIcon } from 'lucide-react';
import { fetchAPOD, APOD } from '@/lib/nasa';

export function APODCard() {
  const [apod, setApod] = useState<APOD | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetchAPOD().then(setApod).catch(() => setApod(null)).finally(() => setLoading(false));
  }, []);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card overflow-hidden">
      <div className="p-4 border-b border-border/30 flex items-center gap-2">
        <ImageIcon className="w-4 h-4 text-primary" />
        <h3 className="font-display font-semibold text-sm">Astronomy Picture of the Day</h3>
        <span className="ml-auto text-[10px] text-muted-foreground">NASA</span>
      </div>
      {loading ? (
        <div className="p-8 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : !apod ? (
        <div className="p-6 text-sm text-muted-foreground text-center">Unable to load APOD right now.</div>
      ) : (
        <div>
          {apod.media_type === 'image' ? (
            <div className="relative w-full h-56 overflow-hidden bg-black">
              <img src={apod.url} alt={apod.title} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="relative w-full h-56 overflow-hidden bg-black">
              <iframe src={apod.url} title={apod.title} className="w-full h-full" allowFullScreen />
            </div>
          )}
          <div className="p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-display font-semibold text-foreground">{apod.title}</div>
                <div className="text-[10px] text-muted-foreground">{apod.date}{apod.copyright ? ` • © ${apod.copyright}` : ''}</div>
              </div>
              {apod.hdurl && (
                <a href={apod.hdurl} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80">
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
            <p className={`text-xs text-muted-foreground leading-relaxed ${expanded ? '' : 'line-clamp-3'}`}>
              {apod.explanation}
            </p>
            <button onClick={() => setExpanded(v => !v)} className="text-[10px] text-primary hover:underline">
              {expanded ? 'Show less' : 'Read more'}
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
