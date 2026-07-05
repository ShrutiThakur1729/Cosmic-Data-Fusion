import { useRef, Suspense } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { TextureLoader } from 'three';

// Real NASA/Three.js public planet textures (equirectangular maps)
const EARTH_MAP = 'https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg';
const EARTH_BUMP = 'https://threejs.org/examples/textures/planets/earth_normal_2048.jpg';
const EARTH_SPEC = 'https://threejs.org/examples/textures/planets/earth_specular_2048.jpg';
const CLOUDS_MAP = 'https://threejs.org/examples/textures/planets/earth_clouds_1024.png';

function Planet() {
  const meshRef = useRef<THREE.Mesh>(null);
  const cloudsRef = useRef<THREE.Mesh>(null);

  const [colorMap, normalMap, specMap, cloudsTex] = useLoader(TextureLoader, [
    EARTH_MAP,
    EARTH_BUMP,
    EARTH_SPEC,
    CLOUDS_MAP,
  ]);

  useFrame((_, delta) => {
    if (meshRef.current) meshRef.current.rotation.y += delta * 0.08;
    if (cloudsRef.current) cloudsRef.current.rotation.y += delta * 0.11;
  });

  return (
    <group>
      {/* Planet */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[2, 96, 96]} />
        <meshPhongMaterial
          map={colorMap}
          normalMap={normalMap}
          specularMap={specMap}
          shininess={12}
          specular={new THREE.Color('#60d5fa')}
        />
      </mesh>

      {/* Cloud layer */}
      <mesh ref={cloudsRef}>
        <sphereGeometry args={[2.03, 64, 64]} />
        <meshPhongMaterial
          map={cloudsTex}
          transparent
          opacity={0.35}
          depthWrite={false}
        />
      </mesh>

      {/* Atmospheric glow (inner) */}
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

      {/* Atmospheric glow (outer) */}
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
    if (ringRef.current) {
      ringRef.current.rotation.z = state.clock.elapsedTime * 0.05;
    }
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

export function HeroOrb() {
  return (
    <div className="w-full h-full">
      <Canvas camera={{ position: [0, 0, 7], fov: 50 }}>
        <ambientLight intensity={0.25} />
        <pointLight position={[10, 5, 5]} intensity={1.5} color="#ffffff" />
        <pointLight position={[-10, -5, -5]} intensity={0.4} color="#a855f7" />
        <Stars radius={80} depth={40} count={2000} factor={3} saturation={0} fade speed={0.5} />

        <Suspense fallback={<Fallback />}>
          <Planet />
        </Suspense>
        <OrbitRings />

        <OrbitControls
          enableZoom={false}
          enablePan={false}
          autoRotate
          autoRotateSpeed={0.4}
        />
      </Canvas>
    </div>
  );
}
