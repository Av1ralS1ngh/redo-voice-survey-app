"use client";

import { Canvas } from "@react-three/fiber";
import { Sphere, MeshDistortMaterial, OrbitControls } from "@react-three/drei";
import { Suspense } from "react";

// Loading fallback component
function LoadingFallback() {
  return (
    <div className="w-full h-96 flex items-center justify-center bg-gradient-to-br from-purple-900 to-pink-900 rounded-2xl">
      <div className="text-white text-xl">Loading 3D Orb...</div>
    </div>
  );
}

// Error fallback component
function ErrorFallback() {
  return (
    <div className="w-full h-96 flex items-center justify-center bg-gradient-to-br from-red-900 to-pink-900 rounded-2xl">
      <div className="text-white text-center">
        <div className="text-xl mb-2">⚠️ 3D Orb Error</div>
        <div className="text-sm opacity-75">WebGL not supported or failed to load</div>
      </div>
    </div>
  );
}

export default function FuturisticOrb() {
  return (
    <div className="w-full h-96">
      <Suspense fallback={<LoadingFallback />}>
        <Canvas 
          camera={{ position: [0, 0, 4], fov: 45 }}
          dpr={[1, 2]}
          gl={{ antialias: true, alpha: true }}
          onCreated={(state) => {
            console.log("Three.js Canvas created successfully", state);
          }}
          onError={(error) => {
            console.error("Three.js Canvas error:", error);
          }}
          fallback={<ErrorFallback />}
        >
          {/* Lighting for glow */}
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} intensity={1.5} />

          {/* Orb */}
          <Sphere args={[1, 128, 128]}>
            <MeshDistortMaterial
              color="hotpink"
              distort={0.4} // animated wobble
              speed={2} // distortion speed
              roughness={0.2}
              metalness={0.8}
              emissive="white"
              emissiveIntensity={0.5}
              transparent
              opacity={0.9}
            />
          </Sphere>

          {/* User can drag orb (remove if you don't want) */}
          <OrbitControls enableZoom={false} />
        </Canvas>
      </Suspense>
    </div>
  );
}
