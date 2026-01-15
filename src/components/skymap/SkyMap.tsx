import { useRef, useMemo, useState, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { motion } from 'framer-motion';

// Sample celestial objects data
const celestialObjects = [
  { name: 'Sirius', ra: 101.29, dec: -16.72, mag: -1.46, type: 'star', constellation: 'Canis Major' },
  { name: 'Canopus', ra: 95.99, dec: -52.70, mag: -0.74, type: 'star', constellation: 'Carina' },
  { name: 'Alpha Centauri', ra: 219.90, dec: -60.83, mag: -0.27, type: 'star', constellation: 'Centaurus' },
  { name: 'Arcturus', ra: 213.92, dec: 19.18, mag: -0.05, type: 'star', constellation: 'Boötes' },
  { name: 'Vega', ra: 279.23, dec: 38.78, mag: 0.03, type: 'star', constellation: 'Lyra' },
  { name: 'Capella', ra: 79.17, dec: 46.00, mag: 0.08, type: 'star', constellation: 'Auriga' },
  { name: 'Rigel', ra: 78.63, dec: -8.20, mag: 0.13, type: 'star', constellation: 'Orion' },
  { name: 'Procyon', ra: 114.83, dec: 5.22, mag: 0.34, type: 'star', constellation: 'Canis Minor' },
  { name: 'Betelgeuse', ra: 88.79, dec: 7.41, mag: 0.50, type: 'star', constellation: 'Orion' },
  { name: 'Andromeda Galaxy', ra: 10.68, dec: 41.27, mag: 3.44, type: 'galaxy', constellation: 'Andromeda' },
  { name: 'Orion Nebula', ra: 83.82, dec: -5.39, mag: 4.0, type: 'nebula', constellation: 'Orion' },
  { name: 'Pleiades', ra: 56.87, dec: 24.12, mag: 1.6, type: 'cluster', constellation: 'Taurus' },
  { name: 'Polaris', ra: 37.95, dec: 89.26, mag: 1.98, type: 'star', constellation: 'Ursa Minor' },
  { name: 'Crab Nebula', ra: 83.63, dec: 22.01, mag: 8.4, type: 'nebula', constellation: 'Taurus' },
  { name: 'Whirlpool Galaxy', ra: 202.47, dec: 47.20, mag: 8.4, type: 'galaxy', constellation: 'Canes Venatici' },
];

// Convert RA/Dec to 3D position on sphere
function raDecToPosition(ra: number, dec: number, radius: number = 10): [number, number, number] {
  const raRad = (ra * Math.PI) / 180;
  const decRad = (dec * Math.PI) / 180;
  
  const x = radius * Math.cos(decRad) * Math.cos(raRad);
  const y = radius * Math.sin(decRad);
  const z = radius * Math.cos(decRad) * Math.sin(raRad);
  
  return [x, y, z];
}

// Grid lines for celestial sphere
function CelestialGrid() {
  const gridRef = useRef<THREE.Group>(null);

  // Create RA lines (longitude)
  const raLines = useMemo(() => {
    const lines: THREE.Vector3[][] = [];
    for (let ra = 0; ra < 360; ra += 30) {
      const points: THREE.Vector3[] = [];
      for (let dec = -90; dec <= 90; dec += 5) {
        const [x, y, z] = raDecToPosition(ra, dec, 9.8);
        points.push(new THREE.Vector3(x, y, z));
      }
      lines.push(points);
    }
    return lines;
  }, []);

  // Create Dec lines (latitude)
  const decLines = useMemo(() => {
    const lines: THREE.Vector3[][] = [];
    for (let dec = -60; dec <= 60; dec += 30) {
      const points: THREE.Vector3[] = [];
      for (let ra = 0; ra <= 360; ra += 5) {
        const [x, y, z] = raDecToPosition(ra, dec, 9.8);
        points.push(new THREE.Vector3(x, y, z));
      }
      lines.push(points);
    }
    return lines;
  }, []);

  return (
    <group ref={gridRef}>
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
          <lineBasicMaterial color="#60d5fa" opacity={0.15} transparent />
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
          <lineBasicMaterial color="#a855f7" opacity={0.15} transparent />
        </line>
      ))}
    </group>
  );
}

// Individual celestial object
interface CelestialPointProps {
  object: typeof celestialObjects[0];
  isSelected: boolean;
  onClick: () => void;
}

function CelestialPoint({ object, isSelected, onClick }: CelestialPointProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const position = raDecToPosition(object.ra, object.dec);
  
  // Size based on magnitude (brighter = bigger)
  const size = Math.max(0.08, 0.3 - object.mag * 0.05);
  
  // Color based on type
  const color = useMemo(() => {
    switch (object.type) {
      case 'galaxy': return '#a855f7';
      case 'nebula': return '#f472b6';
      case 'cluster': return '#fbbf24';
      default: return '#60d5fa';
    }
  }, [object.type]);

  useFrame((state) => {
    if (meshRef.current) {
      const scale = 1 + Math.sin(state.clock.elapsedTime * 2) * (isSelected ? 0.3 : 0.1);
      meshRef.current.scale.setScalar(scale);
    }
  });

  return (
    <group position={position}>
      <mesh ref={meshRef} onClick={onClick}>
        <sphereGeometry args={[size, 16, 16]} />
        <meshBasicMaterial color={color} />
      </mesh>
      {/* Glow effect */}
      <mesh>
        <sphereGeometry args={[size * 2, 16, 16]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={isSelected ? 0.4 : 0.2}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      {/* Label on hover */}
      {isSelected && (
        <Html distanceFactor={10} position={[0, size + 0.3, 0]}>
          <div className="glass-card px-3 py-2 min-w-[150px] animate-fade-in">
            <div className="font-display font-semibold text-sm" style={{ color }}>
              {object.name}
            </div>
            <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
              <div>Type: {object.type}</div>
              <div>RA: {object.ra.toFixed(2)}° | Dec: {object.dec.toFixed(2)}°</div>
              <div>Magnitude: {object.mag}</div>
              <div>Constellation: {object.constellation}</div>
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}

// Camera controls with zoom limits
function CameraController() {
  const { camera } = useThree();
  
  useFrame(() => {
    // Ensure camera stays within bounds
    const distance = camera.position.length();
    if (distance < 5) {
      camera.position.normalize().multiplyScalar(5);
    }
    if (distance > 30) {
      camera.position.normalize().multiplyScalar(30);
    }
  });

  return <OrbitControls enableDamping dampingFactor={0.05} minDistance={5} maxDistance={30} />;
}

interface SkyMapProps {
  customObjects?: Array<{
    name: string;
    ra: number;
    dec: number;
    mag?: number;
    type?: string;
  }>;
}

export function SkyMap({ customObjects = [] }: SkyMapProps) {
  const [selectedObject, setSelectedObject] = useState<string | null>(null);
  const [coordinateSystem, setCoordinateSystem] = useState<'equatorial' | 'galactic'>('equatorial');

  const allObjects = useMemo(() => {
    return [
      ...celestialObjects,
      ...customObjects.map(obj => ({
        ...obj,
        mag: obj.mag ?? 5,
        type: obj.type ?? 'custom',
        constellation: 'User Data',
      })),
    ];
  }, [customObjects]);

  const handleObjectClick = useCallback((name: string) => {
    setSelectedObject(prev => prev === name ? null : name);
  }, []);

  return (
    <div className="relative w-full h-full min-h-[500px] rounded-xl overflow-hidden glass-card">
      {/* Controls */}
      <div className="absolute top-4 left-4 z-10 flex gap-2">
        <button
          onClick={() => setCoordinateSystem('equatorial')}
          className={`px-3 py-1.5 text-xs rounded-lg transition-all ${
            coordinateSystem === 'equatorial'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted/50 text-muted-foreground hover:bg-muted'
          }`}
        >
          Equatorial
        </button>
        <button
          onClick={() => setCoordinateSystem('galactic')}
          className={`px-3 py-1.5 text-xs rounded-lg transition-all ${
            coordinateSystem === 'galactic'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted/50 text-muted-foreground hover:bg-muted'
          }`}
        >
          Galactic
        </button>
      </div>

      {/* Legend */}
      <div className="absolute top-4 right-4 z-10 glass-card px-3 py-2">
        <div className="text-xs font-medium text-muted-foreground mb-2">Object Types</div>
        <div className="space-y-1.5">
          {[
            { type: 'Stars', color: '#60d5fa' },
            { type: 'Galaxies', color: '#a855f7' },
            { type: 'Nebulae', color: '#f472b6' },
            { type: 'Clusters', color: '#fbbf24' },
          ].map(({ type, color }) => (
            <div key={type} className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }}
              />
              <span className="text-xs text-muted-foreground">{type}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Object count */}
      <div className="absolute bottom-4 left-4 z-10 text-xs text-muted-foreground">
        {allObjects.length} objects • Click to select • Drag to rotate • Scroll to zoom
      </div>

      {/* 3D Canvas */}
      <Canvas camera={{ position: [15, 5, 15], fov: 60 }}>
        <ambientLight intensity={0.1} />
        <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />
        
        {/* Celestial sphere */}
        <mesh>
          <sphereGeometry args={[10, 64, 64]} />
          <meshBasicMaterial color="#0a0a1a" side={THREE.BackSide} transparent opacity={0.3} />
        </mesh>

        {/* Grid */}
        <CelestialGrid />

        {/* Celestial objects */}
        {allObjects.map((obj) => (
          <CelestialPoint
            key={obj.name}
            object={obj}
            isSelected={selectedObject === obj.name}
            onClick={() => handleObjectClick(obj.name)}
          />
        ))}

        {/* Axis helpers */}
        <group>
          {/* North celestial pole */}
          <mesh position={[0, 10.5, 0]}>
            <coneGeometry args={[0.2, 0.5, 8]} />
            <meshBasicMaterial color="#60d5fa" />
          </mesh>
          {/* South celestial pole */}
          <mesh position={[0, -10.5, 0]} rotation={[Math.PI, 0, 0]}>
            <coneGeometry args={[0.2, 0.5, 8]} />
            <meshBasicMaterial color="#f472b6" />
          </mesh>
        </group>

        <CameraController />
      </Canvas>
    </div>
  );
}
