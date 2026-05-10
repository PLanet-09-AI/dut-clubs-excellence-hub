import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Environment, Sparkles, MeshDistortMaterial, Stars } from "@react-three/drei";
import { useRef, Suspense } from "react";
import * as THREE from "three";

function Trophy() {
  const group = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (group.current) {
      group.current.rotation.y = state.clock.elapsedTime * 0.4;
    }
  });
  return (
    <group ref={group} position={[0, -0.2, 0]}>
      {/* Cup bowl */}
      <mesh position={[0, 0.9, 0]} castShadow>
        <sphereGeometry args={[0.7, 64, 64, 0, Math.PI * 2, 0, Math.PI / 1.6]} />
        <meshStandardMaterial color="#f5c542" metalness={1} roughness={0.15} emissive="#a87a10" emissiveIntensity={0.3} />
      </mesh>
      {/* Handles */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.78, 0.95, 0]} rotation={[0, 0, s * Math.PI / 2]}>
          <torusGeometry args={[0.22, 0.06, 16, 64, Math.PI]} />
          <meshStandardMaterial color="#f5c542" metalness={1} roughness={0.15} />
        </mesh>
      ))}
      {/* Stem */}
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.12, 0.18, 0.6, 32]} />
        <meshStandardMaterial color="#e6b730" metalness={1} roughness={0.2} />
      </mesh>
      {/* Base */}
      <mesh position={[0, -0.25, 0]}>
        <cylinderGeometry args={[0.55, 0.65, 0.18, 64]} />
        <meshStandardMaterial color="#1a2a5e" metalness={0.9} roughness={0.25} />
      </mesh>
      <mesh position={[0, -0.36, 0]}>
        <cylinderGeometry args={[0.7, 0.7, 0.06, 64]} />
        <meshStandardMaterial color="#f5c542" metalness={1} roughness={0.2} />
      </mesh>
    </group>
  );
}

function FloatingMedal({ position, delay = 0 }: { position: [number, number, number]; delay?: number }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = state.clock.elapsedTime * 0.6 + delay;
      ref.current.rotation.x = Math.sin(state.clock.elapsedTime + delay) * 0.3;
    }
  });
  return (
    <Float speed={2} rotationIntensity={0.6} floatIntensity={1.2}>
      <mesh ref={ref} position={position}>
        <cylinderGeometry args={[0.35, 0.35, 0.06, 48]} />
        <meshStandardMaterial color="#f5c542" metalness={1} roughness={0.15} emissive="#a87a10" emissiveIntensity={0.4} />
      </mesh>
    </Float>
  );
}

function Blob({ position, color }: { position: [number, number, number]; color: string }) {
  return (
    <Float speed={1.2} rotationIntensity={1} floatIntensity={2}>
      <mesh position={position}>
        <sphereGeometry args={[0.9, 64, 64]} />
        <MeshDistortMaterial color={color} distort={0.5} speed={2} roughness={0.2} metalness={0.6} />
      </mesh>
    </Float>
  );
}

export default function AwardScene() {
  return (
    <Canvas
      camera={{ position: [0, 0.4, 4.2], fov: 45 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
    >
      <Suspense fallback={null}>
        <ambientLight intensity={0.4} />
        <pointLight position={[5, 5, 5]} intensity={2} color="#f5c542" />
        <pointLight position={[-5, -2, 3]} intensity={1.5} color="#3b5fd9" />
        <spotLight position={[0, 6, 2]} intensity={2} angle={0.5} penumbra={1} color="#fff3c4" />

        <Stars radius={50} depth={30} count={1500} factor={3} fade speed={0.5} />
        <Sparkles count={80} scale={6} size={3} speed={0.4} color="#f5c542" />

        <Float speed={1.4} rotationIntensity={0.2} floatIntensity={0.8}>
          <Trophy />
        </Float>

        <FloatingMedal position={[-2.4, 1.1, -1]} delay={0} />
        <FloatingMedal position={[2.3, -0.8, -0.5]} delay={1.2} />
        <FloatingMedal position={[2.6, 1.4, -1.5]} delay={2.4} />

        <Blob position={[-3, -1.5, -3]} color="#1a2a5e" />
        <Blob position={[3.2, 1.8, -3.5]} color="#f5c542" />

        <Environment preset="city" />
      </Suspense>
    </Canvas>
  );
}
