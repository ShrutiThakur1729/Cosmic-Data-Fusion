import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, ExternalLink, Image as ImageIcon, Calendar, Maximize2 } from 'lucide-react';
import { fetchAPOD, APOD } from '@/lib/nasa';

export function APODCard() {
  const [apod, setApod] = useState<APOD | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  useEffect(() => {
    fetchAPOD()
      .then(setApod)
      .catch(() => setApod(null))
      .finally(() => setLoading(false));
  }, []);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border/30 flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center">
          <ImageIcon className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h3 className="font-display font-semibold text-sm leading-none">Astronomy Picture of the Day</h3>
          <p className="text-[10px] text-muted-foreground mt-0.5">Live from NASA APOD API</p>
        </div>
        <span className="ml-auto text-[10px] font-bold text-primary/80 tracking-widest uppercase">NASA</span>
      </div>

      {loading ? (
        <div className="p-10 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="text-xs text-muted-foreground">Loading today's astronomy image…</span>
        </div>
      ) : !apod ? (
        <div className="p-8 text-center">
          <p className="text-sm text-muted-foreground">Unable to load APOD right now.</p>
        </div>
      ) : (
        <div>
          {/* Image */}
          <div className="relative w-full bg-black" style={{ minHeight: '220px' }}>
            {apod.media_type === 'image' ? (
              <>
                {!imgLoaded && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="w-5 h-5 animate-spin text-primary/40" />
                  </div>
                )}
                <img
                  src={apod.url}
                  alt={apod.title}
                  onLoad={() => setImgLoaded(true)}
                  className={`w-full object-cover transition-opacity duration-700 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
                  style={{ maxHeight: '320px' }}
                />
                {/* Gradient overlay for title readability */}
                <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />
                {/* HD link badge on image */}
                {apod.hdurl && (
                  <a
                    href={apod.hdurl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute top-3 right-3 flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-md bg-black/60 backdrop-blur text-white hover:bg-black/80 transition-colors"
                  >
                    <Maximize2 className="w-3 h-3" /> HD
                  </a>
                )}
              </>
            ) : (
              <iframe
                src={apod.url}
                title={apod.title}
                className="w-full"
                style={{ height: '260px' }}
                allowFullScreen
              />
            )}
          </div>

          {/* Info */}
          <div className="p-4 space-y-3">
            {/* Title + date */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h4 className="font-display font-bold text-base text-foreground leading-snug">{apod.title}</h4>
                <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {apod.date}
                  </span>
                  {apod.copyright && (
                    <span className="truncate">© {apod.copyright}</span>
                  )}
                </div>
              </div>
              {apod.hdurl && (
                <a
                  href={apod.hdurl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 p-1.5 rounded-lg text-primary hover:bg-primary/10 transition-colors"
                  title="View full resolution"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>

            {/* Explanation */}
            <div>
              <p className={`text-sm text-muted-foreground leading-relaxed ${expanded ? '' : 'line-clamp-3'}`}>
                {apod.explanation}
              </p>
              <button
                onClick={() => setExpanded((v) => !v)}
                className="mt-1.5 text-xs text-primary hover:text-primary/80 font-medium hover:underline transition-colors"
              >
                {expanded ? '↑ Show less' : '↓ Read full description'}
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
