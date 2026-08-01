import React, { useEffect, useState } from "react";
import { motion } from "motion/react";
import Globe3D from "./Globe3D";
import { LiveSessionManager } from "../services/liveService";

type VisualizerState = "idle" | "listening" | "processing" | "speaking";

interface VisualizerProps {
  state: VisualizerState;
  liveSessionRef: React.MutableRefObject<LiveSessionManager | null>;
  isARMode?: boolean;
  arStatus?: "calibrating" | "anchored" | "failed";
  trackingOffset?: { x: number; y: number; scale: number; rotationY: number; rotationX: number };
  isGhostMode?: boolean;
}

export default function Visualizer({ 
  state, 
  liveSessionRef,
  isARMode = false,
  arStatus = "calibrating",
  trackingOffset,
  isGhostMode = false
}: VisualizerProps) {
  // Synchronized color hue state matching Globe3D's 12-second color cycle perfectly
  const [hue, setHue] = useState(160);

  useEffect(() => {
    const startTime = performance.now();
    let frameId: number;

    const tick = () => {
      const now = performance.now();
      // 12 seconds per full 360-degree rainbow rotation
      const elapsed = (now - startTime) / 1000;
      const currentHue = isGhostMode ? 355 : ((elapsed * (360 / 12)) % 360);
      setHue(currentHue);
      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [isGhostMode]);

  const getRingAnimation = (index: number, reverse: boolean = false) => {
    const baseSpeed = state === "listening" ? 3 : state === "processing" ? 1.5 : state === "speaking" ? 2 : 15;
    return {
      rotate: reverse ? [-360, 0] : [0, 360],
      transition: { duration: baseSpeed + index * 2, repeat: Infinity, ease: "linear" }
    };
  };

  const getPulseAnimation = () => {
    if (state === "speaking") {
      return {
        scale: [1, 1.05, 0.98, 1.02, 1],
        opacity: [0.8, 1, 0.8, 1, 0.8],
        transition: { duration: 0.5, repeat: Infinity, ease: "easeInOut" }
      };
    }
    if (state === "listening") {
      return {
        scale: [1, 1.02, 1],
        opacity: [0.7, 1, 0.7],
        transition: { duration: 1, repeat: Infinity, ease: "easeInOut" }
      };
    }
    if (state === "processing") {
      return {
        scale: [0.98, 1.02, 0.98],
        opacity: [0.6, 0.9, 0.6],
        transition: { duration: 0.8, repeat: Infinity, ease: "linear" }
      };
    }
    return {
      scale: [1, 1.01, 1],
      opacity: [0.4, 0.6, 0.4],
      transition: { duration: 4, repeat: Infinity, ease: "easeInOut" }
    };
  };

  const trackingStyle = isARMode && trackingOffset 
    ? { transform: `translate3d(${trackingOffset.x}px, ${trackingOffset.y}px, 0) scale(${trackingOffset.scale})` } 
    : {};

  return (
    <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none">
      {/* Enhanced Multi-Layered Ambient RGB Glow */}
      {/* Deep Background Wide Glow */}
      <motion.div
        animate={getPulseAnimation()}
        className="absolute w-[85%] h-[85%] rounded-full blur-[140px]"
        style={{ 
          backgroundColor: `hsla(${hue}, 95%, 55%, 0.15)`,
          ...trackingStyle
        }}
      />
      {/* Medium High-Vibrancy Glow */}
      <motion.div
        animate={getPulseAnimation()}
        className="absolute w-[60%] h-[60%] rounded-full blur-[90px]"
        style={{ 
          backgroundColor: `hsla(${hue}, 100%, 60%, 0.22)`,
          ...trackingStyle
        }}
      />
      {/* Central High-Intensity Accent Glow */}
      <motion.div
        animate={getPulseAnimation()}
        className="absolute w-[35%] h-[35%] rounded-full blur-[45px]"
        style={{ 
          backgroundColor: `hsla(${hue}, 100%, 65%, 0.28)`,
          ...trackingStyle
        }}
      />

      {/* Background Dotted & Dashed Orbital Tracks - distinctly behind the central 3D globe */}
      {/* Outer Ring 1: Massive Outer Dashed */}
      <motion.div
        animate={getRingAnimation(4, false)}
        className="absolute w-[100%] h-[100%] rounded-full border-[1px] border-dashed pointer-events-none"
        style={{ 
          borderColor: `hsla(${hue}, 95%, 65%, 0.22)`,
          filter: `drop-shadow(0 0 3px hsla(${hue}, 95%, 65%, 0.2))`,
          ...trackingStyle
        }}
      />

      {/* Middle Ring 2: Original, thicker dotted background orbital track */}
      <motion.div
        animate={getRingAnimation(3, true)}
        className="absolute w-[85%] h-[85%] rounded-full border-[2px] border-dotted pointer-events-none"
        style={{ 
          borderColor: `hsla(${hue}, 95%, 65%, 0.32)`,
          filter: `drop-shadow(0 0 4px hsla(${hue}, 95%, 65%, 0.3))`,
          ...trackingStyle
        }}
      />

      {/* Inner Ring 3: Original inner dashed background track */}
      <motion.div
        animate={getRingAnimation(1, false)}
        className="absolute w-[70%] h-[70%] rounded-full border-[1.5px] border-dashed pointer-events-none"
        style={{ 
          borderColor: `hsla(${hue}, 95%, 65%, 0.25)`,
          filter: `drop-shadow(0 0 3px hsla(${hue}, 95%, 65%, 0.25))`,
          ...trackingStyle
        }}
      />

      {/* Holographic 3D Rotating Globe - now massive, unclipped and layered behind the Core Circle */}
      <div 
        className="absolute w-[65%] h-[65%] md:w-[60%] md:h-[60%] flex items-center justify-center pointer-events-none z-0 transition-opacity duration-500"
        style={isARMode && arStatus === "calibrating" ? { opacity: 0.1 } : { opacity: 1 }}
      >
        <Globe3D 
          state={state} 
          liveSessionRef={liveSessionRef} 
          isARMode={isARMode}
          arStatus={arStatus}
          trackingOffset={trackingOffset}
          isGhostMode={isGhostMode}
        />
      </div>

      {/* Center Text floating cleanly with matching synchronized text shadow and breathing pulse animation */}
      <motion.div
        animate={getPulseAnimation()}
        className="absolute pointer-events-none z-10 font-bold tracking-[0.3em] text-xl md:text-3xl lg:text-4xl text-white select-none transition-all duration-300"
        style={{ 
          textShadow: `0 0 15px hsla(${hue}, 90%, 65%, 0.8), 0 0 30px hsla(${hue}, 90%, 65%, 0.5)`,
          ...trackingStyle,
          opacity: isARMode && arStatus === "calibrating" ? 0.3 : 1
        }}
      >
        ZOYA
      </motion.div>
    </div>
  );
}
