import { useRef, Suspense, useState, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { TextureLoader } from 'three';
import { NASA_API_KEY } from '@/lib/nasa';

// Base textures
const EARTH_BLUE_MARBLE =
  'https://eoimages.gsfc.nasa.gov/images/imagerecords/57000/57752/land_shallow_topo_2048.jpg';
const EARTH_DAY_FALLBACK =
  'https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg';
const EARTH_NIGHT =
  'https://eoimages.gsfc.nasa.gov/images/imagerecords/55000/55167/earth_lights_lrg.jpg';
const EARTH_NORMAL =
  'https://threejs.org/examples/textures/planets/earth_normal_2048.jpg';
const EARTH_SPEC =
  'https://threejs.org/examples/textures/planets/earth_specular_2048.jpg';
const CLOUDS_MAP =
  'https://threejs.org/examples/textures/planets/earth_clouds_1024.png';

export type EarthMode = 'blue-marble' | 'epic-live' | 'night-lights';

interface PlanetProps {
  mode: EarthMode;
  epicUrl: string | null;
  showClouds: boolean;
}

function Planet({ mode, epicUrl, showClouds }: PlanetProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const cloudsRef = useRef<THREE.Mesh>(null);

  const baseUrl =
    mode === 'night-lights'
      ? EARTH_NIGHT
      : mode === 'epic-live' && epicUrl
      ? epicUrl
      : mode === 'blue-marble'
      ? EARTH_BLUE_MARBLE
      : EARTH_DAY_FALLBACK;

  const [colorMap, normalMap, specMap, cloudsTex] = useLoader(TextureLoader, [
    baseUrl,
    EARTH_NORMAL,
    EARTH_SPEC,
    CLOUDS_MAP,
  ]);

  // Ensure color textures render with correct color space
  useMemo(() => {
    colorMap.colorSpace = THREE.SRGBColorSpace;
    cloudsTex.colorSpace = THREE.SRGBColorSpace;
    colorMap.anisotropy = 8;
  }, [colorMap, cloudsTex]);

  useFrame((_, delta) => {
    if (meshRef.current) meshRef.current.rotation.y += delta * 0.08;
    if (cloudsRef.current) cloudsRef.current.rotation.y += delta * 0.11;
  });

  const emissive = mode === 'night-lights' ? new THREE.Color('#ffd27a') : new THREE.Color('#000');

  return (
    <group>
      <mesh ref={meshRef}>
        <sphereGeometry args={[2, 96, 96]} />
        <meshPhongMaterial
          map={colorMap}
          normalMap={normalMap}
          specularMap={mode === 'night-lights' ? undefined : specMap}
          emissive={emissive}
          emissiveMap={mode === 'night-lights' ? colorMap : undefined}
          emissiveIntensity={mode === 'night-lights' ? 1 : 0}
          shininess={12}
          specular={new THREE.Color('#60d5fa')}
        />
      </mesh>

      {showClouds && (
        <mesh ref={cloudsRef}>
          <sphereGeometry args={[2.03, 64, 64]} />
          <meshPhongMaterial
            map={cloudsTex}
            transparent
            opacity={0.35}
            depthWrite={false}
          />
        </mesh>
      )}

      <mesh scale={2.12}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial
          color="#60d5fa"
          transparent
          opacity={0.08}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      <mesh scale={2.35}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial
          color="#3b82f6"
          transparent
          opacity={0.04}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}

function OrbitRings() {
  const ringRef = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (ringRef.current) ringRef.current.rotation.z = state.clock.elapsedTime * 0.05;
  });
  return (
    <group ref={ringRef}>
      {[0, 1, 2].map((i) => (
        <mesh key={i} rotation={[Math.PI / 2 + i * 0.35, i * 0.2, 0]}>
          <torusGeometry args={[3 + i * 0.6, 0.015, 16, 128]} />
          <meshBasicMaterial
            color={i === 0 ? '#60d5fa' : i === 1 ? '#a855f7' : '#34d399'}
            transparent
            opacity={0.45 - i * 0.1}
          />
        </mesh>
      ))}
    </group>
  );
}

function Fallback() {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (meshRef.current) meshRef.current.rotation.y += delta * 0.2;
  });
  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[2, 32, 32]} />
      <meshStandardMaterial color="#1e3a8a" wireframe />
    </mesh>
  );
}

interface EPICImage {
  image: string;
  date: string; // "YYYY-MM-DD HH:MM:SS"
  caption?: string;
}

async function fetchLatestEPIC(): Promise<{ url: string; date: string } | null> {
  try {
    const res = await fetch(
      `https://api.nasa.gov/EPIC/api/natural/images?api_key=${NASA_API_KEY}`
    );
    if (!res.ok) return null;
    const list: EPICImage[] = await res.json();
    if (!list?.length) return null;
    const latest = list[list.length - 1];
    const [datePart] = latest.date.split(' ');
    const [y, m, d] = datePart.split('-');
    // EPIC natural PNG archive
    const url = `https://epic.gsfc.nasa.gov/archive/natural/${y}/${m}/${d}/png/${latest.image}.png`;
    return { url, date: latest.date };
  } catch {
    return null;
  }
}

const MODES: { id: EarthMode; label: string }[] = [
  { id: 'blue-marble', label: 'Blue Marble' },
  { id: 'epic-live', label: 'Live EPIC' },
  { id: 'night-lights', label: 'Night Lights' },
];

export function HeroOrb() {
  const [mode, setMode] = useState<EarthMode>('blue-marble');
  const [showClouds, setShowClouds] = useState(true);
  const [epic, setEpic] = useState<{ url: string; date: string } | null>(null);
  const [epicLoading, setEpicLoading] = useState(false);

  useEffect(() => {
    if (mode === 'epic-live' && !epic && !epicLoading) {
      setEpicLoading(true);
      fetchLatestEPIC()
        .then((r) => setEpic(r))
        .finally(() => setEpicLoading(false));
    }
  }, [mode, epic, epicLoading]);

  return (
    <div className="w-full h-full relative">
      <Canvas camera={{ position: [0, 0, 7], fov: 50 }}>
        <ambientLight intensity={mode === 'night-lights' ? 0.05 : 0.25} />
        <pointLight position={[10, 5, 5]} intensity={mode === 'night-lights' ? 0.3 : 1.5} color="#ffffff" />
        <pointLight position={[-10, -5, -5]} intensity={0.4} color="#a855f7" />
        <Stars radius={80} depth={40} count={2000} factor={3} saturation={0} fade speed={0.5} />

        <Suspense fallback={<Fallback />}>
          <Planet mode={mode} epicUrl={epic?.url ?? null} showClouds={showClouds} />
        </Suspense>
        <OrbitRings />

        <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.4} />
      </Canvas>

      {/* Controls */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-10 pointer-events-auto">
        <div className="glass-card flex gap-1 p-1 rounded-full">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                mode === m.id
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {m.label}
            </button>
          ))}
          <button
            onClick={() => setShowClouds((v) => !v)}
            className={`px-3 py-1 text-xs rounded-full transition-colors ${
              showClouds
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            title="Toggle cloud layer"
          >
            ☁ Clouds
          </button>
        </div>
        {mode === 'epic-live' && (
          <div className="glass-card px-3 py-1 rounded-full text-[10px] text-muted-foreground">
            {epicLoading
              ? 'Fetching latest DSCOVR/EPIC image…'
              : epic
              ? `NASA EPIC · ${epic.date} UTC`
              : 'EPIC unavailable — using fallback'}
          </div>
        )}
      </div>
    </div>
  );
}
