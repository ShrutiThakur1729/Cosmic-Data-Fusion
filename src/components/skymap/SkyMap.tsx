import { useRef, useMemo, useState, useCallback, useEffect, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars, Html } from '@react-three/drei';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, ExternalLink, Info, Eye, EyeOff, RotateCcw } from 'lucide-react';
import { CELESTIAL_OBJECTS, CelestialObject } from '@/data/celestialObjects';
import {
  colorForObject,
  radiusFromMagnitude,
  glowFromMagnitude,
  getStarSpriteTexture,
  raToHMS,
  decToDMS,
} from '@/lib/starColor';
import { MilkyWaySphere } from './MilkyWaySphere';
import { SmartImage } from './SmartImage';

// ─── coord math ───────────────────────────────────────────────────────────
function equatorialToGalactic(raDeg: number, decDeg: number) {
  const ra = (raDeg * Math.PI) / 180;
  const dec = (decDeg * Math.PI) / 180;
  const raGP = (192.859508 * Math.PI) / 180;
  const decGP = (27.128336 * Math.PI) / 180;
  const lNCP = (122.932 * Math.PI) / 180;
  const sinB = Math.sin(dec) * Math.sin(decGP) + Math.cos(dec) * Math.cos(decGP) * Math.cos(ra - raGP);
  const b = Math.asin(sinB);
  const y = Math.cos(dec) * Math.sin(ra - raGP);
  const x = Math.sin(dec) * Math.cos(decGP) - Math.cos(dec) * Math.sin(decGP) * Math.cos(ra - raGP);
  let l = lNCP - Math.atan2(y, x);
  if (l < 0) l += 2 * Math.PI;
  if (l > 2 * Math.PI) l -= 2 * Math.PI;
  return { l: (l * 180) / Math.PI, b: (b * 180) / Math.PI };
}

function sphericalToPosition(lonDeg: number, latDeg: number, radius = 10): [number, number, number] {
  const lon = (lonDeg * Math.PI) / 180;
  const lat = (latDeg * Math.PI) / 180;
  return [radius * Math.cos(lat) * Math.cos(lon), radius * Math.sin(lat), radius * Math.cos(lat) * Math.sin(lon)];
}

// ─── background milky way band + faint stars ──────────────────────────────
function MilkyWayBand() {
  // Procedural galactic-plane band: a translucent sphere shell colored with a
  // shader that brightens near b = 0 (galactic equator).
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {},
      vertexShader: `
        varying vec3 vPos;
        void main() {
          vPos = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vPos;
        // Rotate world -> galactic (approx J2000 galactic pole)
        void main() {
          // galactic north pole direction in equatorial (x=east, y=up, z=south)
          vec3 gp = normalize(vec3(-0.054, 0.457, 0.888));
          float b = asin(clamp(dot(vPos, gp), -1.0, 1.0));
          float band = exp(-pow(b / 0.28, 2.0));   // gaussian around b=0
          // subtle color variation along longitude
          float lon = atan(vPos.z, vPos.x);
          float dust = 0.4 + 0.6 * (0.5 + 0.5 * sin(lon * 3.0));
          vec3 col = mix(vec3(0.35, 0.30, 0.55), vec3(0.95, 0.85, 0.70), dust);
          float alpha = band * 0.18;
          gl_FragColor = vec4(col * band, alpha);
        }
      `,
    });
  }, []);
  return (
    <mesh>
      <sphereGeometry args={[95, 96, 64]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}

// ─── grid / equator / plane overlays ──────────────────────────────────────
type Overlays = {
  grid: boolean; equator: boolean; galactic: boolean; ecliptic: boolean; constellations: boolean;
};

function circleOnSphere(fn: (t: number) => { lon: number; lat: number }, steps = 200, r = 9.9) {
  const arr: number[] = [];
  for (let i = 0; i <= steps; i++) {
    const { lon, lat } = fn(i / steps);
    const [x, y, z] = sphericalToPosition(lon, lat, r);
    arr.push(x, y, z);
  }
  return new Float32Array(arr);
}

function OverlayLine({ points, color, opacity }: { points: Float32Array; color: string; opacity: number }) {
  return (
    <line>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={points.length / 3} array={points} itemSize={3} />
      </bufferGeometry>
      <lineBasicMaterial color={color} transparent opacity={opacity} />
    </line>
  );
}

function CelestialOverlays({ overlays }: { overlays: Overlays }) {
  const raLines = useMemo(() => Array.from({ length: 12 }, (_, i) =>
    circleOnSphere(t => ({ lon: i * 30, lat: -85 + t * 170 }), 60)
  ), []);
  const decLines = useMemo(() => [-60, -30, 0, 30, 60].map(dec =>
    circleOnSphere(t => ({ lon: t * 360, lat: dec }), 180)
  ), []);
  const equator = useMemo(() => circleOnSphere(t => ({ lon: t * 360, lat: 0 }), 240), []);
  const ecliptic = useMemo(() => {
    // ecliptic tilted ~23.4° from celestial equator
    const eps = 23.4392911 * Math.PI / 180;
    const arr: number[] = [];
    for (let i = 0; i <= 240; i++) {
      const lam = (i / 240) * 2 * Math.PI;
      const x = Math.cos(lam);
      const y = Math.sin(lam) * Math.cos(eps);
      const z = Math.sin(lam) * Math.sin(eps);
      const r = 9.9;
      arr.push(r * x, r * z, r * y);
    }
    return new Float32Array(arr);
  }, []);
  const galactic = useMemo(() => {
    const arr: number[] = [];
    for (let i = 0; i <= 240; i++) {
      const l = (i / 240) * 360;
      // galactic -> equatorial inverse: use approximation by reversing formula.
      // simplest: sample galactic (l, 0) and rotate into equatorial using known pole.
      const b = 0;
      const raGP = 192.859508, decGP = 27.128336, lNCP = 122.932;
      const lRad = l * Math.PI / 180;
      const bRad = b * Math.PI / 180;
      const decGPr = decGP * Math.PI / 180;
      const raGPr = raGP * Math.PI / 180;
      const lNCPr = lNCP * Math.PI / 180;
      const sinDec = Math.sin(bRad) * Math.sin(decGPr) + Math.cos(bRad) * Math.cos(decGPr) * Math.cos(lNCPr - lRad);
      const dec = Math.asin(sinDec);
      const y = Math.cos(bRad) * Math.sin(lNCPr - lRad);
      const x = Math.sin(bRad) * Math.cos(decGPr) - Math.cos(bRad) * Math.sin(decGPr) * Math.cos(lNCPr - lRad);
      const ra = Math.atan2(y, x) + raGPr;
      const [X, Y, Z] = sphericalToPosition(ra * 180 / Math.PI, dec * 180 / Math.PI, 9.9);
      arr.push(X, Y, Z);
    }
    return new Float32Array(arr);
  }, []);

  return (
    <group>
      {overlays.grid && raLines.map((p, i) => <OverlayLine key={`r${i}`} points={p} color="#4a5b8a" opacity={0.07} />)}
      {overlays.grid && decLines.map((p, i) => <OverlayLine key={`d${i}`} points={p} color="#4a5b8a" opacity={0.07} />)}
      {overlays.equator && <OverlayLine points={equator} color="#60d5fa" opacity={0.35} />}
      {overlays.ecliptic && <OverlayLine points={ecliptic} color="#fbbf24" opacity={0.28} />}
      {overlays.galactic && <OverlayLine points={galactic} color="#a855f7" opacity={0.32} />}
    </group>
  );
}

// ─── celestial billboard object (magnitude-scaled) ────────────────────────
interface PointProps {
  object: CelestialObject;
  position: [number, number, number];
  isSelected: boolean;
  isHovered: boolean;
  onClick: () => void;
  onHover: (h: boolean) => void;
}

function CelestialSprite({ object, position, isSelected, isHovered, onClick, onHover }: PointProps) {
  const grpRef = useRef<THREE.Group>(null);
  const color = colorForObject(object.name, object.type);
  const size = radiusFromMagnitude(object.mag);
  const glow = glowFromMagnitude(object.mag);
  const tex = useMemo(() => getStarSpriteTexture(THREE), []);

  const isPointStar = object.type === 'star';
  const coreSize = isPointStar ? size * 0.9 : size * 1.6;
  const glowSize = isPointStar ? size * 3.5 : size * 4.0;

  useFrame((state) => {
    if (!grpRef.current) return;
    const t = state.clock.elapsedTime;
    // subtle twinkle for stars
    if (isPointStar) {
      const flicker = 1 + Math.sin(t * 3 + object.ra) * 0.08;
      grpRef.current.scale.setScalar(flicker);
    }
    if (isSelected) {
      grpRef.current.scale.setScalar(1 + Math.sin(t * 4) * 0.18 + 0.15);
    }
  });

  return (
    <group ref={grpRef} position={position}>
      {/* core */}
      <sprite
        scale={[coreSize, coreSize, 1]}
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        onPointerOver={(e) => { e.stopPropagation(); onHover(true); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { onHover(false); document.body.style.cursor = 'auto'; }}
      >
        <spriteMaterial map={tex} color={color} transparent depthWrite={false} />
      </sprite>
      {/* halo */}
      <sprite scale={[glowSize, glowSize, 1]}>
        <spriteMaterial
          map={tex}
          color={color}
          transparent
          opacity={isSelected ? 0.8 : isHovered ? 0.5 : glow * 0.35}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>
      {(isSelected || isHovered) && (
        <Html distanceFactor={9} position={[0, coreSize * 0.9 + 0.25, 0]} center>
          <div className="glass-card px-3 py-1.5 pointer-events-none whitespace-nowrap text-center">
            <div className="text-xs font-display font-semibold" style={{ color }}>{object.name}</div>
            <div className="text-[9px] text-muted-foreground mt-0.5 flex gap-2 justify-center">
              <span>{object.type}</span>
              <span>• mag {object.mag}</span>
              <span>• {object.constellation}</span>
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}

// ─── camera controller with fly-to and ESC reset ──────────────────────────
interface CamCtrlProps { target: THREE.Vector3 | null; onReset: () => void; }
function CameraController({ target, onReset }: CamCtrlProps) {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);
  const desired = useRef<THREE.Vector3 | null>(null);

  useEffect(() => {
    if (target) {
      // vantage point: pull camera slightly outside sphere pointing at target
      desired.current = target.clone().normalize().multiplyScalar(13);
    }
  }, [target]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        desired.current = new THREE.Vector3(15, 5, 15);
        onReset();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onReset]);

  useFrame(() => {
    if (desired.current) {
      camera.position.lerp(desired.current, 0.06);
      if (camera.position.distanceTo(desired.current) < 0.05) desired.current = null;
    }
    // slow drift
    const drift = 0.0002;
    camera.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), drift);
    if (controlsRef.current) controlsRef.current.update();
  });

  return <OrbitControls ref={controlsRef} enableDamping dampingFactor={0.08} minDistance={6} maxDistance={40} />;
}

// ─── main component ───────────────────────────────────────────────────────
interface SkyMapProps {
  customObjects?: Array<Partial<CelestialObject> & { name: string; ra: number; dec: number }>;
  compact?: boolean;
}

export function SkyMap({ customObjects = [], compact = false }: SkyMapProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [coordinateSystem, setCoordinateSystem] = useState<'equatorial' | 'galactic'>('equatorial');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [overlays, setOverlays] = useState<Overlays>({
    grid: true, equator: true, galactic: true, ecliptic: false, constellations: false,
  });
  const [flyTarget, setFlyTarget] = useState<THREE.Vector3 | null>(null);

  const allObjects = useMemo<CelestialObject[]>(() => {
    const custom: CelestialObject[] = customObjects.map((obj, i) => ({
      id: `custom-${i}`,
      name: obj.name,
      ra: obj.ra,
      dec: obj.dec,
      mag: obj.mag ?? 5,
      type: (obj.type as CelestialObject['type']) ?? 'star',
      constellation: obj.constellation ?? 'User Data',
      distance: obj.distance ?? 'Unknown',
      description: obj.description ?? 'Custom object from uploaded dataset.',
      imageUrl: obj.imageUrl ?? '',
      sourceLink: obj.sourceLink ?? '',
    }));
    return [...CELESTIAL_OBJECTS, ...custom];
  }, [customObjects]);

  const filtered = useMemo(() => allObjects.filter(o => {
    if (filterType !== 'all' && o.type !== filterType) return false;
    if (searchQuery && !o.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !o.constellation.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  }), [allObjects, searchQuery, filterType]);

  const positioned = useMemo(() => filtered.map(obj => {
    const c = coordinateSystem === 'galactic' ? equatorialToGalactic(obj.ra, obj.dec) : { l: obj.ra, b: obj.dec };
    return { obj, position: sphericalToPosition(c.l, c.b) as [number, number, number] };
  }), [filtered, coordinateSystem]);

  const selectedObject = allObjects.find(o => o.id === selectedId) ?? null;

  const handleObjectClick = useCallback((id: string) => {
    const entry = positioned.find(p => p.obj.id === id);
    if (entry) setFlyTarget(new THREE.Vector3(...entry.position));
    setSelectedId(prev => (prev === id ? null : id));
  }, [positioned]);

  const counts = useMemo(() => {
    const c = { star: 0, galaxy: 0, nebula: 0, cluster: 0, planet: 0 };
    allObjects.forEach(o => { c[o.type] = (c[o.type] ?? 0) + 1; });
    return c;
  }, [allObjects]);

  const toggle = (k: keyof Overlays) => setOverlays(o => ({ ...o, [k]: !o[k] }));

  return (
    <div className="relative w-full h-full min-h-[500px] rounded-xl overflow-hidden glass-card">
      {!compact && (
        <>
          {/* controls */}
          <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 max-w-[260px]">
            <div className="flex gap-2">
              <button onClick={() => setCoordinateSystem('equatorial')}
                className={`px-3 py-1.5 text-xs rounded-lg ${coordinateSystem === 'equatorial' ? 'bg-primary text-primary-foreground' : 'bg-muted/60 text-muted-foreground hover:bg-muted backdrop-blur'}`}>Equatorial</button>
              <button onClick={() => setCoordinateSystem('galactic')}
                className={`px-3 py-1.5 text-xs rounded-lg ${coordinateSystem === 'galactic' ? 'bg-primary text-primary-foreground' : 'bg-muted/60 text-muted-foreground hover:bg-muted backdrop-blur'}`}>Galactic</button>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input type="text" placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-muted/60 backdrop-blur border border-border/40 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60" />
            </div>
            <div className="flex flex-wrap gap-1">
              {(['all', 'star', 'galaxy', 'nebula', 'cluster'] as const).map(t => (
                <button key={t} onClick={() => setFilterType(t)}
                  className={`px-2 py-0.5 text-[10px] rounded uppercase tracking-wider ${filterType === t ? 'bg-primary/30 text-primary border border-primary/50' : 'bg-muted/40 text-muted-foreground hover:bg-muted/60 border border-transparent'}`}>{t}</button>
              ))}
            </div>

            {/* overlay toggles */}
            <div className="glass-card p-2.5 space-y-1.5 mt-1">
              <div className="text-[9px] uppercase tracking-widest text-muted-foreground mb-1">Sky Overlays</div>
              {(Object.keys(overlays) as (keyof Overlays)[]).map(k => (
                <button key={k} onClick={() => toggle(k)}
                  className="flex items-center gap-2 w-full text-[10px] text-foreground/80 hover:text-foreground">
                  {overlays[k] ? <Eye className="w-3 h-3 text-primary" /> : <EyeOff className="w-3 h-3 text-muted-foreground" />}
                  <span className="capitalize">{k}</span>
                </button>
              ))}
              <button onClick={() => setFlyTarget(new THREE.Vector3(15, 5, 15))}
                className="flex items-center gap-2 w-full text-[10px] text-foreground/70 hover:text-foreground pt-1 border-t border-border/30 mt-1">
                <RotateCcw className="w-3 h-3" /> Reset view (Esc)
              </button>
            </div>
          </div>

          {/* legend */}
          <div className="absolute top-4 right-4 z-10 glass-card px-3 py-2">
            <div className="text-[10px] font-medium text-muted-foreground mb-2 uppercase tracking-wider">Catalog</div>
            <div className="space-y-1.5">
              {[
                { type: 'Stars', color: '#e6efff', n: counts.star },
                { type: 'Galaxies', color: '#c9a7ff', n: counts.galaxy },
                { type: 'Nebulae', color: '#ff9dc9', n: counts.nebula },
                { type: 'Clusters', color: '#ffe08a', n: counts.cluster },
              ].map(({ type, color, n }) => (
                <div key={type} className="flex items-center gap-2 text-xs">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }} />
                  <span className="text-muted-foreground">{type}</span>
                  <span className="text-foreground/70 ml-auto">{n}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="absolute bottom-4 left-4 z-10 text-xs text-muted-foreground flex items-center gap-2">
            <Info className="w-3 h-3" />
            {positioned.length} objects • Click to fly to • Esc to reset • Scroll to zoom
          </div>
        </>
      )}

      <Canvas camera={{ position: [15, 5, 15], fov: 60 }} onPointerMissed={() => setSelectedId(null)}>
        <ambientLight intensity={0.25} />
        {/* dense faint background stars */}
        <Stars radius={90} depth={60} count={compact ? 3000 : 15000} factor={2.2} saturation={0} fade speed={0.4} />
        {/* Real ESO Milky Way panorama (equirectangular) as the celestial sphere */}
        <Suspense fallback={<MilkyWayBand />}>
          <MilkyWaySphere radius={60} opacity={0.75} />
        </Suspense>

        {/* inner tint to preserve foreground contrast */}
        <mesh>
          <sphereGeometry args={[10, 64, 64]} />
          <meshBasicMaterial color="#05060d" side={THREE.BackSide} transparent opacity={0.25} depthWrite={false} />
        </mesh>

        <CelestialOverlays overlays={overlays} />

        {positioned.map(({ obj, position }) => (
          <CelestialSprite
            key={obj.id}
            object={obj}
            position={position}
            isSelected={selectedId === obj.id}
            isHovered={hoveredId === obj.id}
            onClick={() => handleObjectClick(obj.id)}
            onHover={(h) => setHoveredId(prev => h ? obj.id : (prev === obj.id ? null : prev))}
          />
        ))}

        <CameraController target={flyTarget} onReset={() => { setSelectedId(null); setFlyTarget(null); }} />
      </Canvas>

      {/* Detail panel */}
      <AnimatePresence>
        {selectedObject && !compact && (
          <motion.div
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute top-0 right-0 h-full w-full sm:w-[380px] z-20"
          >
            <div className="h-full glass-card rounded-none sm:rounded-l-2xl border-l border-border/50 overflow-y-auto">
              <div className="relative w-full h-48 overflow-hidden">
                <SmartImage
                  src={selectedObject.imageUrl}
                  fallbackQuery={selectedObject.name}
                  alt={selectedObject.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />
                <button onClick={() => { setSelectedId(null); setFlyTarget(new THREE.Vector3(15,5,15)); }}
                  className="absolute top-3 right-3 w-8 h-8 rounded-full bg-background/60 backdrop-blur hover:bg-background/80 flex items-center justify-center">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div>
                  <div className="text-[10px] uppercase tracking-widest mb-1" style={{ color: colorForObject(selectedObject.name, selectedObject.type) }}>
                    {selectedObject.type}
                  </div>
                  <h3 className="text-xl font-display font-bold">{selectedObject.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Constellation: {selectedObject.constellation}</p>
                </div>

                <p className="text-sm text-foreground/85 leading-relaxed">{selectedObject.description}</p>

                <div className="grid grid-cols-2 gap-2">
                  <Info2 label="Distance" value={selectedObject.distance} />
                  <Info2 label="Magnitude" value={String(selectedObject.mag)} />
                  <Info2 label="RA (J2000)" value={raToHMS(selectedObject.ra)} />
                  <Info2 label="Dec (J2000)" value={decToDMS(selectedObject.dec)} />
                </div>

                <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                  <div className="text-[10px] text-primary uppercase tracking-wider mb-1">Decimal Degrees</div>
                  <div className="text-xs font-mono">RA {selectedObject.ra.toFixed(4)}° &nbsp; Dec {selectedObject.dec.toFixed(4)}°</div>
                  {coordinateSystem === 'galactic' && (() => {
                    const g = equatorialToGalactic(selectedObject.ra, selectedObject.dec);
                    return <div className="text-xs font-mono mt-1">l = {g.l.toFixed(3)}° &nbsp; b = {g.b.toFixed(3)}°</div>;
                  })()}
                </div>

                {selectedObject.discoveredBy && (
                  <Info2 label="Discovery" value={`${selectedObject.discoveredBy}${selectedObject.discoveryYear ? ` • ${selectedObject.discoveryYear}` : ''}`} />
                )}

                <div className="grid grid-cols-3 gap-2">
                  {selectedObject.sourceLink && (
                    <a href={selectedObject.sourceLink} target="_blank" rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1 py-2 rounded-lg bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary text-[11px]">
                      <ExternalLink className="w-3 h-3" /> Wiki
                    </a>
                  )}
                  <a href={`https://simbad.u-strasbg.fr/simbad/sim-basic?Ident=${encodeURIComponent(selectedObject.name)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1 py-2 rounded-lg bg-secondary/10 hover:bg-secondary/20 border border-secondary/30 text-secondary text-[11px]">
                    <ExternalLink className="w-3 h-3" /> SIMBAD
                  </a>
                  <a href={`https://images.nasa.gov/search-results?q=${encodeURIComponent(selectedObject.name)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1 py-2 rounded-lg bg-accent/10 hover:bg-accent/20 border border-accent/30 text-accent text-[11px]">
                    <ExternalLink className="w-3 h-3" /> NASA
                  </a>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Info2({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded-lg bg-muted/30 border border-border/30">
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</div>
      <div className="text-sm font-mono text-foreground mt-1 truncate">{value}</div>
    </div>
  );
}
