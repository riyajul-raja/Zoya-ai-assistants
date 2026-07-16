import React, { useEffect, useRef, useState } from "react";
import { LiveSessionManager } from "../services/liveService";

type VisualizerState = "idle" | "listening" | "processing" | "speaking";

interface Globe3DProps {
  state: VisualizerState;
  liveSessionRef: React.MutableRefObject<LiveSessionManager | null>;
  isARMode?: boolean;
  arStatus?: "calibrating" | "anchored" | "failed";
  trackingOffset?: { x: number; y: number; scale: number; rotationY: number; rotationX: number };
  isGhostMode?: boolean;
}

interface Point3D {
  x: number;
  y: number;
  z: number;
}

interface Renderable {
  depth: number;
  draw: (ctx: CanvasRenderingContext2D) => void;
}

export default function Globe3D({ state, liveSessionRef, isARMode = false, arStatus = "calibrating", trackingOffset, isGhostMode = false }: Globe3DProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [dimensions, setDimensions] = useState({ width: 350, height: 350 });

  // Refs to allow high performance rendering loop without recreation
  const isARModeRef = useRef(isARMode);
  const arStatusRef = useRef(arStatus);
  const trackingOffsetRef = useRef(trackingOffset);
  const isGhostModeRef = useRef(isGhostMode);

  useEffect(() => {
    isARModeRef.current = isARMode;
  }, [isARMode]);

  useEffect(() => {
    arStatusRef.current = arStatus;
  }, [arStatus]);

  useEffect(() => {
    trackingOffsetRef.current = trackingOffset;
  }, [trackingOffset]);

  useEffect(() => {
    isGhostModeRef.current = isGhostMode;
  }, [isGhostMode]);

  // High-density crisp particles forming the spherical shell
  const numPoints = 800; // Perfect density of glowing dots
  const pointsRef = useRef<Point3D[]>([]);

  const scalePulseRef = useRef(1);
  const animationFrameIdRef = useRef<number | null>(null);

  const lastTimeRef = useRef<number | null>(null);
  const rotationAngleRef = useRef(0);
  const beadAccumulatorRef = useRef(0);
  const smoothedVolumeRef = useRef(0);
  const smoothedHighEnergyRef = useRef(0);

  // Distribute points on the sphere surface using Fibonacci Golden Spiral
  useEffect(() => {
    const pts: Point3D[] = [];
    for (let i = 0; i < numPoints; i++) {
      const theta = Math.acos(1 - 2 * (i + 0.5) / numPoints);
      const phi = Math.sqrt(numPoints * Math.PI) * theta;
      pts.push({
        x: Math.sin(theta) * Math.cos(phi),
        y: Math.sin(theta) * Math.sin(phi),
        z: Math.cos(theta),
      });
    }
    pointsRef.current = pts;
  }, []);

  // Set up container size listener for responsive sizing
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width, height } = entries[0].contentRect;
      setDimensions({
        width: Math.floor(width) || 350,
        height: Math.floor(height) || 350,
      });
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  // High-performance graphics loop using unified depth sorting (Painters Algorithm)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const startTime = performance.now();
    lastTimeRef.current = null;

    const render = () => {
      const now = performance.now();
      const elapsedSeconds = (now - startTime) / 1000;

      const lastTime = lastTimeRef.current || now;
      lastTimeRef.current = now;
      const deltaTimeSeconds = Math.min((now - lastTime) / 1000, 0.1);

      // Get real-time audio analysis if active session is available
      let audioVolume = 0;
      let audioHighEnergy = 0;
      if (liveSessionRef.current) {
        const audioData = liveSessionRef.current.getAudioData();
        audioVolume = audioData.volume;
        audioHighEnergy = audioData.highEnergy;
      }

      // Smooth the audio-reactive inputs to prevent animation jitter
      smoothedVolumeRef.current += (audioVolume - smoothedVolumeRef.current) * 0.12;
      smoothedHighEnergyRef.current += (audioHighEnergy - smoothedHighEnergyRef.current) * 0.12;

      // 1. Scale pulse/breathing speed based on Zoya's active state
      let pulseFreq = 2.0;
      let pulseAmp = 0.015;

      if (state === "listening") {
        pulseFreq = 4.5;
        pulseAmp = 0.04;
      } else if (state === "processing") {
        pulseFreq = 11.0;
        pulseAmp = 0.02;
      } else if (state === "speaking") {
        pulseFreq = 7.5;
        pulseAmp = 0.06;
      }

      // Update scale pulse/breathing
      scalePulseRef.current = 1 + Math.sin(elapsedSeconds * pulseFreq) * pulseAmp;

      // Base rotation speed: 2 * Math.PI / 10 radians per second
      const baseRotationSpeed = (2 * Math.PI) / 10;
      // High frequency audio peaks subtly increase the rotation speed (up to 2.5x speed)
      const rotationBoost = 1 + smoothedHighEnergyRef.current * 1.5;
      
      // Accumulate rotation angle frame-by-frame smoothly
      rotationAngleRef.current += baseRotationSpeed * rotationBoost * deltaTimeSeconds;
      
      // Accumulate bead movement with matching speed boost
      beadAccumulatorRef.current += 0.5 * rotationBoost * deltaTimeSeconds;

      const isAR = isARModeRef.current;
      const arStat = arStatusRef.current;
      const trackingOffsetVal = trackingOffsetRef.current;

      // Spatial tracking variables
      const trackingX = isAR && trackingOffsetVal ? trackingOffsetVal.x : 0;
      const trackingY = isAR && trackingOffsetVal ? trackingOffsetVal.y : 0;
      const trackingScale = isAR && trackingOffsetVal ? trackingOffsetVal.scale : 1;
      const trackingRotY = isAR && trackingOffsetVal ? trackingOffsetVal.rotationY : 0;
      const trackingRotX = isAR && trackingOffsetVal ? trackingOffsetVal.rotationX : 0;

      // Smooth continuous Y-rotation angle for both the sphere and the rings
      const spinY = rotationAngleRef.current + trackingRotY;

      // Cycle HSL color hue continuously from 0 to 360 over 12 seconds
      const colorHue = isGhostModeRef.current ? 355 : ((elapsedSeconds * (360 / 12)) % 360);

      const w = dimensions.width;
      const h = dimensions.height;
      const dpr = window.devicePixelRatio || 1;

      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.scale(dpr, dpr);

      // Clean with pristine transparency for maximum crispness
      ctx.clearRect(0, 0, w, h);

      const centerX = (w / 2) + trackingX;
      const centerY = (h / 2) + trackingY;
      
      // Scaled down slightly for elegant, high-end minimalist presentation
      const baseRadius = Math.min(w, h) * 0.28;
      
      // Map audio amplitude to the 3D particle system's radius: radius scales up slightly during speaks
      const audioScaleBonus = smoothedVolumeRef.current * 0.25;
      const sphereRadius = baseRadius * (scalePulseRef.current + audioScaleBonus) * trackingScale;

      // Shifting RGB Color definitions based on HSL color wheel
      const ringColor = `hsla(${colorHue}, 90%, 60%, `;
      const particleColor = `hsla(${colorHue}, 90%, 65%, `;

      // Render Pipeline Array to sort points and ring segments together
      const renderables: Renderable[] = [];

      // Global aesthetic tilts
      const globalTiltX = 0.22 + trackingRotX; // 12.6 degrees X tilt so poles are visible
      const globalTiltZ = 0.12; // 6.8 degrees Z tilt

      // 2. Project and add 800 high-density crisp micro-particles (sphere shell)
      const pts = pointsRef.current;
      for (let i = 0; i < pts.length; i++) {
        const pt = pts[i];

        // Spin around Y axis (yaw) - completing exactly 1 rotation every 10 seconds
        const cosS = Math.cos(spinY);
        const sinS = Math.sin(spinY);
        const xRotY = pt.x * cosS + pt.z * sinS;
        const zRotY = -pt.x * sinS + pt.z * cosS;
        const yRotY = pt.y;

        // Apply global scene tilt around X-axis
        const cosTX = Math.cos(globalTiltX);
        const sinTX = Math.sin(globalTiltX);
        const yRotTX = yRotY * cosTX - zRotY * sinTX;
        const zRotTX = yRotY * sinTX + zRotY * cosTX;
        const xRotTX = xRotY;

        // Apply global scene tilt around Z-axis
        const cosTZ = Math.cos(globalTiltZ);
        const sinTZ = Math.sin(globalTiltZ);
        const xFinal = xRotTX * cosTZ - yRotTX * sinTZ;
        const yFinal = xRotTX * sinTZ + yRotTX * cosTZ;
        const zFinal = zRotTX;

        // Perspective factor
        const cameraDistance = 2.4;
        const perspective = cameraDistance / (cameraDistance - zFinal);

        const px = centerX + xFinal * sphereRadius * perspective;
        const py = centerY + yFinal * sphereRadius * perspective;

        const opacityFactor = (zFinal + 1) / 2; // 0 to 1
        
        // Crisp, ultra-small dot size: 0.5px to 0.9px radius, scaled up slightly during audio peaks
        const size = (0.45 + opacityFactor * 0.45) * (1 + smoothedVolumeRef.current * 0.5);
        const alpha = 0.12 + opacityFactor * 0.72;

        renderables.push({
          depth: zFinal,
          draw: (c) => {
            c.fillStyle = `${particleColor}${alpha})`;
            c.beginPath();
            c.arc(px, py, size, 0, Math.PI * 2);
            c.fill();
          },
        });
      }

      // 3. Project and add PERFECT 3D CIRCULAR GYROSCOPIC RINGS
      const addGyroRingToPipeline = (
        tiltX: number,       // Fixed tilt on X axis
        radiusMul: number,   // Radius multiplier relative to sphere
        isReverse: boolean,  // Spin direction
        lineDash: number[] | null,
        opacityMul: number,
        numBeads: number
      ) => {
        const numRingPoints = 120; // High resolution for perfect circles
        const ringPoints3D: Point3D[] = [];
        const ringScreenCoords: { px: number; py: number }[] = [];

        // Continuous spin on Y-axis completing rotation smoothly
        const ringSpinY = isReverse ? -rotationAngleRef.current : rotationAngleRef.current;

        // Draw perfect circle in XZ plane, apply tilts & Y spin
        for (let k = 0; k <= numRingPoints; k++) {
          const theta = (k * 2 * Math.PI) / numRingPoints;
          const rx = Math.cos(theta);
          const rz = Math.sin(theta);
          const ry = 0; // Flat local orbit

          // A. Apply fixed tilt on X-axis (concentric gyroscopic structure)
          const cosTX = Math.cos(tiltX);
          const sinTX = Math.sin(tiltX);
          const xTilted = rx;
          const yTilted = ry * cosTX - rz * sinTX;
          const zTilted = ry * sinTX + rz * cosTX;

          // B. Spin on Y-axis (vertical gyroscope rotation)
          const cosRSpin = Math.cos(ringSpinY);
          const sinRSpin = Math.sin(ringSpinY);
          const xSpun = xTilted * cosRSpin + zTilted * sinRSpin;
          const ySpun = yTilted;
          const zSpun = -xTilted * sinRSpin + zTilted * cosRSpin;

          // C. Apply global scene tilts (X and Z) so it lines up with sphere coordinate system
          const cosGX = Math.cos(globalTiltX);
          const sinGX = Math.sin(globalTiltX);
          const yGlobX = ySpun * cosGX - zSpun * sinGX;
          const zGlobX = ySpun * sinGX + zSpun * cosGX;
          const xGlobX = xSpun;

          const cosGZ = Math.cos(globalTiltZ);
          const sinGZ = Math.sin(globalTiltZ);
          const xFinal = xGlobX * cosGZ - yGlobX * sinGZ;
          const yFinal = xGlobX * sinGZ + yGlobX * cosGZ;
          const zFinal = zGlobX;

          ringPoints3D.push({ x: xFinal, y: yFinal, z: zFinal });

          const perspective = 2.4 / (2.4 - zFinal);
          const px = centerX + xFinal * (sphereRadius * radiusMul) * perspective;
          const py = centerY + yFinal * (sphereRadius * radiusMul) * perspective;

          ringScreenCoords.push({ px, py });
        }

        // Add each line segment of the gyroscopic ring as a separate 3D renderable
        for (let k = 0; k < numRingPoints; k++) {
          const pt1 = ringPoints3D[k];
          const pt2 = ringPoints3D[k + 1];
          const sc1 = ringScreenCoords[k];
          const sc2 = ringScreenCoords[k + 1];

          const avgDepth = (pt1.z + pt2.z) / 2;
          const opacityFactor = (avgDepth + 1) / 2;
          const alpha = (0.10 + opacityFactor * 0.45) * opacityMul;

          renderables.push({
            depth: avgDepth,
            draw: (c) => {
              c.save();
              c.lineWidth = 2.0; // Thicker 2px crisp lines for better visibility matching the older version
              if (lineDash) {
                c.setLineDash(lineDash);
              }
              c.strokeStyle = `${ringColor}${alpha})`;
              c.beginPath();
              c.moveTo(sc1.px, sc1.py);
              c.lineTo(sc2.px, sc2.py);
              c.stroke();
              c.restore();
            },
          });
        }

        // Draw glowing micro tracer beads along the rings
        for (let bIdx = 0; bIdx < numBeads; bIdx++) {
          const beadTheta = (bIdx * 2 * Math.PI) / numBeads + (beadAccumulatorRef.current * (isReverse ? -1 : 1));
          const rx = Math.cos(beadTheta);
          const rz = Math.sin(beadTheta);
          const ry = 0;

          // Apply fixed tilt
          const cosTX = Math.cos(tiltX);
          const sinTX = Math.sin(tiltX);
          const xTilted = rx;
          const yTilted = ry * cosTX - rz * sinTX;
          const zTilted = ry * sinTX + rz * cosTX;

          // Apply spin
          const cosRSpin = Math.cos(ringSpinY);
          const sinRSpin = Math.sin(ringSpinY);
          const xSpun = xTilted * cosRSpin + zTilted * sinRSpin;
          const ySpun = yTilted;
          const zSpun = -xTilted * sinRSpin + zTilted * cosRSpin;

          // Apply global scene tilts
          const cosGX = Math.cos(globalTiltX);
          const sinGX = Math.sin(globalTiltX);
          const yGlobX = ySpun * cosGX - zSpun * sinGX;
          const zGlobX = ySpun * sinGX + zSpun * cosGX;
          const xGlobX = xSpun;

          const cosGZ = Math.cos(globalTiltZ);
          const sinGZ = Math.sin(globalTiltZ);
          const xFinal = xGlobX * cosGZ - yGlobX * sinGZ;
          const yFinal = xGlobX * sinGZ + yGlobX * cosGZ;
          const zFinal = zGlobX;

          const perspective = 2.4 / (2.4 - zFinal);
          const px = centerX + xFinal * (sphereRadius * radiusMul) * perspective;
          const py = centerY + yFinal * (sphereRadius * radiusMul) * perspective;

          const opacityFactor = (zFinal + 1) / 2;
          const beadSize = 1.0 + opacityFactor * 1.0;
          const alpha = 0.3 + opacityFactor * 0.7;

          renderables.push({
            depth: zFinal,
            draw: (c) => {
              c.fillStyle = `${ringColor}${alpha})`;
              c.beginPath();
              c.arc(px, py, beadSize, 0, Math.PI * 2);
              c.fill();
            },
          });
        }
      };

      // Create exactly 2 concentric, gyroscopic orbital rings crossing at strict fixed +45 and -45 tilts
      // Ring 1: Tilted at strict +45 degrees on X axis with a radius multiplier of 1.15 (tightly wrapping the sphere)
      addGyroRingToPipeline(Math.PI / 4, 1.15, false, [6, 10], 0.7, 4);

      // Ring 2: Tilted at strict -45 degrees on X axis with a radius multiplier of 1.15, spinning in reverse
      addGyroRingToPipeline(-Math.PI / 4, 1.15, true, null, 0.8, 4);

      // 4. Sort all 3D primitives (dots, segments, beads) by Z-depth for perfect 3D occlusion
      renderables.sort((a, b) => a.depth - b.depth);

      // 5. Render everything with crisp, thin lines and no blurry shadow lags
      for (let i = 0; i < renderables.length; i++) {
        renderables[i].draw(ctx);
      }

      // 6. Optional HUD target finder when calibrating AR space
      if (isAR && arStat === "calibrating") {
        ctx.save();
        ctx.strokeStyle = `hsla(${colorHue}, 95%, 65%, 0.45)`;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 12]);
        
        // Spin slowly
        const scanAngle = (elapsedSeconds * Math.PI) / 3;
        ctx.translate(w / 2, h / 2);
        ctx.rotate(scanAngle);
        
        ctx.beginPath();
        ctx.arc(0, 0, baseRadius * 1.3, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        
        // Non-rotated overlay details
        ctx.save();
        ctx.strokeStyle = `hsla(${colorHue}, 95%, 65%, 0.65)`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        // Top-left corner
        ctx.moveTo(w / 2 - baseRadius * 1.3, h / 2 - baseRadius * 1.0);
        ctx.lineTo(w / 2 - baseRadius * 1.3 + 15, h / 2 - baseRadius * 1.0);
        ctx.moveTo(w / 2 - baseRadius * 1.3, h / 2 - baseRadius * 1.0);
        ctx.lineTo(w / 2 - baseRadius * 1.3, h / 2 - baseRadius * 1.0 + 15);
        
        // Top-right corner
        ctx.moveTo(w / 2 + baseRadius * 1.3, h / 2 - baseRadius * 1.0);
        ctx.lineTo(w / 2 + baseRadius * 1.3 - 15, h / 2 - baseRadius * 1.0);
        ctx.moveTo(w / 2 + baseRadius * 1.3, h / 2 - baseRadius * 1.0);
        ctx.lineTo(w / 2 + baseRadius * 1.3, h / 2 - baseRadius * 1.0 + 15);
        
        // Bottom-left corner
        ctx.moveTo(w / 2 - baseRadius * 1.3, h / 2 + baseRadius * 1.0);
        ctx.lineTo(w / 2 - baseRadius * 1.3 + 15, h / 2 + baseRadius * 1.0);
        ctx.moveTo(w / 2 - baseRadius * 1.3, h / 2 + baseRadius * 1.0);
        ctx.lineTo(w / 2 - baseRadius * 1.3, h / 2 + baseRadius * 1.0 - 15);
        
        // Bottom-right corner
        ctx.moveTo(w / 2 + baseRadius * 1.3, h / 2 + baseRadius * 1.0);
        ctx.lineTo(w / 2 + baseRadius * 1.3 - 15, h / 2 + baseRadius * 1.0);
        ctx.moveTo(w / 2 + baseRadius * 1.3, h / 2 + baseRadius * 1.0);
        ctx.lineTo(w / 2 + baseRadius * 1.3, h / 2 + baseRadius * 1.0 - 15);
        ctx.stroke();
        
        // Draw crosshair at center
        ctx.strokeStyle = `hsla(${colorHue}, 95%, 65%, 0.4)`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(w / 2 - 12, h / 2); ctx.lineTo(w / 2 + 12, h / 2);
        ctx.moveTo(w / 2, h / 2 - 12); ctx.lineTo(w / 2, h / 2 + 12);
        ctx.stroke();

        ctx.fillStyle = `hsla(${colorHue}, 95%, 65%, 0.85)`;
        ctx.font = "bold 9px monospace";
        ctx.textAlign = "center";
        ctx.letterSpacing = "3px";
        ctx.fillText("SCANNING FOR SURFACE...", w / 2, h / 2 + baseRadius * 1.5);
        ctx.restore();
      }

      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
      animationFrameIdRef.current = requestAnimationFrame(render);
    };

    render();

    // Fallback interval to ensure constant rendering even when the window is in the background
    // or when Picture-in-Picture is active (as requestAnimationFrame is throttled or paused by the browser when hidden)
    const fallbackIntervalId = setInterval(() => {
      if (document.visibilityState === "hidden" || document.pictureInPictureElement) {
        render();
      }
    }, 33);

    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
      clearInterval(fallbackIntervalId);
    };
  }, [dimensions, state]);

  return (
    <div 
      ref={containerRef} 
      className="absolute inset-0 w-full h-full flex items-center justify-center pointer-events-none z-0"
    >
      <canvas 
        ref={canvasRef} 
        id="zoya-globe-canvas"
        style={{
          width: `${dimensions.width}px`,
          height: `${dimensions.height}px`,
          display: "block",
        }}
      />
    </div>
  );
}
