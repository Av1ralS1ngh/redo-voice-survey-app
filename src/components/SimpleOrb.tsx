"use client";

import { useEffect, useState } from "react";

interface SimpleOrbProps {
  state?: "idle" | "listening" | "speaking" | "connecting";
  className?: string;
}

export default function SimpleOrb({ state = "idle", className = "w-80 h-80" }: SimpleOrbProps) {
  const [pulsePhase, setPulsePhase] = useState(0);

  // Animate pulse effect
  useEffect(() => {
    const interval = setInterval(() => {
      setPulsePhase(prev => (prev + 0.1) % (Math.PI * 2));
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Get orb properties based on state
  const getOrbProperties = () => {
    switch (state) {
      case "idle":
        return {
          primaryColor: "from-indigo-400 to-purple-500",
          glowColor: "shadow-indigo-500/50",
          pulseSpeed: 1,
          size: 1,
        };
      case "listening":
        return {
          primaryColor: "from-emerald-400 to-green-500", 
          glowColor: "shadow-emerald-500/60",
          pulseSpeed: 2,
          size: 1.1,
        };
      case "speaking":
        return {
          primaryColor: "from-amber-400 to-orange-500",
          glowColor: "shadow-amber-500/70", 
          pulseSpeed: 3,
          size: 1.2,
        };
      case "connecting":
        return {
          primaryColor: "from-violet-400 to-purple-500",
          glowColor: "shadow-violet-500/60",
          pulseSpeed: 1.5,
          size: 1.05,
        };
      default:
        return {
          primaryColor: "from-gray-400 to-gray-500",
          glowColor: "shadow-gray-500/40",
          pulseSpeed: 0.5,
          size: 1,
        };
    }
  };

  const props = getOrbProperties();
  const pulseIntensity = Math.sin(pulsePhase * props.pulseSpeed) * 0.3 + 0.7;
  const scale = props.size + (Math.sin(pulsePhase * props.pulseSpeed) * 0.05);

  return (
    <div className={`${className} flex items-center justify-center`}>
      <div className="relative">
        {/* Main orb */}
        <div 
          className={`w-64 h-64 rounded-full bg-gradient-to-br ${props.primaryColor} 
                     transition-all duration-300 ${props.glowColor} shadow-2xl
                     animate-pulse border border-white/20`}
          style={{ 
            transform: `scale(${scale})`,
            opacity: pulseIntensity,
            boxShadow: `0 0 ${60 + pulseIntensity * 40}px ${props.glowColor.replace('shadow-', '').replace('/50', '').replace('/60', '').replace('/70', '').replace('/40', '')}`
          }}
        />
        
        {/* Inner glow */}
        <div 
          className={`absolute inset-4 rounded-full bg-gradient-to-br from-white/30 to-transparent`}
          style={{ 
            transform: `scale(${1 + pulseIntensity * 0.1})`,
            opacity: pulseIntensity * 0.6
          }}
        />
        
        {/* Center highlight */}
        <div 
          className="absolute top-8 left-8 w-16 h-16 rounded-full bg-white/40 blur-xl"
          style={{ 
            opacity: pulseIntensity * 0.8
          }}
        />

        {/* Rotating rings */}
        <div 
          className="absolute inset-0 rounded-full border-2 border-white/20 animate-spin"
          style={{ 
            animationDuration: `${4 / props.pulseSpeed}s`,
            transform: `scale(${1.1 + pulseIntensity * 0.05})`
          }}
        />
        <div 
          className="absolute inset-2 rounded-full border border-white/10 animate-spin"
          style={{ 
            animationDuration: `${6 / props.pulseSpeed}s`,
            animationDirection: 'reverse',
            transform: `scale(${1 + pulseIntensity * 0.03})`
          }}
        />
      </div>
    </div>
  );
}
