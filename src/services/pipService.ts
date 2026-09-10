/**
 * Official Browser Picture-in-Picture (PiP) Service for Zoya
 * 
 * Supports:
 * 1. Document Picture-in-Picture API (window.documentPictureInPicture) for full interactive floating windows
 * 2. Standard HTMLVideoElement Picture-in-Picture API (video.requestPictureInPicture) using a live animated canvas stream
 * 
 * Fallback:
 * If unsupported, informs the user with "Picture-in-Picture is not supported on this device or browser."
 */

export type PiPAppState = "idle" | "listening" | "processing" | "speaking";

export interface PiPOptions {
  appState: PiPAppState;
  assistantName: string;
  isSessionActive: boolean;
  onToggleSession?: () => void;
  onClose?: () => void;
}

export interface PiPController {
  isActive: boolean;
  type: "document" | "video";
  updateState: (state: PiPAppState, assistantName: string, isSessionActive: boolean) => void;
  close: () => void;
}

/**
 * Checks if any official browser Picture-in-Picture API is available
 */
export function isPictureInPictureSupported(): boolean {
  if (typeof window === "undefined") return false;

  const hasDocumentPiP = "documentPictureInPicture" in window;
  const hasVideoPiP =
    "pictureInPictureEnabled" in document &&
    Boolean((document as any).pictureInPictureEnabled) &&
    typeof HTMLVideoElement !== "undefined" &&
    typeof HTMLVideoElement.prototype.requestPictureInPicture === "function";
  const hasWebkitPiP =
    typeof HTMLVideoElement !== "undefined" &&
    typeof (HTMLVideoElement.prototype as any).webkitSetPresentationMode === "function";

  return hasDocumentPiP || hasVideoPiP || hasWebkitPiP;
}

/**
 * Enters Picture-in-Picture mode using the browser's supported API
 */
export async function requestZoyaPictureInPicture(
  options: PiPOptions
): Promise<PiPController> {
  // Strategy 1: Try Document Picture-in-Picture API (Chrome 116+, Edge 116+)
  if ("documentPictureInPicture" in window) {
    try {
      const docPiP = (window as any).documentPictureInPicture;
      const pipWindow: Window = await docPiP.requestWindow({
        width: 320,
        height: 380,
      });

      return setupDocumentPiP(pipWindow, options);
    } catch (docErr: any) {
      console.warn("Document PiP request failed, attempting Video PiP fallback:", docErr);
      // Fall through to Video PiP
    }
  }

  // Strategy 2: Standard HTMLVideoElement PiP using Live Canvas Stream
  const hasStandardPiP =
    "pictureInPictureEnabled" in document &&
    (document as any).pictureInPictureEnabled &&
    typeof HTMLVideoElement !== "undefined" &&
    typeof HTMLVideoElement.prototype.requestPictureInPicture === "function";

  const hasWebkitPiP =
    typeof HTMLVideoElement !== "undefined" &&
    typeof (HTMLVideoElement.prototype as any).webkitSetPresentationMode === "function";

  if (hasStandardPiP || hasWebkitPiP) {
    try {
      return await setupCanvasVideoPiP(options);
    } catch (videoErr: any) {
      console.warn("Video PiP request failed:", videoErr);
      throw new Error("Picture-in-Picture failed or unsupported.");
    }
  }

  throw new Error("Picture-in-Picture is not supported on this device or browser.");
}

/**
 * Setup Document Picture-in-Picture Window
 */
function setupDocumentPiP(pipWindow: Window, options: PiPOptions): PiPController {
  const pipDoc = pipWindow.document;
  pipDoc.title = `${options.assistantName || "Zoya"} - Picture-in-Picture`;

  // Inject Styles
  const styleEl = pipDoc.createElement("style");
  styleEl.textContent = `
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      user-select: none;
    }
    body {
      background: #07070a;
      color: #ffffff;
      height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      padding: 14px 16px;
      overflow: hidden;
      position: relative;
    }
    .bg-glow {
      position: absolute;
      width: 200px;
      height: 200px;
      border-radius: 50%;
      filter: blur(55px);
      pointer-events: none;
      transform: translate3d(0, 0, 0);
      will-change: opacity, background-color;
      contain: strict;
      transition: background-color 0.4s ease, opacity 0.4s ease;
      opacity: 0.35;
    }
    .header {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      z-index: 10;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
    }
    .logo-badge {
      width: 26px;
      height: 26px;
      border-radius: 8px;
      background: linear-gradient(135deg, #7c3aed, #ec4899);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 13px;
      color: white;
      box-shadow: 0 0 10px rgba(124, 58, 237, 0.4);
    }
    .title {
      font-size: 14px;
      font-weight: 600;
      letter-spacing: 0.5px;
    }
    .restore-btn {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.14);
      color: #a1a1aa;
      border-radius: 999px;
      padding: 4px 12px;
      font-size: 11px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .restore-btn:hover {
      background: rgba(255, 255, 255, 0.18);
      color: #ffffff;
      border-color: rgba(255, 255, 255, 0.3);
    }
    .visualizer-container {
      position: relative;
      width: 170px;
      height: 170px;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10;
      contain: layout paint;
      cursor: pointer;
    }
    .ring {
      position: absolute;
      border-radius: 50%;
      will-change: transform;
      transform: translateZ(0);
      transform-origin: 50% 50%;
      backface-visibility: hidden;
      pointer-events: none;
      animation-play-state: running;
    }
    .ring-outer {
      width: 164px;
      height: 164px;
      border: 1.5px dashed rgba(255, 255, 255, 0.45);
      animation: rotate-cw 16s linear infinite;
    }
    .ring-mid {
      width: 138px;
      height: 138px;
      border: 2px dotted rgba(255, 255, 255, 0.6);
      animation: rotate-ccw 10s linear infinite;
    }
    .ring-scanner {
      width: 114px;
      height: 114px;
      border: 2px solid rgba(255, 255, 255, 0.75);
      border-top-color: transparent;
      border-bottom-color: transparent;
      animation: rotate-cw 7s linear infinite;
    }
    .ring-inner {
      width: 90px;
      height: 90px;
      border: 2px dashed rgba(255, 255, 255, 0.85);
      animation: rotate-ccw 5s linear infinite;
    }
    .ring-core {
      width: 70px;
      height: 70px;
      border: 2.5px dotted #a78bfa;
      animation: rotate-cw 3s linear infinite;
    }
    .core-orb {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 35px rgba(124, 58, 237, 0.85), inset 0 0 16px rgba(255, 255, 255, 0.6);
      border: 1.5px solid rgba(255, 255, 255, 0.7);
      will-change: transform;
      transform: translateZ(0);
      transform-origin: 50% 50%;
      backface-visibility: hidden;
      transition: background 0.3s ease, box-shadow 0.3s ease;
      animation: pulse-orb 2.2s ease-in-out infinite;
      font-weight: 800;
      font-size: 13px;
      letter-spacing: 2px;
      color: #ffffff;
      text-shadow: 0 0 10px rgba(255, 255, 255, 0.95), 0 0 20px rgba(139, 92, 246, 0.95);
      background: radial-gradient(circle at 35% 35%, #ffffff 0%, #8b5cf6 55%, #18181b 100%);
      opacity: 1;
    }
    .assistant-name {
      font-size: 20px;
      font-weight: 700;
      letter-spacing: 0.5px;
      color: #ffffff;
      text-shadow: 0 0 14px rgba(139, 92, 246, 0.85), 0 0 28px rgba(139, 92, 246, 0.5);
      margin: 4px 0 6px 0;
      text-align: center;
      z-index: 10;
      opacity: 1;
    }
    .control-area {
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      z-index: 10;
      min-height: 72px;
      justify-content: center;
    }
    .action-btn {
      width: 100%;
      max-width: 220px;
      padding: 10px 18px;
      border-radius: 999px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: all 0.2s ease;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4);
    }
    .action-btn:active {
      transform: scale(0.97);
    }
    .btn-start {
      background: linear-gradient(135deg, rgba(124, 58, 237, 0.88), rgba(219, 39, 119, 0.88));
      border: 1px solid rgba(255, 255, 255, 0.25);
      color: #ffffff;
      box-shadow: 0 0 20px rgba(124, 58, 237, 0.4);
    }
    .btn-start:hover {
      background: linear-gradient(135deg, rgba(124, 58, 237, 1), rgba(219, 39, 119, 1));
      box-shadow: 0 0 28px rgba(124, 58, 237, 0.6);
    }
    .btn-end {
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.45);
      color: #f87171;
      padding: 6px 14px;
      font-size: 11px;
      max-width: 130px;
      box-shadow: none;
    }
    .btn-end:hover {
      background: rgba(239, 68, 68, 0.3);
      color: #ffffff;
      border-color: rgba(239, 68, 68, 0.7);
    }
    .status-badge {
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.14);
      padding: 6px 16px;
      border-radius: 999px;
      font-size: 13px;
      font-weight: 500;
      color: #f4f4f5;
      backdrop-filter: blur(8px);
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
    }
    .status-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background-color: #8b5cf6;
      animation: pulse-dot 1.4s infinite ease-in-out;
    }
    @keyframes rotate-cw {
      from { transform: translateZ(0) rotate(0deg); }
      to { transform: translateZ(0) rotate(360deg); }
    }
    @keyframes rotate-ccw {
      from { transform: translateZ(0) rotate(360deg); }
      to { transform: translateZ(0) rotate(0deg); }
    }
    @keyframes pulse-orb {
      0%, 100% { transform: translateZ(0) scale(1); }
      50% { transform: translateZ(0) scale(1.06); }
    }
    @keyframes pulse-dot {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.35; transform: scale(0.85); }
    }
  `;
  pipDoc.head.appendChild(styleEl);

  // Build DOM Structure
  pipDoc.body.innerHTML = `
    <div class="bg-glow" id="pip-glow"></div>
    <div class="header" id="pip-header">
      <div class="brand" id="pip-brand" title="Return to Zoya">
        <div class="logo-badge">Z</div>
        <span class="title" id="pip-title">${options.assistantName || "Zoya"}</span>
      </div>
      <button class="restore-btn" id="pip-restore" title="Return to full Zoya window">Return</button>
    </div>

    <div class="visualizer-container" id="pip-visualizer" title="Toggle Voice Session">
      <div class="ring ring-outer" id="pip-ring-outer"></div>
      <div class="ring ring-mid" id="pip-ring-mid"></div>
      <div class="ring ring-scanner" id="pip-ring-scanner"></div>
      <div class="ring ring-inner" id="pip-ring-inner"></div>
      <div class="ring ring-core" id="pip-ring-core"></div>
      <div class="core-orb" id="pip-core-orb">ZOYA</div>
    </div>

    <div class="assistant-name" id="pip-assistant-name">${options.assistantName || "Zoya"}</div>

    <div class="control-area" id="pip-control-area"></div>
  `;

  // Return to main window handler
  const returnToMain = () => {
    try {
      window.focus();
    } catch {}
    try {
      pipWindow.close();
    } catch {}
  };

  const restoreBtn = pipDoc.getElementById("pip-restore");
  if (restoreBtn) {
    restoreBtn.addEventListener("click", returnToMain);
  }

  const brandEl = pipDoc.getElementById("pip-brand");
  if (brandEl) {
    brandEl.addEventListener("click", returnToMain);
  }

  // Visualizer container click also toggles session
  const visualizerContainer = pipDoc.getElementById("pip-visualizer");
  if (visualizerContainer && options.onToggleSession) {
    visualizerContainer.addEventListener("click", () => {
      if (options.onToggleSession) {
        options.onToggleSession();
      }
    });
  }

  // Update State Function
  const updateVisuals = (state: PiPAppState, assistantName: string, isSessionActive: boolean) => {
    const titleEl = pipDoc.getElementById("pip-title");
    const nameEl = pipDoc.getElementById("pip-assistant-name");
    const glowEl = pipDoc.getElementById("pip-glow");
    const orbEl = pipDoc.getElementById("pip-core-orb");
    const ringCoreEl = pipDoc.getElementById("pip-ring-core");
    const controlArea = pipDoc.getElementById("pip-control-area");

    if (titleEl) titleEl.textContent = assistantName || "Zoya";
    if (nameEl) {
      nameEl.textContent = assistantName || "Zoya";
    }

    let color = "#06b6d4";
    let statusText = "Ready";

    switch (state) {
      case "listening":
        color = "#8b5cf6";
        statusText = "Listening...";
        break;
      case "processing":
        color = "#38bdf8";
        statusText = "Replying...";
        break;
      case "speaking":
        color = "#ec4899";
        statusText = "Speaking...";
        break;
      default:
        color = isSessionActive ? "#8b5cf6" : "#06b6d4";
        statusText = isSessionActive ? "Ready" : "Start Session";
    }

    if (nameEl) {
      nameEl.style.textShadow = `0 0 14px ${color}, 0 0 28px ${color}80`;
    }
    if (glowEl) glowEl.style.backgroundColor = color;
    if (ringCoreEl) ringCoreEl.style.borderColor = color;
    if (orbEl) {
      orbEl.style.background = `radial-gradient(circle at 35% 35%, #ffffff 0%, ${color} 55%, #18181b 100%)`;
      orbEl.style.boxShadow = `0 0 35px ${color}c0, inset 0 0 16px rgba(255, 255, 255, 0.6)`;
    }

    if (!controlArea) return;

    if (!isSessionActive) {
      // If start button already exists, no need to recreate DOM
      const existingStartBtn = controlArea.querySelector("#pip-start-btn");
      if (!existingStartBtn) {
        controlArea.innerHTML = `
          <button class="action-btn btn-start" id="pip-start-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
              <line x1="12" y1="19" x2="12" y2="22"></line>
            </svg>
            <span>Start Session</span>
          </button>
        `;

        const startBtn = controlArea.querySelector("#pip-start-btn");
        if (startBtn && options.onToggleSession) {
          startBtn.addEventListener("click", () => {
            options.onToggleSession?.();
          });
        }
      }
    } else {
      // Session ACTIVE: Check if status badge exists for instant in-place update
      const existingStatusText = controlArea.querySelector("#pip-status-text");
      const existingStatusDot = controlArea.querySelector("#pip-status-dot");
      if (existingStatusText && existingStatusDot) {
        existingStatusText.textContent = statusText;
        (existingStatusDot as HTMLElement).style.backgroundColor = color;
        (existingStatusDot as HTMLElement).style.boxShadow = `0 0 8px ${color}`;
      } else {
        controlArea.innerHTML = `
          <div class="status-badge" id="pip-status-badge">
            <div class="status-dot" id="pip-status-dot" style="background-color: ${color}; box-shadow: 0 0 8px ${color}"></div>
            <span id="pip-status-text">${statusText}</span>
          </div>
          <button class="action-btn btn-end" id="pip-end-btn" title="End voice session">
            <span>End Session</span>
          </button>
        `;

        const endBtn = controlArea.querySelector("#pip-end-btn");
        if (endBtn && options.onToggleSession) {
          endBtn.addEventListener("click", () => {
            options.onToggleSession?.();
          });
        }
      }
    }
  };

  // Initial update
  updateVisuals(options.appState, options.assistantName, options.isSessionActive);

  let active = true;

  const handleClose = () => {
    if (!active) return;
    active = false;
    clearInterval(pollClosedInterval);
    if (options.onClose) {
      options.onClose();
    }
  };

  // Window Close Handlers
  pipWindow.addEventListener("pagehide", handleClose, { once: true });
  pipWindow.addEventListener("unload", handleClose, { once: true });

  // Fallback poll in case the browser closes without firing unload on parent listener
  const pollClosedInterval = setInterval(() => {
    if (pipWindow.closed) {
      handleClose();
    }
  }, 200);

  return {
    isActive: true,
    type: "document",
    updateState: (state, name, sessionActive) => {
      if (!active) return;
      try {
        updateVisuals(state, name, sessionActive);
      } catch (e) {
        // window closed
      }
    },
    close: () => {
      active = false;
      clearInterval(pollClosedInterval);
      try {
        pipWindow.close();
      } catch (e) {}
    },
  };
}

/**
 * Setup Video-Based Picture-in-Picture using Live Canvas Stream
 */
async function setupCanvasVideoPiP(options: PiPOptions): Promise<PiPController> {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Unable to create canvas rendering context for Picture-in-Picture.");
  }

  let currentState = options.appState;
  let currentName = options.assistantName || "Zoya";
  let currentSessionActive = options.isSessionActive;
  let isRunning = true;

  // Draw first frame
  drawCanvasFrame(ctx, canvas.width, canvas.height, currentState, currentName, currentSessionActive, 0);

  const captureFn = (canvas as any).captureStream || (canvas as any).mozCaptureStream;
  if (!captureFn) {
    throw new Error("Canvas stream capture not supported.");
  }
  const stream: MediaStream = captureFn.call(canvas, 60);
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.srcObject = stream;

  // Render loop for the streaming canvas with smooth continuous time
  let animationFrameId: number;
  let bgIntervalId: any = null;
  const startTime = performance.now();

  const renderFrame = () => {
    if (!isRunning) return;
    const time = (performance.now() - startTime) / 1000;
    drawCanvasFrame(ctx, canvas.width, canvas.height, currentState, currentName, currentSessionActive, time);
  };

  const renderLoop = () => {
    if (!isRunning) return;
    renderFrame();
    animationFrameId = requestAnimationFrame(renderLoop);
  };

  // Pre-render initial frame so video stream has active frame dimensions
  renderFrame();

  // Hidden attachment to DOM to prevent user-gesture / unattached DOMException in Chrome/Safari
  video.style.position = "fixed";
  video.style.top = "-9999px";
  video.style.left = "-9999px";
  video.style.width = "1px";
  video.style.height = "1px";
  video.style.opacity = "0";
  video.style.pointerEvents = "none";
  document.body.appendChild(video);

  try {
    await video.play();
  } catch (playErr) {
    console.warn("Video play error (proceeding to PiP request):", playErr);
  }

  if (typeof video.requestPictureInPicture === "function") {
    await video.requestPictureInPicture();
  } else if (typeof (video as any).webkitSetPresentationMode === "function") {
    (video as any).webkitSetPresentationMode("picture-in-picture");
  } else {
    if (video.parentNode) video.parentNode.removeChild(video);
    throw new Error("Native Picture-in-Picture method not found on video element.");
  }

  // Start continuous render loop
  animationFrameId = requestAnimationFrame(renderLoop);

  // Background fallback timer:
  // When tab is hidden or user switches apps, browsers throttle or suspend requestAnimationFrame.
  // This steady interval ensures the canvas video stream never freezes in PiP.
  bgIntervalId = setInterval(() => {
    if (isRunning && document.hidden) {
      renderFrame();
    }
  }, 33); // ~30 FPS in background

  // Polling check to ensure toggle state matches native PiP state if user closes window
  const pollVideoPiP = setInterval(() => {
    if (isRunning && !document.pictureInPictureElement) {
      clearInterval(pollVideoPiP);
      handleLeavePiP();
    }
  }, 250);

  // Setup MediaSession handlers for controlling voice session directly from PiP / notifications
  if ("mediaSession" in navigator) {
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: `${currentName} Voice Session`,
        artist: "Zoya AI Assistant",
      });
      navigator.mediaSession.setActionHandler("play", () => {
        options.onToggleSession?.();
      });
      navigator.mediaSession.setActionHandler("pause", () => {
        options.onToggleSession?.();
      });
      navigator.mediaSession.setActionHandler("stop", () => {
        options.onToggleSession?.();
      });
    } catch {}
  }

  const handleLeavePiP = () => {
    isRunning = false;
    cancelAnimationFrame(animationFrameId);
    clearInterval(pollVideoPiP);
    if (bgIntervalId) {
      clearInterval(bgIntervalId);
      bgIntervalId = null;
    }
    if ("mediaSession" in navigator) {
      try {
        navigator.mediaSession.setActionHandler("play", null);
        navigator.mediaSession.setActionHandler("pause", null);
        navigator.mediaSession.setActionHandler("stop", null);
      } catch {}
    }
    if (video.srcObject) {
      const mediaStream = video.srcObject as MediaStream;
      mediaStream.getTracks().forEach((track) => track.stop());
      video.srcObject = null;
    }
    if (video.parentNode) {
      video.parentNode.removeChild(video);
    }
    if (options.onClose) {
      options.onClose();
    }
  };

  video.addEventListener("leavepictureinpicture", handleLeavePiP, { once: true });

  return {
    isActive: true,
    type: "video",
    updateState: (state, name, sessionActive) => {
      currentState = state;
      currentName = name;
      currentSessionActive = sessionActive;
      // Immediately render frame so PiP visual state updates with 0 latency
      renderFrame();
    },
    close: () => {
      isRunning = false;
      cancelAnimationFrame(animationFrameId);
      clearInterval(pollVideoPiP);
      if (bgIntervalId) {
        clearInterval(bgIntervalId);
        bgIntervalId = null;
      }
      if (document.pictureInPictureElement) {
        document.exitPictureInPicture().catch(() => {});
      }
      if (video.srcObject) {
        const mediaStream = video.srcObject as MediaStream;
        mediaStream.getTracks().forEach((track) => track.stop());
        video.srcObject = null;
      }
      if (video.parentNode) {
        video.parentNode.removeChild(video);
      }
    },
  };
}

/**
 * Draws animated frame onto the PiP canvas
 */
function drawCanvasFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  state: PiPAppState,
  name: string,
  isSessionActive: boolean,
  time: number
) {
  // Clear Background
  ctx.fillStyle = "#07070a";
  ctx.fillRect(0, 0, width, height);

  // Determine state colors and real-time status label
  let glowColor = "rgba(6, 182, 212, 0.25)";
  let statusText = "Ready";
  let themeHex = "#06b6d4";

  if (state === "listening") {
    glowColor = "rgba(139, 92, 246, 0.4)";
    statusText = "Listening...";
    themeHex = "#8b5cf6";
  } else if (state === "processing") {
    glowColor = "rgba(56, 189, 248, 0.45)";
    statusText = "Replying...";
    themeHex = "#38bdf8";
  } else if (state === "speaking") {
    glowColor = "rgba(236, 72, 153, 0.45)";
    statusText = "Speaking...";
    themeHex = "#ec4899";
  } else if (isSessionActive) {
    glowColor = "rgba(139, 92, 246, 0.25)";
    statusText = "Ready";
    themeHex = "#8b5cf6";
  }

  const cx = width / 2;
  const cy = height / 2 - 24;

  // Center ambient blur
  const bgGrad = ctx.createRadialGradient(cx, cy, 20, cx, cy, 180);
  bgGrad.addColorStop(0, glowColor);
  bgGrad.addColorStop(1, "transparent");
  ctx.fillStyle = bgGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, 180, 0, Math.PI * 2);
  ctx.fill();

  // 1. Continuous Rotating outer ring (dashed) - high contrast
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(time * 0.35);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([8, 8]);
  ctx.beginPath();
  ctx.arc(0, 0, 146, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // 2. Continuous Rotating mid ring (dotted) - high contrast
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-time * 0.65);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
  ctx.lineWidth = 2.5;
  ctx.setLineDash([3, 10]);
  ctx.beginPath();
  ctx.arc(0, 0, 122, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // 3. Continuous Rotating scanner ring - high contrast
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(time * 1.05);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.75)";
  ctx.lineWidth = 2;
  ctx.setLineDash([24, 12]);
  ctx.beginPath();
  ctx.arc(0, 0, 100, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // 4. Continuous Rotating inner ring (dashed) - high contrast
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-time * 1.45);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 8]);
  ctx.beginPath();
  ctx.arc(0, 0, 78, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // 5. Continuous Rotating core ring (dotted theme) - high contrast
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(time * 2.0);
  ctx.strokeStyle = themeHex;
  ctx.lineWidth = 3;
  ctx.setLineDash([4, 6]);
  ctx.beginPath();
  ctx.arc(0, 0, 60, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // Pulsing center orb
  const pulseScale = 1 + Math.sin(time * (state === "speaking" ? 6 : 2.5)) * 0.06;
  const orbRadius = 46 * pulseScale;

  // Outer glow behind orb
  const glowGrad = ctx.createRadialGradient(cx, cy, orbRadius * 0.6, cx, cy, orbRadius * 1.6);
  glowGrad.addColorStop(0, `${themeHex}99`);
  glowGrad.addColorStop(1, "transparent");
  ctx.fillStyle = glowGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, orbRadius * 1.6, 0, Math.PI * 2);
  ctx.fill();

  const orbGrad = ctx.createRadialGradient(cx - 10, cy - 10, 5, cx, cy, orbRadius);
  orbGrad.addColorStop(0, "#ffffff");
  orbGrad.addColorStop(0.5, themeHex);
  orbGrad.addColorStop(1, "#18181b");

  ctx.fillStyle = orbGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, orbRadius, 0, Math.PI * 2);
  ctx.fill();

  // Bright border on center orb
  ctx.strokeStyle = "rgba(255, 255, 255, 0.75)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Center "ZOYA" inside orb - clearly visible with strong contrast
  ctx.fillStyle = "#ffffff";
  ctx.font = "800 16px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0, 0, 0, 0.9)";
  ctx.shadowBlur = 8;
  ctx.fillText("ZOYA", cx, cy);
  ctx.shadowBlur = 0;

  // "Zoya" text below the logo - clearly visible with strong contrast
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 24px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(139, 92, 246, 0.95)";
  ctx.shadowBlur = 14;
  ctx.fillText(name || "Zoya", cx, height - 98);
  ctx.shadowBlur = 0;

  // Control area
  const badgeY = height - 58;

  if (!isSessionActive) {
    // Session INACTIVE: Draw "Start Session" interactive button
    const btnWidth = 160;
    const btnHeight = 36;
    const btnX = cx - btnWidth / 2;

    const btnGrad = ctx.createLinearGradient(btnX, badgeY, btnX + btnWidth, badgeY + btnHeight);
    btnGrad.addColorStop(0, "rgba(124, 58, 237, 0.9)");
    btnGrad.addColorStop(1, "rgba(219, 39, 119, 0.9)");
    ctx.fillStyle = btnGrad;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(btnX, badgeY, btnWidth, btnHeight, 18);
    ctx.fill();
    ctx.stroke();

    // Button label
    ctx.fillStyle = "#ffffff";
    ctx.font = "600 13px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Start Session", cx, badgeY + btnHeight / 2);
  } else {
    // Session ACTIVE: Draw real-time status pill
    const badgeWidth = 144;
    const badgeHeight = 32;
    const badgeX = cx - badgeWidth / 2;

    ctx.fillStyle = "rgba(255, 255, 255, 0.09)";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, 16);
    ctx.fill();
    ctx.stroke();

    // Status Dot
    ctx.fillStyle = themeHex;
    ctx.beginPath();
    ctx.arc(badgeX + 22, badgeY + badgeHeight / 2, 5, 0, Math.PI * 2);
    ctx.fill();

    // Status Text (Listening..., Speaking..., etc.)
    ctx.fillStyle = "#f4f4f5";
    ctx.font = "500 13px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(statusText, badgeX + 34, badgeY + badgeHeight / 2);
  }
}
