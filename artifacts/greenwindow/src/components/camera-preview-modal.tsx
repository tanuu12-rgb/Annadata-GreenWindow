import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Camera,
  Check,
  FlipHorizontal,
  Info,
  Layers,
  RefreshCw,
  Sparkles,
  Video,
  X,
} from 'lucide-react';

interface CameraPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (imageDataUrl: string, imageName: string) => void;
}

type Mode = 'live' | 'preset';

interface FieldPreset {
  id: string;
  name: string;
  subtitle: string;
  classificationTarget: 'ripe' | 'unripe' | 'spoiling';
  badgeColor: string;
  primaryColor: string;
  secondaryColor: string;
  stemColor: string;
}

const FIELD_PRESETS: FieldPreset[] = [
  {
    id: 'zone-1-ripe',
    name: 'Zone 1: Ripe Tomato',
    subtitle: 'Harvest-ready vine fruit (HSV ripe spectrum)',
    classificationTarget: 'ripe',
    badgeColor: 'bg-red-500/20 text-red-300 border-red-500/40',
    primaryColor: '#d63031',
    secondaryColor: '#e17055',
    stemColor: '#2d3436',
  },
  {
    id: 'zone-2-unripe',
    name: 'Zone 2: Unripe Citrus / Green',
    subtitle: 'Early maturity green fruit (high chlorophyll)',
    classificationTarget: 'unripe',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    primaryColor: '#27ae60',
    secondaryColor: '#2ecc71',
    stemColor: '#1e824c',
  },
  {
    id: 'zone-3-spoiling',
    name: 'Zone 3: Storage Sample / Dark',
    subtitle: 'Post-harvest holdout (dark bruised tissue)',
    classificationTarget: 'spoiling',
    badgeColor: 'bg-stone-500/20 text-stone-300 border-stone-500/40',
    primaryColor: '#231f20',
    secondaryColor: '#3c3636',
    stemColor: '#121011',
  },
];

/**
 * Draws a calibrated high-resolution crop sample onto a 640x480 canvas
 * so the backend Jimp classifier (which scans average RGB -> HSV) gets
 * precise, realistic pixel colors.
 */
function drawPresetToCanvas(canvas: HTMLCanvasElement, preset: FieldPreset) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;

  // Background orchard / foliage blur
  const bgGradient = ctx.createLinearGradient(0, 0, w, h);
  bgGradient.addColorStop(0, '#314429');
  bgGradient.addColorStop(0.5, '#475d3c');
  bgGradient.addColorStop(1, '#273822');
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, w, h);

  // Background bokeh leaves
  ctx.fillStyle = 'rgba(78, 110, 64, 0.45)';
  for (let i = 0; i < 12; i++) {
    const bx = (i * 73) % w;
    const by = (i * 97) % h;
    const br = 30 + (i * 11) % 45;
    ctx.beginPath();
    ctx.arc(bx, by, br, 0, Math.PI * 2);
    ctx.fill();
  }

  // Fruit body
  const cx = w / 2;
  const cy = h / 2 + 10;
  const radius = Math.min(w, h) * 0.32;

  // Main fruit radial gradient
  const fruitGrad = ctx.createRadialGradient(
    cx - radius * 0.35,
    cy - radius * 0.35,
    radius * 0.1,
    cx,
    cy,
    radius,
  );
  fruitGrad.addColorStop(0, preset.secondaryColor);
  fruitGrad.addColorStop(0.85, preset.primaryColor);
  fruitGrad.addColorStop(1, preset.stemColor);

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = fruitGrad;
  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
  ctx.shadowBlur = 35;
  ctx.shadowOffsetY = 15;
  ctx.fill();
  ctx.restore();

  // Natural glossy specular highlight
  const hlGrad = ctx.createRadialGradient(
    cx - radius * 0.4,
    cy - radius * 0.4,
    2,
    cx - radius * 0.35,
    cy - radius * 0.35,
    radius * 0.4,
  );
  hlGrad.addColorStop(0, 'rgba(255, 255, 255, 0.65)');
  hlGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.15)');
  hlGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = hlGrad;
  ctx.beginPath();
  ctx.ellipse(cx - radius * 0.35, cy - radius * 0.35, radius * 0.3, radius * 0.2, -Math.PI / 4, 0, Math.PI * 2);
  ctx.fill();

  // Calyx / Stem on top
  ctx.fillStyle = preset.classificationTarget === 'spoiling' ? '#18120d' : '#275226';
  ctx.beginPath();
  ctx.ellipse(cx, cy - radius * 0.92, 18, 9, 0, 0, Math.PI * 2);
  ctx.fill();

  // Star sepals
  for (let s = 0; s < 5; s++) {
    const angle = (s * (Math.PI * 2)) / 5 - Math.PI / 2;
    const sx = cx + Math.cos(angle) * 32;
    const sy = cy - radius * 0.92 + Math.sin(angle) * 14;
    ctx.beginPath();
    ctx.moveTo(cx, cy - radius * 0.92);
    ctx.lineTo(sx, sy);
    ctx.lineWidth = 5;
    ctx.strokeStyle = preset.classificationTarget === 'spoiling' ? '#18120d' : '#275226';
    ctx.stroke();
  }
}

export function CameraPreviewModal({ isOpen, onClose, onCapture }: CameraPreviewModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [mode, setMode] = useState<Mode>('live');
  const [activePresetIndex, setActivePresetIndex] = useState(0);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isInitializingCamera, setIsInitializingCamera] = useState(false);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [isFlashing, setIsFlashing] = useState(false);

  const activePreset = FIELD_PRESETS[activePresetIndex];

  // Stop camera tracks cleanly
  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  // Initialize or reinitialize camera
  const startCamera = useCallback(async (deviceId?: string) => {
    stopStream();
    setCameraError(null);
    setIsInitializingCamera(true);

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Camera API is not supported in this browser. Showing simulated field sample.');
      setMode('preset');
      setIsInitializingCamera(false);
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: deviceId
          ? { deviceId: { exact: deviceId } }
          : {
              facingMode: { ideal: 'environment' },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }

      // Enumerate available video inputs for switching
      try {
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = allDevices.filter((d) => d.kind === 'videoinput');
        setDevices(videoInputs);
        if (videoInputs.length > 0 && !selectedDeviceId) {
          const currentTrack = stream.getVideoTracks()[0];
          const currentId = currentTrack?.getSettings?.()?.deviceId || videoInputs[0].deviceId;
          setSelectedDeviceId(currentId);
        }
      } catch {
        // Enumerate not strictly required
      }
    } catch (err: unknown) {
      console.warn('Camera access could not be acquired:', err);
      const errName = err instanceof Error ? err.name : 'Error';
      const msg =
        errName === 'NotAllowedError'
          ? 'Camera permission was denied. Showing simulated field sample.'
          : errName === 'NotFoundError'
          ? 'No camera device found on this system. Showing simulated field sample.'
          : 'Unable to connect to camera. Showing simulated field sample.';
      setCameraError(msg);
      setMode('preset');
    } finally {
      setIsInitializingCamera(false);
    }
  }, [selectedDeviceId, stopStream]);

  // Lifecycle when modal opens/closes or mode changes
  useEffect(() => {
    if (!isOpen) {
      stopStream();
      return;
    }

    if (mode === 'live') {
      startCamera(selectedDeviceId);
    } else {
      stopStream();
    }

    return () => {
      stopStream();
    };
  }, [isOpen, mode, startCamera, stopStream, selectedDeviceId]);

  // Draw preset onto canvas whenever preset changes or preset mode is active
  useEffect(() => {
    if (isOpen && mode === 'preset' && canvasRef.current) {
      drawPresetToCanvas(canvasRef.current, activePreset);
    }
  }, [isOpen, mode, activePresetIndex, activePreset]);

  // Switch camera device
  const switchCamera = () => {
    if (devices.length < 2) return;
    const currentIndex = devices.findIndex((d) => d.deviceId === selectedDeviceId);
    const nextDevice = devices[(currentIndex + 1) % devices.length];
    setSelectedDeviceId(nextDevice.deviceId);
    startCamera(nextDevice.deviceId);
  };

  // Capture current frame (either live video or simulated preset canvas)
  const captureFrame = () => {
    setIsFlashing(true);
    const canvas = document.createElement('canvas');

    if (mode === 'live' && videoRef.current && videoRef.current.videoWidth > 0) {
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      }
    } else {
      // Preset mode
      canvas.width = 640;
      canvas.height = 480;
      drawPresetToCanvas(canvas, activePreset);
    }

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename =
      mode === 'live'
        ? `field-capture-${timestamp}.jpg`
        : `${activePreset.id}-${timestamp}.jpg`;

    // Shutter flash effect
    window.setTimeout(() => {
      setIsFlashing(false);
      stopStream();
      onCapture(dataUrl, filename);
      onClose();
    }, 280);
  };

  // Keyboard close on Esc
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        stopStream();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, stopStream]);

  if (!isOpen) return null;

  return (
    <div
      className="gw-modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-[hsl(201_30%_18%/.75)] p-3 backdrop-blur-md sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="camera-preview-title"
      data-testid="modal-camera-preview"
    >
      {/* Click backdrop to close */}
      <button
        type="button"
        className="absolute inset-0 cursor-default bg-transparent"
        onClick={() => {
          stopStream();
          onClose();
        }}
        aria-label="Close camera preview backdrop"
        data-testid="button-close-camera-backdrop"
      />

      <div className="gw-modal-panel relative z-10 flex max-h-[95dvh] w-full max-w-2xl flex-col overflow-hidden rounded-[2rem] border border-[hsl(var(--card-border))] bg-[hsl(201_35%_12%)] text-white shadow-2xl">
        {/* Shutter flash overlay */}
        {isFlashing && (
          <div className="gw-shutter-flash pointer-events-none absolute inset-0 z-30 bg-white" />
        )}

        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[hsl(var(--primary)/.3)] text-[hsl(var(--accent))]">
              <Camera className="h-4 w-4" />
            </span>
            <div>
              <h2 id="camera-preview-title" className="text-sm font-bold tracking-wide text-white">
                Field Camera Viewfinder
              </h2>
              <p className="gw-mono text-[10px] text-white/60">
                Ripeness Spectral Analysis Desk
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mode Switcher Pill */}
            <div className="flex rounded-lg bg-white/10 p-0.5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => {
                  setMode('live');
                }}
                data-testid="button-toggle-live-mode"
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 transition ${
                  mode === 'live'
                    ? 'bg-[hsl(var(--primary))] text-white shadow-sm'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                <Video className="h-3 w-3" /> Live Cam
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('preset');
                }}
                data-testid="button-toggle-sample-mode"
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 transition ${
                  mode === 'preset'
                    ? 'bg-[hsl(var(--primary))] text-white shadow-sm'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                <Layers className="h-3 w-3" /> Field Presets
              </button>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={() => {
                stopStream();
                onClose();
              }}
              data-testid="button-close-camera"
              className="rounded-full p-1.5 text-white/70 transition hover:bg-white/10 hover:text-white"
              aria-label="Close camera preview"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Viewfinder Main Stage */}
        <div className="relative flex min-h-[300px] flex-1 items-center justify-center overflow-hidden bg-black sm:min-h-[360px]">
          {/* Live Video Feed */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            data-testid="video-camera-preview"
            className={`h-full max-h-[50dvh] w-full object-contain transition-opacity duration-300 ${
              mode === 'live' && !cameraError ? 'opacity-100' : 'hidden opacity-0'
            }`}
          />

          {/* Preset Canvas Feed */}
          <canvas
            ref={canvasRef}
            width={640}
            height={480}
            data-testid="canvas-camera-capture"
            className={`h-full max-h-[50dvh] w-full object-contain transition-opacity duration-300 ${
              mode === 'preset' || cameraError ? 'block opacity-100' : 'hidden opacity-0'
            }`}
          />

          {/* Initializing Spinner */}
          {isInitializingCamera && mode === 'live' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-white">
              <RefreshCw className="h-7 w-7 animate-spin text-[hsl(var(--accent))]" />
              <p className="gw-mono mt-3 text-xs tracking-wider text-white/80">Connecting camera sensor...</p>
            </div>
          )}

          {/* Viewfinder HUD Overlay */}
          <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-4 sm:p-5">
            {/* Top HUD Row */}
            <div className="flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-2 rounded-full border border-white/20 bg-black/45 px-3 py-1 backdrop-blur-sm">
                <span
                  className={`h-2 w-2 rounded-full ${
                    mode === 'live' && !cameraError
                      ? 'animate-pulse bg-emerald-400'
                      : 'animate-pulse bg-amber-400'
                  }`}
                />
                <span className="gw-mono font-bold tracking-wider uppercase text-white/90">
                  {mode === 'live' && !cameraError
                    ? 'Live Sensor Feed · Zone Cam'
                    : `Simulated Sensor · ${activePreset.name.split(':')[0]}`}
                </span>
              </div>

              <div className="gw-mono rounded-full border border-white/20 bg-black/45 px-2.5 py-1 text-[10px] text-white/80 backdrop-blur-sm">
                ISO 100 · 1/250s · 6500K
              </div>
            </div>

            {/* Target Reticle & Laser Sweep Frame */}
            <div className="relative mx-auto flex h-48 w-48 items-center justify-center sm:h-56 sm:w-56">
              {/* Corner Framing Brackets */}
              <div className="absolute left-0 top-0 h-6 w-6 border-l-2 border-t-2 border-[hsl(var(--accent))] shadow-[0_0_8px_hsl(var(--accent)/.6)]" />
              <div className="absolute right-0 top-0 h-6 w-6 border-r-2 border-t-2 border-[hsl(var(--accent))] shadow-[0_0_8px_hsl(var(--accent)/.6)]" />
              <div className="absolute bottom-0 left-0 h-6 w-6 border-b-2 border-l-2 border-[hsl(var(--accent))] shadow-[0_0_8px_hsl(var(--accent)/.6)]" />
              <div className="absolute bottom-0 right-0 h-6 w-6 border-b-2 border-r-2 border-[hsl(var(--accent))] shadow-[0_0_8px_hsl(var(--accent)/.6)]" />

              {/* Animated Laser Scanning Line */}
              <div className="gw-scanner-sweep pointer-events-none absolute left-0 right-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-[hsl(var(--accent))] to-transparent shadow-[0_0_12px_hsl(var(--accent))]" />

              {/* Center Focus Crosshair */}
              <div className="relative flex h-14 w-14 items-center justify-center rounded-full border border-white/30">
                <div className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--accent))] shadow-[0_0_6px_hsl(var(--accent))]" />
                <div className="absolute -left-2 h-0.5 w-1.5 bg-white/50" />
                <div className="absolute -right-2 h-0.5 w-1.5 bg-white/50" />
                <div className="absolute -top-2 h-1.5 w-0.5 bg-white/50" />
                <div className="absolute -bottom-2 h-1.5 w-0.5 bg-white/50" />
              </div>
            </div>

            {/* Bottom HUD Row */}
            <div className="flex items-end justify-between text-[10px] text-white/80">
              <div className="rounded-md bg-black/40 px-2 py-1 backdrop-blur-sm">
                <p className="gw-mono tracking-wider text-[hsl(var(--accent))] font-bold">CALIBRATED CROP TARGET</p>
                <p className="text-white/70">Align fruit inside brackets for HSV spectral grading</p>
              </div>

              {devices.length > 1 && mode === 'live' && (
                <button
                  type="button"
                  onClick={switchCamera}
                  data-testid="button-switch-camera"
                  className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-white/20 bg-black/50 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/20"
                >
                  <FlipHorizontal className="h-3.5 w-3.5" /> Flip Camera
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Camera Error / Fallback Banner */}
        {cameraError && mode === 'live' && (
          <div className="flex items-center gap-2.5 border-t border-amber-500/20 bg-amber-500/10 px-5 py-2.5 text-xs text-amber-200">
            <Info className="h-4 w-4 shrink-0 text-amber-400" />
            <span className="flex-1">{cameraError}</span>
            <button
              type="button"
              onClick={() => startCamera(selectedDeviceId)}
              className="gw-mono inline-flex items-center gap-1 rounded bg-amber-500/20 px-2 py-1 font-bold text-amber-300 hover:bg-amber-500/30"
            >
              <RefreshCw className="h-3 w-3" /> Retry
            </button>
          </div>
        )}

        {/* Preset Selector Drawer (visible in preset mode or when camera fails) */}
        {(mode === 'preset' || cameraError) && (
          <div className="border-t border-white/10 bg-white/[0.04] p-3 sm:px-6">
            <p className="gw-mono mb-2 text-[10px] font-bold uppercase tracking-[.15em] text-[hsl(var(--accent))]">
              Select Field Calibration Zone:
            </p>
            <div className="grid grid-cols-3 gap-2">
              {FIELD_PRESETS.map((preset, index) => {
                const isSelected = activePresetIndex === index;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setActivePresetIndex(index)}
                    data-testid={`button-preset-${preset.classificationTarget}`}
                    className={`flex flex-col rounded-xl border p-2.5 text-left transition ${
                      isSelected
                        ? 'border-[hsl(var(--accent))] bg-[hsl(var(--accent)/.15)] shadow-sm'
                        : 'border-white/10 bg-white/5 hover:border-white/25 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`inline-block rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider border ${preset.badgeColor}`}
                      >
                        {preset.classificationTarget}
                      </span>
                      {isSelected && <Check className="h-3.5 w-3.5 text-[hsl(var(--accent))]" />}
                    </div>
                    <p className="mt-1.5 text-xs font-bold text-white truncate">{preset.name.split(':')[1]?.trim() || preset.name}</p>
                    <p className="text-[10px] text-white/60 truncate">{preset.subtitle}</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Shutter / Capture Control Footer */}
        <div className="flex items-center justify-between border-t border-white/10 bg-[hsl(201_35%_10%)] px-5 py-4 sm:px-6">
          <div className="text-xs text-white/70">
            <span className="font-semibold text-white">Target format:</span> JPEG base64
            <span className="mx-1.5 opacity-40">·</span>
            <span className="font-semibold text-white">Analysis:</span> Jimp HSV Spectrometry
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                stopStream();
                onClose();
              }}
              data-testid="button-cancel-camera"
              className="rounded-xl px-4 py-2.5 text-xs font-semibold text-white/70 transition hover:bg-white/10 hover:text-white"
            >
              Cancel
            </button>

            {/* Main Shutter Button */}
            <button
              type="button"
              onClick={captureFrame}
              data-testid="button-capture-camera"
              className="group relative inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--accent))] px-5 py-3 text-sm font-bold text-[hsl(var(--foreground))] shadow-lg shadow-[hsl(var(--accent)/.25)] transition hover:brightness-110 active:scale-95"
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/25">
                <Camera className="h-3.5 w-3.5 text-white" />
              </span>
              <span>Capture & Analyze</span>
              <Sparkles className="h-3.5 w-3.5 opacity-70 group-hover:opacity-100" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
