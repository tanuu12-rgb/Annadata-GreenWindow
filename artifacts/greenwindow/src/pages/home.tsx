import { AnomalyCard } from '../components/anomalycard';
import { CameraPreviewModal } from '../components/camera-preview-modal';
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type CSSProperties } from 'react';
import {
  AlertCircle,
  ArrowDownRight,
  ArrowRight,
  Camera,
  Check,
  ChevronRight,
  CircleHelp,
  Clock,
  CloudSun,
  Copy,
  Droplets,
  FileImage,
  Info,
  Leaf,
  LoaderCircle,
  LockKeyhole,
  Radio,
  RefreshCw,
  Sliders,
  Sparkles,
  Sprout,
  SunMedium,
  TrendingUp,
  Upload,
  X,
  Zap,
} from 'lucide-react';
import {
  useClassifyRipeness,
  useGetCleanEnergyToday,
  useGetForecast,
  useGetSchedule,
} from '@workspace/api-client-react';
import type {
  CleanEnergyToday,
  ForecastResult,
  RipenessResult,
  ScheduleRecommendation,
} from '@workspace/api-client-react';

const SAMPLE_IMAGE = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="640" viewBox="0 0 960 640">
    <rect width="960" height="640" fill="#dfe6cf"/>
    <circle cx="780" cy="110" r="70" fill="#e9b451"/>
    <path d="M0 500 C170 390 270 520 420 420 S720 370 960 460 V640 H0Z" fill="#6f9271"/>
    <path d="M0 550 C160 470 300 590 480 490 S750 450 960 520 V640 H0Z" fill="#426c62"/>
    <ellipse cx="510" cy="310" rx="92" ry="74" fill="#d98147"/>
    <path d="M450 300 C445 182 560 170 602 250 C544 236 495 263 450 300Z" fill="#43775f"/>
    <path d="M478 248 C510 177 590 196 616 246" fill="none" stroke="#28584e" stroke-width="16" stroke-linecap="round"/>
  </svg>`,
)}`;

type LinePoint = { x: number; y: number };

function formatDate(value?: string) {
  if (!value) return 'Today';
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });
}

function formatHour(hour: number) {
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const normalized = hour % 12 || 12;
  return `${normalized} ${suffix}`;
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-neutral-200/70 ${className}`} />;
}

function ErrorState({ label, retry }: { label: string; retry: () => void }) {
  return (
    <div className="flex min-h-[110px] items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50/60 px-4 py-3 text-sm text-red-800">
      <div className="flex items-center gap-3">
        <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
        <span>{label} is temporarily unavailable.</span>
      </div>
      <button
        type="button"
        onClick={retry}
        data-testid={`button-retry-${label.toLowerCase().replaceAll(' ', '-')}`}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 shadow-sm transition hover:bg-red-50"
      >
        <RefreshCw className="h-3.5 w-3.5" /> Retry
      </button>
    </div>
  );
}

function CleanEnergyChart({
  data,
  currentHour,
  startHour,
  endHour,
}: {
  data: CleanEnergyToday;
  currentHour: number;
  startHour?: number | null;
  endHour?: number | null;
}) {
  const width = 760;
  const height = 200;
  const padX = 32;
  const padY = 24;
  const values = data.curve.map((point) => point.clean_pct);
  const points: LinePoint[] = data.curve.map((point, index) => ({
    x: padX + (index / Math.max(data.curve.length - 1, 1)) * (width - padX * 2),
    y: height - padY - (point.clean_pct / 100) * (height - padY * 2),
  }));
  const line = points.map((point) => `${point.x},${point.y}`).join(' ');
  const area = `${padX},${height - padY} ${line} ${width - padX},${height - padY}`;
  const peak = Math.max(...values);
  const peakHour = data.curve[values.indexOf(peak)]?.hour ?? 12;

  // Compute recommended window overlay coordinates if provided
  let windowBox: { x1: number; x2: number } | null = null;
  if (startHour != null && endHour != null && startHour >= 0 && endHour <= 24) {
    const x1 = padX + (startHour / 23) * (width - padX * 2);
    const x2 = padX + (Math.min(endHour, 23) / 23) * (width - padX * 2);
    windowBox = { x1, x2 };
  }

  return (
    <div className="relative mt-3">
      <svg
        viewBox={`0 0 ${width} ${height + 22}`}
        className="h-auto w-full overflow-visible"
        role="img"
        aria-label="Today's clean energy curve"
      >
        <defs>
          <linearGradient id="cleanEnergyGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.32" />
            <stop offset="70%" stopColor="#10b981" stopOpacity="0.06" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="windowGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#059669" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#059669" stopOpacity="0.04" />
          </linearGradient>
        </defs>

        {/* Horizontal grid guide lines */}
        {[25, 50, 75].map((mark) => {
          const y = height - padY - (mark / 100) * (height - padY * 2);
          return (
            <g key={mark}>
              <line
                x1={padX}
                x2={width - padX}
                y1={y}
                y2={y}
                stroke="#e5e5e5"
                strokeDasharray="3 4"
                strokeWidth="1"
              />
              <text
                x={padX - 8}
                y={y + 3.5}
                textAnchor="end"
                fill="#a3a3a3"
                fontSize="10"
                className="gw-mono font-medium"
              >
                {mark}%
              </text>
            </g>
          );
        })}

        {/* Clean Energy Area Fill */}
        <polygon points={area} fill="url(#cleanEnergyGrad)" />

        {/* Recommended Irrigation Window Shading Band */}
        {windowBox && (
          <g>
            <rect
              x={windowBox.x1}
              y={padY}
              width={Math.max(windowBox.x2 - windowBox.x1, 16)}
              height={height - padY * 2}
              fill="url(#windowGrad)"
              rx="6"
            />
            <rect
              x={windowBox.x1}
              y={padY}
              width={Math.max(windowBox.x2 - windowBox.x1, 16)}
              height={height - padY * 2}
              fill="none"
              stroke="#059669"
              strokeWidth="1.5"
              strokeDasharray="4 4"
              rx="6"
            />
            <text
              x={(windowBox.x1 + windowBox.x2) / 2}
              y={padY - 8}
              textAnchor="middle"
              fill="#059669"
              fontSize="10"
              className="gw-mono font-bold"
            >
              ★ RECOMMENDED WINDOW
            </text>
          </g>
        )}

        {/* Clean Energy Primary Curve Line */}
        <polyline
          points={line}
          fill="none"
          stroke="#059669"
          strokeWidth="2.75"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Hourly node points */}
        {data.curve.map((point, index) => {
          if (index % 3 !== 0 && point.hour !== currentHour) return null;
          const item = points[index];
          const isCurrent = point.hour === currentHour;
          return (
            <g key={point.hour}>
              {isCurrent && (
                <>
                  <line
                    x1={item.x}
                    x2={item.x}
                    y1={padY}
                    y2={height - padY}
                    stroke="#10b981"
                    strokeWidth="1.5"
                    strokeDasharray="2 2"
                  />
                  <circle cx={item.x} cy={item.y} r="10" fill="#10b981" opacity="0.25" className="animate-ping" />
                  <circle cx={item.x} cy={item.y} r="6" fill="#10b981" stroke="#ffffff" strokeWidth="2.5" />
                </>
              )}
              {!isCurrent && (
                <circle cx={item.x} cy={item.y} r="3.5" fill="#059669" stroke="#ffffff" strokeWidth="1.5" />
              )}
            </g>
          );
        })}

        {/* Time X-Axis labels */}
        {data.curve
          .filter((point) => point.hour % 4 === 0)
          .map((point) => {
            const index = data.curve.findIndex((item) => item.hour === point.hour);
            return (
              <text
                key={point.hour}
                x={points[index].x}
                y={height + 15}
                textAnchor="middle"
                fill="#737373"
                fontSize="11"
                className="gw-mono font-medium"
              >
                {point.label}
              </text>
            );
          })}
      </svg>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-neutral-500 border-t border-neutral-100 pt-2.5">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-600" /> Modelled clean generation (solar + wind)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm border border-emerald-600 bg-emerald-50" /> Recommended pumping window
          </span>
        </div>
        <div className="flex items-center gap-1.5 font-medium text-neutral-700">
          <Sparkles className="h-3.5 w-3.5 text-amber-500" />
          <span>Peak {peak}% clean energy at {formatHour(peakHour)}</span>
        </div>
      </div>
    </div>
  );
}

function ForecastChart({ data }: { data: ForecastResult }) {
  const width = 720;
  const height = 150;
  const padX = 24;
  const padY = 16;
  const all = [...data.predicted_curve, ...data.actual_curve];
  const max = Math.max(...all, 1);
  const pointSet = (values: number[]) =>
    values.map((value, index) => ({
      x: padX + (index / 23) * (width - padX * 2),
      y: height - padY - (value / max) * (height - padY * 2),
    }));
  const predicted = pointSet(data.predicted_curve);
  const actual = pointSet(data.actual_curve);

  return (
    <div>
      <svg
        viewBox={`0 0 ${width} ${height + 20}`}
        className="mt-3 h-auto w-full"
        role="img"
        aria-label="Forecast compared with actual clean energy"
      >
        {[0, 1, 2].map((line) => (
          <line
            key={line}
            x1={padX}
            x2={width - padX}
            y1={padY + line * ((height - padY * 2) / 2)}
            y2={padY + line * ((height - padY * 2) / 2)}
            stroke="#f0f0f0"
            strokeDasharray="3 4"
          />
        ))}
        {/* Actual curve */}
        <polyline
          points={actual.map((p) => `${p.x},${p.y}`).join(' ')}
          fill="none"
          stroke="#f59e0b"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {/* Predicted curve */}
        <polyline
          points={predicted.map((p) => `${p.x},${p.y}`).join(' ')}
          fill="none"
          stroke="#059669"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          strokeDasharray="5 5"
        />
        {[0, 6, 12, 18, 23].map((hour) => (
          <text
            key={hour}
            x={actual[hour].x}
            y={height + 14}
            textAnchor="middle"
            fill="#a3a3a3"
            fontSize="10"
            className="gw-mono"
          >
            {formatHour(hour)}
          </text>
        ))}
      </svg>

      <div className="mt-2 flex items-center justify-between text-xs text-neutral-500">
        <div className="flex gap-4">
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 bg-emerald-600" /> Model prediction
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 bg-amber-500" /> Observed benchmark
          </span>
        </div>
        <span className="text-neutral-400">Seasonal baseline · hour smoothing</span>
      </div>
    </div>
  );
}

function Modal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="gw-modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="how-it-works-title"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default bg-transparent"
        onClick={onClose}
        aria-label="Close modal backdrop"
        data-testid="button-close-modal-backdrop"
      />
      <div className="gw-modal-panel relative z-10 max-h-[90dvh] w-full max-w-xl overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl sm:p-8">
        <button
          type="button"
          onClick={onClose}
          data-testid="button-close-how-it-works"
          className="absolute right-5 top-5 rounded-full p-1.5 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-6 pr-6">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
            <Sparkles className="h-3 w-3 text-emerald-600" /> Decision Architecture
          </span>
          <h2 id="how-it-works-title" className="mt-2 text-2xl font-bold tracking-tight text-neutral-900">
            One decision, three signals.
          </h2>
          <p className="mt-2 text-sm text-neutral-600 leading-relaxed">
            GreenWindow synthesizes renewable grid availability, real-time soil thirst, and harvest condition to pinpoint the exact pump schedule before irrigation commences.
          </p>
        </div>

        <div className="space-y-3">
          {[
            {
              icon: SunMedium,
              number: '01',
              title: 'Clean Grid Fuel-Mix Telemetry',
              copy: 'We monitor the India Energy Atlas modeled diurnal clean energy curve to detect solar and wind generation surges.',
            },
            {
              icon: Droplets,
              number: '02',
              title: 'Field Root-Zone Moisture Read',
              copy: 'Soil moisture is continuously compared against your crop threshold (34%). The pump remains idle if moisture is sufficient.',
            },
            {
              icon: Zap,
              number: '03',
              title: 'Optimal Window Optimization',
              copy: 'When watering is required, GreenWindow automatically selects the cleanest contiguous hour block, maximizing CO₂ and kWh savings.',
            },
          ].map(({ icon: Icon, number, title, copy }) => (
            <div
              key={number}
              className="flex gap-4 rounded-xl border border-neutral-200/90 bg-neutral-50/70 p-4 transition hover:bg-neutral-50"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-sm">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="gw-mono text-[10px] font-bold text-emerald-700">{number} · STEP</p>
                <h3 className="text-sm font-semibold text-neutral-900">{title}</h3>
                <p className="mt-1 text-xs leading-5 text-neutral-600">{copy}</p>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={onClose}
          data-testid="button-got-it"
          className="mt-6 flex w-full items-center justify-center rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-neutral-800"
        >
          Got it, back to dashboard
        </button>
      </div>
    </div>
  );
}

function RipenessCard() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string>();
  const [fileName, setFileName] = useState('');
  const [result, setResult] = useState<RipenessResult>();
  const [copied, setCopied] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const classify = useClassifyRipeness();

  const submit = (imageData: string, imageName: string) => {
    setPreview(imageData);
    setFileName(imageName);
    classify.mutate(
      { data: { image_data: imageData, image_name: imageName } },
      { onSuccess: (value) => setResult(value) },
    );
  };

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => submit(String(reader.result), file.name);
    reader.readAsDataURL(file);
  };

  const copyResult = async () => {
    if (!result) return;
    await navigator.clipboard?.writeText(
      `Crop check: ${result.classification}. Cooling: ${result.cooling_state}. ${result.confidence_note}`,
    );
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <section className="gw-card p-6" data-testid="card-ripeness">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="gw-mono text-[10px] font-bold uppercase tracking-wider text-emerald-700">
              06 / CROP TELEMETRY
            </span>
            <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
              Optical HSV
            </span>
          </div>
          <h2 className="mt-1 text-lg font-bold text-neutral-900">Ripeness Desk & Field Camera</h2>
          <p className="mt-0.5 text-xs text-neutral-500">
            Instant optical spectrometry check before scheduling harvest rounds or storage cooling.
          </p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-2 text-neutral-600">
          <Leaf className="h-5 w-5 text-emerald-600" />
        </div>
      </div>

      <div className="mt-5 grid gap-5 sm:grid-cols-[140px_1fr]">
        <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100 shadow-inner">
          {preview ? (
            <img
              src={preview}
              alt="Selected crop sample"
              className="h-full w-full object-cover"
              data-testid="img-ripeness-preview"
            />
          ) : (
            <div className="flex flex-col items-center gap-1.5 text-neutral-400">
              <FileImage className="h-8 w-8 text-neutral-400" />
              <span className="text-[10px] font-medium text-neutral-500">No Image</span>
            </div>
          )}
          {classify.isPending && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white backdrop-blur-xs">
              <LoaderCircle className="h-7 w-7 animate-spin text-emerald-400" />
            </div>
          )}
        </div>

        <div className="flex flex-col justify-center">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={onFileChange}
            className="hidden"
            data-testid="input-ripeness-file"
          />

          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              data-testid="button-upload-ripeness"
              className="inline-flex items-center gap-2 rounded-xl bg-neutral-900 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-neutral-800"
            >
              <Upload className="h-3.5 w-3.5" /> Upload photo
            </button>

            <button
              type="button"
              onClick={() => setIsCameraOpen(true)}
              data-testid="button-use-ripeness-sample"
              className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-xs font-semibold text-neutral-800 shadow-sm transition hover:bg-neutral-50 hover:border-neutral-300"
            >
              <Camera className="h-3.5 w-3.5 text-emerald-600" /> Use field sample
            </button>
          </div>

          <p className="mt-2 text-[11px] text-neutral-500">
            {fileName || 'Live WebCam capture, camera preview, or JPG/PNG upload.'}
          </p>
        </div>
      </div>

      {classify.isError && (
        <p className="mt-4 flex items-center gap-2 text-xs font-medium text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">
          <AlertCircle className="h-4 w-4 shrink-0" /> Could not classify that image. Try a clearer crop photo.
        </p>
      )}

      {result && (
        <div
          className="mt-5 rounded-xl border border-neutral-200 bg-neutral-50/80 p-4.5"
          data-testid="status-ripeness-result"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="gw-mono text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                Spectrometry Result
              </p>
              <p className="mt-0.5 text-lg font-bold capitalize text-neutral-900">{result.classification}</p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider border ${
                result.cooling_state === 'full'
                  ? 'border-amber-300 bg-amber-50 text-amber-800'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-800'
              }`}
            >
              Cooling requirement: {result.cooling_state}
            </span>
          </div>

          <p className="mt-2 text-xs text-neutral-600 leading-relaxed">{result.confidence_note}</p>

          <div className="mt-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 mb-2">
              Color Channel Distribution
            </p>
            <div className="flex items-end gap-3">
              {Object.entries(result.color_metrics).map(([key, value]) => (
                <div key={key} className="flex-1">
                  <div className="mb-1 flex justify-between text-[11px] font-medium text-neutral-600">
                    <span className="capitalize">{key.replace('_score', '')}</span>
                    <span className="gw-mono">{Math.round(value * 100)}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-neutral-200">
                    <div
                      className={`h-full rounded-full ${
                        key === 'green_score'
                          ? 'bg-emerald-500'
                          : key === 'ripe_score'
                          ? 'bg-red-500'
                          : 'bg-neutral-800'
                      }`}
                      style={{ width: `${Math.min(value * 100, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={copyResult}
            data-testid="button-copy-ripeness"
            className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copied to clipboard' : 'Copy field note'}
          </button>
        </div>
      )}

      <CameraPreviewModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={(imageData, imageName) => {
          submit(imageData, imageName);
        }}
      />
    </section>
  );
}

function Home() {
  const [soilMoisture, setSoilMoisture] = useState(38);
  const [showHow, setShowHow] = useState(false);
  const [alertCopied, setAlertCopied] = useState(false);

  // Simulated root-zone decay loop
  useEffect(() => {
    const TICK_MS = 4000;
    const interval = window.setInterval(() => {
      setSoilMoisture((value) => {
        const hour = new Date().getHours();
        const inCleanWindow = hour >= 12 && hour < 15;
        const isThirsty = value <= 34;

        if (isThirsty && inCleanWindow) {
          return Math.min(100, Math.round(value + 12 + Math.random() * 6));
        }

        const heatFactor = hour >= 10 && hour <= 16 ? 1.6 : 1;
        const drift = (0.6 + Math.random() * 0.6) * heatFactor;
        return Math.max(0, Math.round(value - drift));
      });
    }, TICK_MS);
    return () => window.clearInterval(interval);
  }, []);

  const energy = useGetCleanEnergyToday();
  const forecast = useGetForecast();
  const scheduleParams = useMemo(() => ({ soil_moisture: soilMoisture, crop_threshold: 34 }), [soilMoisture]);
  const schedule = useGetSchedule(scheduleParams);
  const scheduleValue = schedule.data as ScheduleRecommendation | undefined;
  const energyValue = energy.data as CleanEnergyToday | undefined;
  const forecastValue = forecast.data as ForecastResult | undefined;

  const needsWater = scheduleValue?.start_label != null;
  const liveStart = scheduleValue?.start_label ?? null;
  const liveEnd = scheduleValue?.end_label ?? null;
  const liveReason = scheduleValue?.reason ?? 'Analyzing real-time soil telemetry and energy curves\u2026';
  const alertText = needsWater
    ? `GreenWindow: irrigate ${liveStart}\u2013${liveEnd}. Soil moisture is ${soilMoisture}%. ${liveReason}`
    : `GreenWindow: no irrigation needed right now. Soil moisture is ${soilMoisture}%. ${liveReason}`;

  const copyAlert = async () => {
    await navigator.clipboard?.writeText(alertText);
    setAlertCopied(true);
    window.setTimeout(() => setAlertCopied(false), 1800);
  };

  const currentHourCleanPct =
    energyValue?.curve.find((p) => p.hour === energyValue?.current_hour)?.clean_pct ?? 74;

  return (
    <div className="min-h-screen bg-neutral-50/70 text-neutral-900 font-sans antialiased">
      {/* Sleek Base-Nova Sticky Header */}
      <header className="sticky top-0 z-40 border-b border-neutral-200/80 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3" data-testid="brand-greenwindow">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-900 text-white shadow-sm">
              <Sprout className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold tracking-tight text-neutral-900">GreenWindow</span>
                <span className="rounded-md border border-emerald-500/25 bg-emerald-500/10 px-1.5 py-0.2 text-[10px] font-semibold text-emerald-700">
                  Telemetry v2.4
                </span>
              </div>
              <p className="text-[11px] text-neutral-500">Clean-Energy Irrigation Scheduling Desk</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Live Model Indicator */}
            <div className="hidden items-center gap-2 rounded-full border border-emerald-200/80 bg-emerald-50/80 px-3 py-1 text-xs font-medium text-emerald-800 sm:flex">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>India Energy Atlas Model Active</span>
            </div>

            {/* Date Indicator */}
            <div className="hidden items-center gap-1.5 rounded-lg border border-neutral-200 bg-neutral-100/70 px-2.5 py-1 text-xs font-medium text-neutral-600 md:flex">
              <Clock className="h-3.5 w-3.5 text-neutral-500" />
              <span>{formatDate(energyValue?.date)}</span>
            </div>

            {/* How It Works Button */}
            <button
              type="button"
              onClick={() => setShowHow(true)}
              data-testid="button-how-it-works"
              className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-neutral-700 shadow-xs transition hover:bg-neutral-50 hover:text-neutral-900"
            >
              <CircleHelp className="h-3.5 w-3.5 text-emerald-600" />
              <span>How it works</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Top Hero / Status Bar */}
        <section className="mb-6 rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-xs">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                <span>DECISION TELEMETRY CONSOLE</span>
              </div>
              <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900">
                Smart irrigation scheduled for clean grid hours.
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-neutral-500 max-w-2xl leading-relaxed">
                Recommending contiguous pumping windows based on clean energy fuel-mix patterns and root-zone soil thirst.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-3.5 py-2">
                <p className="gw-mono text-[9px] font-bold uppercase tracking-wider text-neutral-500">Current Hour</p>
                <p className="mt-0.5 text-base font-bold text-neutral-900" data-testid="text-current-hour">
                  {energyValue ? formatHour(energyValue.current_hour) : '—'}
                </p>
              </div>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2">
                <p className="gw-mono text-[9px] font-bold uppercase tracking-wider text-emerald-800">System Status</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-base font-bold text-emerald-700">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  Live Sync
                </p>
              </div>
            </div>
          </div>

          {/* 4 Stat Overview Cards */}
          <div className="mt-6 grid grid-cols-2 gap-3.5 lg:grid-cols-4 border-t border-neutral-100 pt-5">
            <div className="rounded-xl border border-neutral-200/60 bg-neutral-50/70 p-3.5">
              <p className="gw-mono text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                Clean Supply Share
              </p>
              <p className="mt-1 text-2xl font-bold text-neutral-900">{currentHourCleanPct}%</p>
              <p className="mt-0.5 text-[11px] text-emerald-700 font-medium">Solar & wind active</p>
            </div>

            <div className="rounded-xl border border-neutral-200/60 bg-neutral-50/70 p-3.5">
              <p className="gw-mono text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                Field Soil Moisture
              </p>
              <p className="mt-1 text-2xl font-bold text-neutral-900">{soilMoisture}%</p>
              <p
                className={`mt-0.5 text-[11px] font-medium ${
                  soilMoisture <= 34 ? 'text-amber-600' : 'text-emerald-700'
                }`}
              >
                {soilMoisture <= 34 ? 'Thirsty (≤34%)' : 'Holding well'}
              </p>
            </div>

            <div className="rounded-xl border border-neutral-200/60 bg-neutral-50/70 p-3.5">
              <p className="gw-mono text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                Irrigation Window
              </p>
              <p className="mt-1 text-xl font-bold text-neutral-900 truncate">
                {needsWater ? `${liveStart}–${liveEnd}` : 'Holding'}
              </p>
              <p className="mt-0.5 text-[11px] text-neutral-500 font-medium">
                {needsWater ? `${scheduleValue?.duration_hours}h optimized block` : 'Pump idle'}
              </p>
            </div>

            <div className="rounded-xl border border-neutral-200/60 bg-neutral-50/70 p-3.5">
              <p className="gw-mono text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                CO₂ Avoided Today
              </p>
              <p className="mt-1 text-2xl font-bold text-emerald-700">
                {scheduleValue?.co2_avoided_kg ?? 0} <span className="text-xs font-semibold text-neutral-500">kg</span>
              </p>
              <p className="mt-0.5 text-[11px] text-neutral-500 font-medium">
                {scheduleValue?.kwh_saved ?? 0} kWh saved vs baseline
              </p>
            </div>
          </div>
        </section>

        {/* Core Decision Grid */}
        <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
          {/* Section 01: Soil Moisture Control */}
          <section className="gw-card p-6" data-testid="card-soil-control">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <span className="gw-mono text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                  01 / ROOT-ZONE FIELD TELEMETRY
                </span>
                <h2 className="mt-1 text-xl font-bold text-neutral-900">How thirsty is the field?</h2>
                <p className="mt-0.5 text-xs text-neutral-500">
                  Adjust simulated soil moisture reading or test crop threshold reactions.
                </p>
              </div>

              <div className="flex items-center gap-1.5 rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs font-semibold text-neutral-700">
                <Droplets className="h-3.5 w-3.5 text-emerald-600" />
                <span>Crop Threshold: 34%</span>
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-neutral-200/90 bg-neutral-50/80 p-6">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <div className="flex items-baseline">
                    <span
                      className="text-5xl font-extrabold tracking-tight text-neutral-900"
                      data-testid="text-soil-moisture"
                    >
                      {soilMoisture}
                    </span>
                    <span className="ml-1 text-2xl font-bold text-neutral-400">%</span>
                  </div>
                  <div className="mt-2">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
                        soilMoisture <= 34
                          ? 'border-amber-300 bg-amber-50 text-amber-800'
                          : 'border-emerald-300 bg-emerald-50 text-emerald-800'
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          soilMoisture <= 34 ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                      />
                      {soilMoisture <= 34 ? 'Thirsty — Below 34% threshold' : 'Optimal Moisture — Above 34% threshold'}
                    </span>
                  </div>
                </div>

                <div className="hidden sm:block text-right">
                  <p className="gw-mono text-[10px] uppercase tracking-wider text-neutral-400 font-semibold">
                    Telemetry Node
                  </p>
                  <p className="text-xs font-bold text-neutral-700 mt-0.5">NW-04 · North Plot</p>
                  <p className="text-[11px] text-neutral-500">Rice / Paddy Field</p>
                </div>
              </div>

              {/* Slider Component */}
              <div className="mt-6">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={soilMoisture}
                  onChange={(event) => setSoilMoisture(Number(event.target.value))}
                  style={{ '--slider-progress': `${soilMoisture}%` } as CSSProperties}
                  className="gw-slider w-full"
                  data-testid="input-soil-moisture"
                  aria-label="Soil moisture percentage"
                />

                <div className="mt-2.5 flex justify-between text-[11px] font-semibold text-neutral-400 gw-mono">
                  <span>0% (Parched)</span>
                  <span className="text-emerald-700">34% Threshold</span>
                  <span>100% (Saturated)</span>
                </div>
              </div>

              {/* Quick Preset Buttons for Testing */}
              <div className="mt-5 border-t border-neutral-200 pt-4">
                <p className="text-[11px] font-semibold text-neutral-500 mb-2">Simulate field condition:</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: 'Dry Field (22%)', val: 22 },
                    { label: 'At Threshold (33%)', val: 33 },
                    { label: 'Moist (45%)', val: 45 },
                    { label: 'Well Watered (68%)', val: 68 },
                  ].map((preset) => (
                    <button
                      key={preset.val}
                      type="button"
                      onClick={() => setSoilMoisture(preset.val)}
                      className={`rounded-lg px-2.5 py-1 text-xs font-medium border transition ${
                        soilMoisture === preset.val
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-700 font-bold'
                          : 'border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2 text-xs text-neutral-500">
              <LockKeyhole className="h-3.5 w-3.5 text-emerald-600" />
              <span>Hardware-ready simulated signal with manual slider override.</span>
            </div>
          </section>

          {/* Section 02: Recommended Window (Hero Dark Neutral Card) */}
          <section
            className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6 text-white shadow-md relative overflow-hidden flex flex-col justify-between"
            data-testid="card-recommendation"
          >
            {/* Ambient emerald glow */}
            <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-emerald-500/15 blur-3xl" />

            <div>
              <div className="flex items-start justify-between">
                <div>
                  <span className="gw-mono text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                    02 / DECISION ENGINE
                  </span>
                  <h2 className="mt-1 text-xl font-bold text-white">Your Irrigation Window</h2>
                </div>
                <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-2 text-emerald-400">
                  <Zap className="h-5 w-5" />
                </div>
              </div>

              {schedule.isLoading && !scheduleValue ? (
                <div className="mt-8 space-y-3">
                  <Skeleton className="h-16 bg-neutral-800" />
                  <Skeleton className="h-5 w-4/5 bg-neutral-800" />
                </div>
              ) : schedule.isError ? (
                <div className="mt-6 rounded-xl border border-red-900/50 bg-red-950/40 p-4 text-xs text-red-200">
                  Could not compute schedule.
                  <button
                    type="button"
                    onClick={() => schedule.refetch()}
                    data-testid="button-retry-schedule"
                    className="ml-2 font-bold underline text-white"
                  >
                    Retry
                  </button>
                </div>
              ) : (
                <>
                  {needsWater ? (
                    <div className="mt-6">
                      <div className="flex items-center gap-3">
                        <span
                          className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white"
                          data-testid="text-irrigation-window"
                        >
                          {liveStart}
                        </span>
                        <ChevronRight className="h-6 w-6 text-emerald-400" />
                        <span className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white">
                          {liveEnd}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-xs font-semibold text-emerald-300 border border-emerald-500/30">
                          {scheduleValue?.duration_hours}h Contiguous Run
                        </span>
                        <span className="text-xs text-neutral-400">Optimal clean power peak</span>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-6">
                      <p
                        className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-300"
                        data-testid="text-irrigation-window"
                      >
                        Holding — No watering needed
                      </p>
                      <p className="mt-2 text-xs text-emerald-400 font-semibold">
                        Field moisture is above threshold. Saving pump energy.
                      </p>
                    </div>
                  )}

                  {/* Decision Explanation Box */}
                  <div
                    className="mt-5 rounded-xl border border-neutral-800 bg-neutral-900/80 p-4 text-xs text-neutral-300 leading-relaxed"
                    data-testid="text-recommendation-reason"
                  >
                    <div className="flex items-center gap-1.5 text-emerald-400 font-semibold mb-1">
                      <Info className="h-3.5 w-3.5" />
                      <span>Decision Rationale</span>
                    </div>
                    {liveReason}
                  </div>
                </>
              )}
            </div>

            {/* Savings Footnote Bar */}
            <div className="mt-6 grid grid-cols-2 gap-3 border-t border-neutral-800/80 pt-4">
              <div>
                <p className="gw-mono text-[9px] uppercase tracking-wider text-neutral-400 font-semibold">
                  Clean Energy Saved
                </p>
                <p className="mt-1 text-xl font-bold text-white">
                  {scheduleValue?.kwh_saved ?? '—'} <span className="text-xs font-medium text-neutral-400">kWh</span>
                </p>
              </div>

              <div>
                <p className="gw-mono text-[9px] uppercase tracking-wider text-neutral-400 font-semibold">
                  CO₂ Emissions Avoided
                </p>
                <p className="mt-1 text-xl font-bold text-emerald-400">
                  {scheduleValue?.co2_avoided_kg ?? '—'} <span className="text-xs font-medium text-neutral-400">kg</span>
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* Section 03: 24-Hour Clean Energy Timeline (Full Width) */}
        <section className="gw-card mt-6 p-6" data-testid="card-clean-energy">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <span className="gw-mono text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                03 / CLEAN SUPPLY TIMELINE
              </span>
              <h2 className="mt-1 text-xl font-bold text-neutral-900">Today’s 24-Hour Clean Energy Curve</h2>
            </div>
            <p className="max-w-md text-right text-xs leading-5 text-neutral-500">
              {energyValue?.source_note ?? 'Modeled from published India Energy Atlas fuel-mix patterns.'}
            </p>
          </div>

          {energy.isLoading ? (
            <Skeleton className="mt-6 h-56" />
          ) : energy.isError || !energyValue ? (
            <div className="mt-5">
              <ErrorState label="Clean energy timeline" retry={() => energy.refetch()} />
            </div>
          ) : (
            <CleanEnergyChart
              data={energyValue}
              currentHour={energyValue.current_hour}
              startHour={scheduleValue?.start_hour}
              endHour={scheduleValue?.end_hour}
            />
          )}
        </section>

        {/* Two-Column Utility Grid (Alert & Forecast) */}
        <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          {/* Section 04: Ground Dispatch / Farmer Alert */}
          <section className="gw-card p-6" data-testid="card-alert">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="gw-mono text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                  04 / GROUND DISPATCH
                </span>
                <h2 className="mt-1 text-lg font-bold text-neutral-900">Farmer Alert Dispatch</h2>
                <p className="mt-0.5 text-xs text-neutral-500">Bilingual ready-to-send field SMS & WhatsApp notice.</p>
              </div>
              <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-2 text-neutral-600">
                <CloudSun className="h-5 w-5 text-amber-500" />
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-neutral-200 bg-neutral-50/70 p-4.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-neutral-700">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white">
                    <Sprout className="h-3 w-3" />
                  </span>
                  <span>Field Telegram · North Plot</span>
                </div>
                <span className="rounded-md border border-neutral-200 bg-white px-2 py-0.5 text-[10px] font-medium text-neutral-500">
                  SMS / WhatsApp Ready
                </span>
              </div>

              {/* English text */}
              <div className="mt-3 rounded-lg border border-neutral-200 bg-white p-3 text-xs text-neutral-800 leading-relaxed font-mono">
                <p data-testid="text-alert-preview">{alertText}</p>
              </div>

              {/* Hindi / Regional Translation */}
              <div className="mt-2.5 border-l-2 border-emerald-600 bg-emerald-50/60 pl-3 py-2 text-xs text-neutral-700 leading-relaxed rounded-r-lg">
                <p className="font-semibold text-emerald-900">
                  {needsWater
                    ? `सिंचाई का सही समय: ${liveStart}–${liveEnd}. मिट्टी की नमी ${soilMoisture}% है। स्वच्छ ऊर्जा का उपयोग करें।`
                    : `अभी सिंचाई की जरूरत नहीं है। मिट्टी की नमी ${soilMoisture}% है।`}
                </p>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-neutral-200 pt-3 text-xs text-neutral-500">
                <span>Automated from live telemetry</span>
                <button
                  type="button"
                  onClick={copyAlert}
                  data-testid="button-copy-alert"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 font-semibold text-emerald-700 shadow-xs hover:bg-neutral-50 hover:text-emerald-800 transition"
                >
                  {alertCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {alertCopied ? 'Copied to Clipboard' : 'Copy Notice'}
                </button>
              </div>
            </div>
          </section>

          {/* Section 05: Forecast Accuracy */}
          <section className="gw-card p-6" data-testid="card-forecast">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="gw-mono text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                  05 / MODEL CHECK
                </span>
                <h2 className="mt-1 text-lg font-bold text-neutral-900">Forecast Accuracy</h2>
                <p className="mt-0.5 text-xs text-neutral-500">Tomorrow’s predicted clean curve vs holdout benchmark.</p>
              </div>

              <div className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                <ArrowDownRight className="h-3.5 w-3.5" />
                <span>{forecastValue ? `${forecastValue.mape}% MAPE` : '—'}</span>
              </div>
            </div>

            {forecast.isLoading ? (
              <Skeleton className="mt-5 h-44" />
            ) : forecast.isError || !forecastValue ? (
              <div className="mt-5">
                <ErrorState label="Forecast" retry={() => forecast.refetch()} />
              </div>
            ) : (
              <>
                <ForecastChart data={forecastValue} />
                <div className="mt-4 flex items-center justify-between border-t border-neutral-100 pt-3 text-xs text-neutral-500">
                  <span>{forecastValue.model_used}</span>
                  <span className="rounded bg-neutral-100 px-2 py-0.5 font-medium text-neutral-700">
                    Directionally Reliable
                  </span>
                </div>
              </>
            )}
          </section>
        </div>

        {/* Section 06: Ripeness Desk with Camera Preview */}
        <div className="mt-6">
          <RipenessCard />
        </div>

        {/* Section 07: Pump Health & Anomaly Check */}
        <div className="mt-6">
          <AnomalyCard />
        </div>

        {/* Footer */}
        <footer className="mt-12 flex flex-col justify-between gap-3 border-t border-neutral-200 py-6 text-xs text-neutral-500 sm:flex-row sm:items-center">
          <span className="flex items-center gap-2 font-medium">
            <Sprout className="h-4 w-4 text-emerald-600" /> GreenWindow · Precision Irrigation Decision Engine
          </span>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> Modeled grid telemetry
            </span>
            <span>Refreshes dynamically</span>
          </div>
        </footer>
      </main>

      {showHow && <Modal onClose={() => setShowHow(false)} />}
    </div>
  );
}

export default Home;