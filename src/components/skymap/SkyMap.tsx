import { useRef, useMemo, useState, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars, Html } from '@react-three/drei';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, ExternalLink, Info } from 'lucide-react';
import { CELESTIAL_OBJECTS, CelestialObject } from '@/data/celestialObjects';

// Equatorial (RA/Dec in degrees) -> galactic (l, b in degrees). J2000.
function equatorialToGalactic(raDeg: number, decDeg: number): { l: number; b: number } {
  const ra = (raDeg * Math.PI) / 180;
  const dec = (decDeg * Math.PI) / 180;
  // Galactic north pole (J2000): RA = 192.859508°, Dec = 27.128336°
  // Galactic longitude of ascending node of galactic equator: 122.932°
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

// Convert lon/lat degrees to 3D position on the celestial sphere.
function sphericalToPosition(lonDeg: number, latDeg: number, radius = 10): [number, number, number] {
  const lon = (lonDeg * Math.PI) / 180;
  const lat = (latDeg * Math.PI) / 180;
  return [
    radius * Math.cos(lat) * Math.cos(lon),
    radius * Math.sin(lat),
    radius * Math.cos(lat) * Math.sin(lon),
  ];
}

function colorForType(type: CelestialObject['type']): string {
  switch (type) {
    case 'galaxy':  return '#a855f7';
    case 'nebula':  return '#f472b6';
    case 'cluster': return '#fbbf24';
    case 'planet':  return '#34d399';
    default:        return '#60d5fa';
  }
}

function CelestialGrid() {
  const raLines = useMemo(() => {
    const lines: THREE.Vector3[][] = [];
    for (let ra = 0; ra < 360; ra += 30) {
      const points: THREE.Vector3[] = [];
      for (let dec = -90; dec <= 90; dec += 5) {
        const [x, y, z] = sphericalToPosition(ra, dec, 9.8);
        points.push(new THREE.Vector3(x, y, z));
      }
      lines.push(points);
    }
    return lines;
  }, []);

  const decLines = useMemo(() => {
    const lines: THREE.Vector3[][] = [];
    for (let dec = -60; dec <= 60; dec += 30) {
      const points: THREE.Vector3[] = [];
      for (let ra = 0; ra <= 360; ra += 5) {
        const [x, y, z] = sphericalToPosition(ra, dec, 9.8);
        points.push(new THREE.Vector3(x, y, z));
      }
      lines.push(points);
    }
    return lines;
  }, []);

  return (
    <group>
      {raLines.map((points, i) => (
        <line key={`ra-${i}`}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={points.length}
              array={new Float32Array(points.flatMap(p => [p.x, p.y, p.z]))}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#60d5fa" opacity={0.12} transparent />
        </line>
      ))}
      {decLines.map((points, i) => (
        <line key={`dec-${i}`}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={points.length}
              array={new Float32Array(points.flatMap(p => [p.x, p.y, p.z]))}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#a855f7" opacity={0.12} transparent />
        </line>
      ))}
    </group>
  );
}

interface CelestialPointProps {
  object: CelestialObject;
  position: [number, number, number];
  isSelected: boolean;
  isHovered: boolean;
  onClick: () => void;
  onPointerOver: () => void;
  onPointerOut: () => void;
}

function CelestialPoint({ object, position, isSelected, isHovered, onClick, onPointerOver, onPointerOut }: CelestialPointProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const size = Math.max(0.08, 0.32 - object.mag * 0.05);
  const color = colorForType(object.type);

  useFrame((state) => {
    if (meshRef.current) {
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 2) * (isSelected ? 0.35 : 0.08);
      meshRef.current.scale.setScalar(pulse);
    }
  });

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        onPointerOver={(e) => { e.stopPropagation(); onPointerOver(); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { onPointerOut(); document.body.style.cursor = 'auto'; }}
      >
        <sphereGeometry args={[size, 16, 16]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <mesh>
        <sphereGeometry args={[size * 2.2, 16, 16]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={isSelected ? 0.5 : isHovered ? 0.35 : 0.18}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      {(isSelected || isHovered) && (
        <Html distanceFactor={10} position={[0, size + 0.35, 0]} center>
          <div className="glass-card px-2.5 py-1 pointer-events-none whitespace-nowrap">
            <div className="text-xs font-display font-semibold" style={{ color }}>
              {object.name}
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}

function CameraController() {
  const { camera } = useThree();
  useFrame(() => {
    const distance = camera.position.length();
    if (distance < 5) camera.position.normalize().multiplyScalar(5);
    if (distance > 30) camera.position.normalize().multiplyScalar(30);
  });
  return <OrbitControls enableDamping dampingFactor={0.05} minDistance={5} maxDistance={30} />;
}

interface SkyMapProps {
  customObjects?: Array<Partial<CelestialObject> & { name: string; ra: number; dec: number }>;
}

export function SkyMap({ customObjects = [] }: SkyMapProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [coordinateSystem, setCoordinateSystem] = useState<'equatorial' | 'galactic'>('equatorial');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  const allObjects = useMemo<CelestialObject[]>(() => {
    const customFormatted: CelestialObject[] = customObjects.map((obj, i) => ({
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
    return [...CELESTIAL_OBJECTS, ...customFormatted];
  }, [customObjects]);

  const filteredObjects = useMemo(() => {
    return allObjects.filter((obj) => {
      if (filterType !== 'all' && obj.type !== filterType) return false;
      if (searchQuery && !obj.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !obj.constellation.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [allObjects, searchQuery, filterType]);

  const positioned = useMemo(() => {
    return filteredObjects.map((obj) => {
      const coords = coordinateSystem === 'galactic'
        ? equatorialToGalactic(obj.ra, obj.dec)
        : { l: obj.ra, b: obj.dec };
      return { obj, position: sphericalToPosition(coords.l, coords.b) as [number, number, number] };
    });
  }, [filteredObjects, coordinateSystem]);

  const selectedObject = allObjects.find(o => o.id === selectedId) ?? null;

  const handleObjectClick = useCallback((id: string) => {
    setSelectedId((prev) => (prev === id ? null : id));
  }, []);

  const counts = useMemo(() => {
    const c = { star: 0, galaxy: 0, nebula: 0, cluster: 0, planet: 0 };
    allObjects.forEach(o => { c[o.type] = (c[o.type] ?? 0) + 1; });
    return c;
  }, [allObjects]);

  return (
    <div className="relative w-full h-full min-h-[500px] rounded-xl overflow-hidden glass-card">
      {/* Top-left controls */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 max-w-[240px]">
        <div className="flex gap-2">
          <button
            onClick={() => setCoordinateSystem('equatorial')}
            className={`px-3 py-1.5 text-xs rounded-lg transition-all ${
              coordinateSystem === 'equatorial'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted/60 text-muted-foreground hover:bg-muted backdrop-blur'
            }`}
          >
            Equatorial
          </button>
          <button
            onClick={() => setCoordinateSystem('galactic')}
            className={`px-3 py-1.5 text-xs rounded-lg transition-all ${
              coordinateSystem === 'galactic'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted/60 text-muted-foreground hover:bg-muted backdrop-blur'
            }`}
          >
            Galactic
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-muted/60 backdrop-blur border border-border/40 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60"
          />
        </div>

        <div className="flex flex-wrap gap-1">
          {(['all', 'star', 'galaxy', 'nebula', 'cluster'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-2 py-0.5 text-[10px] rounded uppercase tracking-wider transition-all ${
                filterType === t
                  ? 'bg-primary/30 text-primary border border-primary/50'
                  : 'bg-muted/40 text-muted-foreground hover:bg-muted/60 border border-transparent'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="absolute top-4 right-4 z-10 glass-card px-3 py-2">
        <div className="text-[10px] font-medium text-muted-foreground mb-2 uppercase tracking-wider">
          Legend
        </div>
        <div className="space-y-1.5">
          {[
            { type: 'Stars', color: '#60d5fa', n: counts.star },
            { type: 'Galaxies', color: '#a855f7', n: counts.galaxy },
            { type: 'Nebulae', color: '#f472b6', n: counts.nebula },
            { type: 'Clusters', color: '#fbbf24', n: counts.cluster },
          ].map(({ type, color, n }) => (
            <div key={type} className="flex items-center gap-2 text-xs">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }}
              />
              <span className="text-muted-foreground">{type}</span>
              <span className="text-foreground/70 ml-auto">{n}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer hint */}
      <div className="absolute bottom-4 left-4 z-10 text-xs text-muted-foreground flex items-center gap-2">
        <Info className="w-3 h-3" />
        {positioned.length} objects • Click for details • Drag to rotate • Scroll to zoom
      </div>

      {/* 3D Canvas */}
      <Canvas camera={{ position: [15, 5, 15], fov: 60 }} onPointerMissed={() => setSelectedId(null)}>
        <ambientLight intensity={0.15} />
        <Stars radius={100} depth={50} count={4000} factor={4} saturation={0} fade speed={0.5} />

        <mesh>
          <sphereGeometry args={[10, 64, 64]} />
          <meshBasicMaterial color="#0a0a1a" side={THREE.BackSide} transparent opacity={0.35} />
        </mesh>

        <CelestialGrid />

        {positioned.map(({ obj, position }) => (
          <CelestialPoint
            key={obj.id}
            object={obj}
            position={position}
            isSelected={selectedId === obj.id}
            isHovered={hoveredId === obj.id}
            onClick={() => handleObjectClick(obj.id)}
            onPointerOver={() => setHoveredId(obj.id)}
            onPointerOut={() => setHoveredId((prev) => (prev === obj.id ? null : prev))}
          />
        ))}

        <group>
          <mesh position={[0, 10.5, 0]}>
            <coneGeometry args={[0.15, 0.4, 8]} />
            <meshBasicMaterial color="#60d5fa" />
          </mesh>
          <mesh position={[0, -10.5, 0]} rotation={[Math.PI, 0, 0]}>
            <coneGeometry args={[0.15, 0.4, 8]} />
            <meshBasicMaterial color="#f472b6" />
          </mesh>
        </group>

        <CameraController />
      </Canvas>

      {/* Object detail panel */}
      <AnimatePresence>
        {selectedObject && (
          <motion.div
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute top-0 right-0 h-full w-full sm:w-[380px] z-20 pointer-events-auto"
          >
            <div className="h-full glass-card rounded-none sm:rounded-l-2xl border-l border-border/50 overflow-y-auto">
              {/* Image header */}
              {selectedObject.imageUrl && (
                <div className="relative w-full h-48 overflow-hidden">
                  <img
                    src={selectedObject.imageUrl}
                    alt={selectedObject.name}
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />
                  <button
                    onClick={() => setSelectedId(null)}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-background/60 backdrop-blur hover:bg-background/80 flex items-center justify-center"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div className="p-5 space-y-4">
                <div>
                  <div
                    className="text-[10px] uppercase tracking-widest mb-1"
                    style={{ color: colorForType(selectedObject.type) }}
                  >
                    {selectedObject.type}
                  </div>
                  <h3 className="text-xl font-display font-bold text-foreground">
                    {selectedObject.name}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Constellation: {selectedObject.constellation}
                  </p>
                </div>

                <p className="text-sm text-foreground/85 leading-relaxed">
                  {selectedObject.description}
                </p>

                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 rounded-lg bg-muted/30 border border-border/30">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Distance</div>
                    <div className="text-sm font-mono text-foreground mt-1">{selectedObject.distance}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/30 border border-border/30">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Magnitude</div>
                    <div className="text-sm font-mono text-foreground mt-1">{selectedObject.mag}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/30 border border-border/30">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">RA (J2000)</div>
                    <div className="text-sm font-mono text-foreground mt-1">{selectedObject.ra.toFixed(3)}°</div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/30 border border-border/30">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Dec (J2000)</div>
                    <div className="text-sm font-mono text-foreground mt-1">{selectedObject.dec.toFixed(3)}°</div>
                  </div>
                </div>

                {coordinateSystem === 'galactic' && (
                  <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                    <div className="text-[10px] text-primary uppercase tracking-wider mb-1">Galactic Coordinates</div>
                    {(() => {
                      const g = equatorialToGalactic(selectedObject.ra, selectedObject.dec);
                      return (
                        <div className="text-sm font-mono text-foreground">
                          l = {g.l.toFixed(3)}° &nbsp; b = {g.b.toFixed(3)}°
                        </div>
                      );
                    })()}
                  </div>
                )}

                {selectedObject.discoveredBy && (
                  <div className="p-3 rounded-lg bg-muted/20 border border-border/30">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Discovery</div>
                    <div className="text-sm text-foreground mt-1">
                      {selectedObject.discoveredBy}
                      {selectedObject.discoveryYear && ` • ${selectedObject.discoveryYear}`}
                    </div>
                  </div>
                )}

                {selectedObject.sourceLink && (
                  <a
                    href={selectedObject.sourceLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary text-sm transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Learn more
                  </a>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
