import { useMemo } from 'react';
import { useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { proxyTexture } from '@/lib/imageProxy';

// ESO "The Milky Way panorama" — equirectangular projection covering the full
// celestial sphere. Public domain / CC-BY ESO. Routed through the image proxy
// so it loads with permissive CORS into the WebGL texture.
const MILKY_WAY_PANORAMA =
  'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/ESO_-_Milky_Way.jpg/2560px-ESO_-_Milky_Way.jpg';

interface Props {
  radius?: number;
  opacity?: number;
}

export function MilkyWaySphere({ radius = 60, opacity = 0.55 }: Props) {
  const tex = useLoader(THREE.TextureLoader, proxyTexture(MILKY_WAY_PANORAMA));
  useMemo(() => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    tex.mapping = THREE.EquirectangularReflectionMapping;
  }, [tex]);

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
