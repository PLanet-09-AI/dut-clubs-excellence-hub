import { Canvas, useFrame } from "@react-three/fiber";
import { useRef, Suspense, useMemo } from "react";
import * as THREE from "three";

function Particles({ count = 1200, color = "#f5c542", size = 0.04, spread = 30 }: { count?: number; color?: string; size?: number; spread?: number }) {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * spread;
      arr[i * 3 + 1] = (Math.random() - 0.5) * spread * 0.7;
      arr[i * 3 + 2] = (Math.random() - 0.5) * spread * 0.7;
    }
    return arr;
  }, [count, spread]);

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = state.clock.elapsedTime * 0.01;
      ref.current.rotation.x = state.clock.elapsedTime * 0.005;
    }
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={size} color={color} transparent opacity={0.75} sizeAttenuation depthWrite={false} />
    </points>
  );
}

function Rings() {
  const g = useRef<THREE.Group>(null);
  useFrame((s) => {
    if (g.current) {
      g.current.rotation.x = s.clock.elapsedTime * 0.02;
      g.current.rotation.y = s.clock.elapsedTime * 0.03;
    }
  });
  return (
    <group ref={g}>
      {[2.4, 3.1, 3.9, 4.7].map((r, i) => (
        <mesh key={i} rotation={[Math.PI / 2 + i * 0.4, i * 0.3, 0]}>
          <torusGeometry args={[r, 0.011, 16, 220]} />
          <meshBasicMaterial color={i % 2 === 0 ? "#f5c542" : "#3b5fd9"} transparent opacity={0.32} />
        </mesh>
      ))}
    </group>
  );
}

function Beam({ x = 0, color = "#f5c542" }: { x?: number; color?: string }) {
  const m = useRef<THREE.Mesh>(null);
  useFrame((s) => {
    if (m.current) m.current.rotation.z = Math.sin(s.clock.elapsedTime * 0.15 + x) * 0.1;
  });
  return (
    <mesh ref={m} position={[x, 0, -4]}>
      <planeGeometry args={[0.6, 18]} />
      <meshBasicMaterial color={color} transparent opacity={0.06} />
    </mesh>
  );
}

export default function BackgroundScene() {
  return (
    <Canvas camera={{ position: [0, 0, 6], fov: 60 }} dpr={[1, 1.5]} gl={{ antialias: true, alpha: true }}>
      <Suspense fallback={null}>
        <Particles count={1200} color="#f5c542" size={0.035} />
        <Particles count={400} color="#7aa6ff" size={0.05} spread={20} />
        <Rings />
        <Beam x={-5} />
        <Beam x={-2} color="#7aa6ff" />
        <Beam x={3} />
        <Beam x={6} color="#7aa6ff" />
      </Suspense>
    </Canvas>
  );
}
