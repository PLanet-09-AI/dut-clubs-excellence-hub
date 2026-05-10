import { Canvas, useFrame } from "@react-three/fiber";
import { useRef, Suspense, useMemo } from "react";
import * as THREE from "three";

function Particles() {
  const ref = useRef<THREE.Points>(null);
  const count = 800;
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 30;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 20;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 20;
    }
    return arr;
  }, []);

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = state.clock.elapsedTime * 0.04;
      ref.current.rotation.x = state.clock.elapsedTime * 0.02;
    }
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.04} color="#f5c542" transparent opacity={0.7} sizeAttenuation depthWrite={false} />
    </points>
  );
}

function Rings() {
  const g = useRef<THREE.Group>(null);
  useFrame((s) => {
    if (g.current) {
      g.current.rotation.x = s.clock.elapsedTime * 0.1;
      g.current.rotation.y = s.clock.elapsedTime * 0.15;
    }
  });
  return (
    <group ref={g}>
      {[2.5, 3.2, 4].map((r, i) => (
        <mesh key={i} rotation={[Math.PI / 2 + i * 0.4, i * 0.3, 0]}>
          <torusGeometry args={[r, 0.012, 16, 200]} />
          <meshBasicMaterial color={i % 2 === 0 ? "#f5c542" : "#3b5fd9"} transparent opacity={0.35} />
        </mesh>
      ))}
    </group>
  );
}

export default function BackgroundScene() {
  return (
    <Canvas camera={{ position: [0, 0, 6], fov: 60 }} dpr={[1, 1.5]} gl={{ antialias: true, alpha: true }}>
      <Suspense fallback={null}>
        <Particles />
        <Rings />
      </Suspense>
    </Canvas>
  );
}
