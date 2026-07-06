import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, AlertTriangle, Rocket, ChevronRight } from 'lucide-react';
import { fetchNEOToday, NEOItem } from '@/lib/nasa';

export function NEOPanel() {
  const [neos, setNeos] = useState<NEOItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<NEOItem | null>(null);

  useEffect(() => {
    fetchNEOToday().then(setNeos).catch(() => setNeos([])).finally(() => setLoading(false));
  }, []);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card">
      <div className="p-4 border-b border-border/30 flex items-center gap-2">
        <Rocket className="w-4 h-4 text-secondary" />
        <h3 className="font-display font-semibold text-sm">Near-Earth Objects (Today)</h3>
        <span className="ml-auto text-[10px] text-muted-foreground">{neos.length} tracked</span>
      </div>
      {loading ? (
        <div className="p-8 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : neos.length === 0 ? (
        <div className="p-6 text-sm text-muted-foreground text-center">No close approaches today.</div>
      ) : (
        <div className="max-h-80 overflow-y-auto divide-y divide-border/30">
          {neos.map(n => (
            <button key={n.id} onClick={() => setSelected(s => (s?.id === n.id ? null : n))}
              className="w-full text-left px-4 py-2.5 hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-2">
                {n.hazardous && <AlertTriangle className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{n.name}</div>
                  <div className="text-[10px] text-muted-foreground font-mono">
                    ⌀ {Math.round(n.diameterMeters.min)}–{Math.round(n.diameterMeters.max)} m • {n.approach.velocityKps.toFixed(1)} km/s • {(n.approach.missKm / 1e6).toFixed(2)}M km
                  </div>
                </div>
                <ChevronRight className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${selected?.id === n.id ? 'rotate-90' : ''}`} />
              </div>
              {selected?.id === n.id && (
                <div className="mt-2 pt-2 border-t border-border/30 grid grid-cols-2 gap-2 text-[10px]">
                  <Kv k="Approach" v={n.approach.date} />
                  <Kv k="Miss (lunar)" v={`${n.approach.missLunar.toFixed(1)} LD`} />
                  <Kv k="Velocity" v={`${n.approach.velocityKps.toFixed(2)} km/s`} />
                  <Kv k="Hazardous" v={n.hazardous ? 'Yes' : 'No'} tone={n.hazardous ? 'warn' : 'ok'} />
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </motion.div>
  );
}

function Kv({ k, v, tone }: { k: string; v: string; tone?: 'warn' | 'ok' }) {
  const color = tone === 'warn' ? 'text-yellow-400' : tone === 'ok' ? 'text-accent' : 'text-foreground';
  return (
    <div className="p-1.5 rounded bg-muted/30 border border-border/30">
      <div className="text-[9px] uppercase text-muted-foreground">{k}</div>
      <div className={`font-mono ${color}`}>{v}</div>
    </div>
  );
}
