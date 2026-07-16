import React, { useEffect, useRef, useState } from "react";

type VisualizerState = "idle" | "listening" | "processing" | "speaking";

interface Globe3DProps {
  state: VisualizerState;
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

export default function Globe3D({ state }: Globe3DProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [dimensions, setDimensions] = useState({ width: 350, height: 350 });

  // High-density crisp particles forming the spherical shell
  const numPoints = 800; // Perfect density of glowing dots
  const pointsRef = useRef<Point3D[]>([]);

  const scalePulseRef = useRef(1);
  const animationFrameIdRef = useRef<number | null>(null);

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

    const render = () => {
      const now = performance.now();
      const elapsedSeconds = (now - startTime) / 1000;

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
        const speechMod = Math.sin(elapsedSeconds * 14) * 0.5 + 0.5;
        pulseFreq = 7.5;
        pulseAmp = 0.06;
      }

      // Update scale pulse/breathing
      scalePulseRef.current = 1 + Math.sin(elapsedSeconds * pulseFreq) * pulseAmp;

      // One full rotation every 10 seconds: (2 * Math.PI) / 10 radians per second
      const baseRotationAngle = (elapsedSeconds * 2 * Math.PI) / 10;

      // Smooth continuous Y-rotation angle for both the sphere and the rings
      const spinY = baseRotationAngle;

      // Cycle HSL color hue continuously from 0 to 360 over 12 seconds
      const colorHue = (elapsedSeconds * (360 / 12)) % 360;

      const w = dimensions.width;
      const h = dimensions.height;
      const dpr = window.devicePixelRatio || 1;

      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.scale(dpr, dpr);

      // Clean with pristine transparency for maximum crispness
      ctx.clearRect(0, 0, w, h);

      const centerX = w / 2;
      const centerY = h / 2;
      
      // Scaled down slightly for elegant, high-end minimalist presentation
      const baseRadius = Math.min(w, h) * 0.28;
      const sphereRadius = baseRadius * scalePulseRef.current;

      // Shifting RGB Color definitions based on HSL color wheel
      const ringColor = `hsla(${colorHue}, 90%, 60%, `;
      const particleColor = `hsla(${colorHue}, 90%, 65%, `;

      // Render Pipeline Array to sort points and ring segments together
      const renderables: Renderable[] = [];

      // Global aesthetic tilts
      const globalTiltX = 0.22; // 12.6 degrees X tilt so poles are visible
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
        
        // Crisp, ultra-small dot size: 0.5px to 0.9px radius
        const size = 0.45 + opacityFactor * 0.45;
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

        // Continuous spin on Y-axis completing exactly 1 rotation every 10 seconds
        const ringSpinY = isReverse ? -baseRotationAngle : baseRotationAngle;

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
          const beadTheta = (bIdx * 2 * Math.PI) / numBeads + (elapsedSeconds * 0.5 * (isReverse ? -1 : 1));
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
