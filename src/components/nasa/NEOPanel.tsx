import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, AlertTriangle, Rocket, ChevronDown, Shield, Gauge, Navigation, Calendar } from 'lucide-react';
import { fetchNEOToday, NEOItem } from '@/lib/nasa';

function formatMissDistance(km: number): string {
  if (km >= 1_000_000) return `${(km / 1_000_000).toFixed(2)}M km`;
  if (km >= 1_000) return `${(km / 1_000).toFixed(0)}K km`;
  return `${km.toFixed(0)} km`;
}

function diameterLabel(min: number, max: number): string {
  const avg = (min + max) / 2;
  if (avg >= 1000) return `${(avg / 1000).toFixed(1)} km`;
  return `${Math.round(min)}–${Math.round(max)} m`;
}

export function NEOPanel() {
  const [neos, setNeos] = useState<NEOItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    fetchNEOToday()
      .then(setNeos)
      .catch(() => setNeos([]))
      .finally(() => setLoading(false));
  }, []);

  const hazardCount = neos.filter((n) => n.hazardous).length;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border/30 flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-secondary/15 flex items-center justify-center">
          <Rocket className="w-4 h-4 text-secondary" />
        </div>
        <div>
          <h3 className="font-display font-semibold text-sm leading-none">Near-Earth Objects</h3>
          <p className="text-[10px] text-muted-foreground mt-0.5">Today's close approaches — NASA data</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {hazardCount > 0 && (
            <span className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-400 border border-yellow-500/30">
              <AlertTriangle className="w-2.5 h-2.5" /> {hazardCount} hazardous
            </span>
          )}
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-muted/50 text-muted-foreground border border-border/30">
            {neos.length} tracked
          </span>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="p-10 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="text-xs text-muted-foreground">Fetching today's NEO data from NASA…</span>
        </div>
      ) : neos.length === 0 ? (
        <div className="p-8 text-center">
          <Shield className="w-8 h-8 text-accent mx-auto mb-2 opacity-60" />
          <p className="text-sm font-medium text-foreground">All Clear Today</p>
          <p className="text-xs text-muted-foreground mt-1">No significant close approaches detected.</p>
        </div>
      ) : (
        <div className="divide-y divide-border/20">
          {neos.map((n, idx) => {
            const isOpen = openId === n.id;
            const threatColor = n.hazardous
              ? 'text-yellow-400 border-yellow-500/40 bg-yellow-500/8'
              : 'text-accent border-accent/30 bg-accent/5';
            const threatLabel = n.hazardous ? 'Potentially Hazardous' : 'No Threat';

            return (
              <div key={n.id}>
                <button
                  onClick={() => setOpenId(isOpen ? null : n.id)}
                  className="w-full text-left px-4 py-3.5 hover:bg-muted/20 transition-colors group"
                >
                  <div className="flex items-start gap-3">
                    {/* Index number */}
                    <span className="text-[11px] font-mono text-muted-foreground/50 mt-0.5 w-4 shrink-0">{idx + 1}</span>

                    {/* Main info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-foreground leading-tight">{n.name}</span>
                        {n.hazardous && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                            <AlertTriangle className="w-2.5 h-2.5" /> PHA
                          </span>
                        )}
                      </div>

                      {/* Key stats row */}
                      <div className="flex flex-wrap gap-3 mt-2">
                        <Stat icon={<Navigation className="w-3 h-3 text-primary/70" />} label="Miss Distance" value={formatMissDistance(n.approach.missKm)} />
                        <Stat icon={<Gauge className="w-3 h-3 text-secondary/70" />} label="Speed" value={`${n.approach.velocityKps.toFixed(1)} km/s`} />
                        <Stat icon={<span className="text-[10px] text-muted-foreground/60">⌀</span>} label="Diameter" value={diameterLabel(n.diameterMeters.min, n.diameterMeters.max)} />
                      </div>
                    </div>

                    <ChevronDown className={`w-4 h-4 text-muted-foreground/50 shrink-0 mt-1 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                  </div>
                </button>

                {/* Expanded detail */}
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 pt-1 ml-7">
                        <div className="rounded-xl border border-border/40 bg-muted/10 p-3 grid grid-cols-2 gap-3">
                          <DetailCard
                            icon={<Calendar className="w-3.5 h-3.5 text-primary" />}
                            label="Close Approach"
                            value={n.approach.date}
                          />
                          <DetailCard
                            icon={<Navigation className="w-3.5 h-3.5 text-primary" />}
                            label="Miss Distance (Lunar)"
                            value={`${n.approach.missLunar.toFixed(1)} LD`}
                            sub="(1 LD = 384,400 km)"
                          />
                          <DetailCard
                            icon={<Gauge className="w-3.5 h-3.5 text-secondary" />}
                            label="Relative Velocity"
                            value={`${n.approach.velocityKps.toFixed(2)} km/s`}
                            sub={`≈ ${(n.approach.velocityKps * 3600).toFixed(0)} km/h`}
                          />
                          <DetailCard
                            icon={<Shield className={`w-3.5 h-3.5 ${n.hazardous ? 'text-yellow-400' : 'text-accent'}`} />}
                            label="Hazard Classification"
                            value={threatLabel}
                            valueClass={n.hazardous ? 'text-yellow-400 font-bold' : 'text-accent font-medium'}
                          />
                        </div>
                        <p className="text-[10px] text-muted-foreground/60 mt-2 pl-0.5">
                          Data sourced from NASA Center for Near Earth Object Studies (CNEOS)
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5">
      {icon}
      <span className="text-[10px] text-muted-foreground">{label}:</span>
      <span className="text-[11px] font-semibold font-mono text-foreground">{value}</span>
    </div>
  );
}

function DetailCard({
  icon, label, value, sub, valueClass,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  valueClass?: string;
}) {
  return (
    <div className="flex flex-col gap-1 p-2.5 rounded-lg bg-card/60 border border-border/30">
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium uppercase tracking-wide">
        {icon}
        {label}
      </div>
      <div className={`text-sm font-mono leading-tight ${valueClass ?? 'text-foreground'}`}>{value}</div>
      {sub && <div className="text-[9px] text-muted-foreground/60">{sub}</div>}
    </div>
  );
}
