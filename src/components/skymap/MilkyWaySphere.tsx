import { useEffect, useState } from 'react';
import * as THREE from 'three';
import { proxyTexture } from '@/lib/imageProxy';

// ESO "The Milky Way panorama" — equirectangular, public domain / CC-BY ESO.
const SOURCES = [
  'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/ESO_-_Milky_Way.jpg/2048px-ESO_-_Milky_Way.jpg',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/ESO_-_Milky_Way.jpg/2560px-ESO_-_Milky_Way.jpg',
];

function loadTexture(url: string): Promise<THREE.Texture> {
  return new Promise((resolve, reject) => {
    new THREE.TextureLoader().load(url, resolve, undefined, () => reject(new Error(url)));
  });
}

async function loadWithFallback(): Promise<THREE.Texture | null> {
  for (const src of SOURCES) {
    for (const url of [proxyTexture(src), src]) {
      try {
        return await loadTexture(url);
      } catch {
        /* try next */
      }
    }
  }
  return null;
}

interface Props {
  radius?: number;
  opacity?: number;
}

export function MilkyWaySphere({ radius = 60, opacity = 0.75 }: Props) {
  const [tex, setTex] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadWithFallback().then((t) => {
      if (cancelled || !t) return;
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
      t.mapping = THREE.EquirectangularReflectionMapping;
      setTex(t);
    });
    return () => { cancelled = true; };
  }, []);

  if (!tex) return null;

  return (
    <mesh rotation={[0, Math.PI, 0]}>
      <sphereGeometry args={[radius, 96, 64]} />
      <meshBasicMaterial
        map={tex}
        side={THREE.BackSide}
        transparent
        opacity={opacity}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}
