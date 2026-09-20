import { useEffect, useMemo, useRef, useState, type ChangeEvent, type CSSProperties } from 'react';
import {
  AlertCircle,
  ArrowDownRight,
  Check,
  ChevronRight,
  CircleHelp,
  CloudSun,
  Copy,
  Droplets,
  FileImage,
  Leaf,
  LoaderCircle,
  LockKeyhole,
  RefreshCw,
  Sprout,
  SunMedium,
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
    : date.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' });
}

function formatHour(hour: number) {
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const normalized = hour % 12 || 12;
  return `${normalized} ${suffix}`;
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-[hsl(var(--muted))] ${className}`} />;
}

function ErrorState({ label, retry }: { label: string; retry: () => void }) {
  return (
    <div className="flex min-h-[110px] items-center justify-between gap-4 rounded-xl border border-[hsl(var(--destructive)/.22)] bg-[hsl(var(--destructive)/.05)] px-4 py-3 text-sm">
      <div className="flex items-center gap-3 text-[hsl(var(--destructive))]">
        <AlertCircle className="h-4 w-4 shrink-0" />
        <span>{label} is not available right now.</span>
      </div>
      <button
        type="button"
        onClick={retry}
        data-testid={`button-retry-${label.toLowerCase().replaceAll(' ', '-')}`}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[hsl(var(--destructive)/.25)] px-3 py-1.5 text-xs font-semibold text-[hsl(var(--destructive))] transition hover:bg-[hsl(var(--destructive)/.08)]"
      >
        <RefreshCw className="h-3.5 w-3.5" /> Retry
      </button>
    </div>
  );
}

function CleanEnergyChart({ data, currentHour }: { data: CleanEnergyToday; currentHour: number }) {
  const width = 720;
  const height = 190;
  const padX = 30;
  const padY = 20;
  const values = data.curve.map((point) => point.clean_pct);
  const points: LinePoint[] = data.curve.map((point, index) => ({
    x: padX + (index / Math.max(data.curve.length - 1, 1)) * (width - padX * 2),
    y: height - padY - (point.clean_pct / 100) * (height - padY * 2),
  }));
  const line = points.map((point) => `${point.x},${point.y}`).join(' ');
  const area = `${padX},${height - padY} ${line} ${width - padX},${height - padY}`;
  const peak = Math.max(...values);

  return (
    <div className="relative mt-4">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full overflow-visible" role="img" aria-label="Today's clean energy curve">
        {[25, 50, 75].map((mark) => {
          const y = height - padY - (mark / 100) * (height - padY * 2);
          return (
            <g key={mark}>
              <line x1={padX} x2={width - padX} y1={y} y2={y} stroke="hsl(var(--border))" strokeDasharray="2 8" />
              <text x="0" y={y + 4} fill="hsl(var(--muted-foreground))" fontSize="10" className="gw-mono">{mark}%</text>
            </g>
          );
        })}
        <polygon points={area} fill="hsl(var(--primary) / .10)" />
        <polyline points={line} fill="none" stroke="hsl(var(--primary))" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" className="gw-dash" />
        {data.curve.map((point, index) => {
          if (index % 3 !== 0 && point.hour !== currentHour) return null;
          const item = points[index];
          const isCurrent = point.hour === currentHour;
          return (
            <g key={point.hour}>
              {isCurrent && <circle cx={item.x} cy={item.y} r="10" fill="hsl(var(--accent) / .20)" className="gw-pulse" />}
              <circle cx={item.x} cy={item.y} r={isCurrent ? 5 : 3} fill={isCurrent ? 'hsl(var(--accent))' : 'hsl(var(--primary))'} stroke="hsl(var(--card))" strokeWidth="2" />
            </g>
          );
        })}
        {data.curve.filter((point) => point.hour % 4 === 0).map((point) => {
          const index = data.curve.findIndex((item) => item.hour === point.hour);
          return <text key={point.hour} x={points[index].x} y={height + 13} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="10" className="gw-mono">{point.label}</text>;
        })}
      </svg>
      <div className="mt-2 flex items-center justify-between text-[11px] text-[hsl(var(--muted-foreground))]">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[hsl(var(--primary))]" /> modelled clean supply</span>
        <span>Peak {peak}% at {formatHour(data.curve[values.indexOf(peak)]?.hour ?? 12)}</span>
      </div>
    </div>
  );
}

function ForecastChart({ data }: { data: ForecastResult }) {
  const width = 700;
  const height = 148;
  const padX = 18;
  const padY = 16;
  const all = [...data.predicted_curve, ...data.actual_curve];
  const max = Math.max(...all, 1);
  const pointSet = (values: number[]) => values.map((value, index) => ({
    x: padX + (index / 23) * (width - padX * 2),
    y: height - padY - (value / max) * (height - padY * 2),
  }));
  const predicted = pointSet(data.predicted_curve);
  const actual = pointSet(data.actual_curve);
  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="mt-5 h-auto w-full" role="img" aria-label="Forecast compared with actual clean energy">
        {[0, 1, 2].map((line) => <line key={line} x1={padX} x2={width - padX} y1={padY + line * ((height - padY * 2) / 2)} y2={padY + line * ((height - padY * 2) / 2)} stroke="hsl(var(--border))" strokeDasharray="2 7" />)}
        <polyline points={actual.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke="hsl(var(--accent))" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        <polyline points={predicted.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke="hsl(var(--primary))" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" strokeDasharray="5 5" />
        {[0, 6, 12, 18, 23].map((hour) => <text key={hour} x={actual[hour].x} y={height + 12} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="10" className="gw-mono">{formatHour(hour)}</text>)}
      </svg>
      <div className="mt-2 flex gap-5 text-[11px] text-[hsl(var(--muted-foreground))]">
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-5 bg-[hsl(var(--primary))]" /> predicted</span>
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-5 bg-[hsl(var(--accent))]" /> observed</span>
      </div>
    </div>
  );
}

function Modal({ onClose }: { onClose: () => void }) {
  return (
    <div className="gw-modal-backdrop fixed inset-0 z-50 flex items-end justify-center bg-[hsl(201_30%_18%/.5)] p-0 backdrop-blur-sm sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="how-it-works-title">
      <button className="absolute inset-0 cursor-default" onClick={onClose} aria-label="Close how it works" data-testid="button-close-modal-backdrop" />
      <div className="gw-modal-panel relative z-10 max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-t-[2rem] border border-[hsl(var(--card-border))] bg-[hsl(var(--card))] p-6 shadow-2xl sm:rounded-[2rem] sm:p-9">
        <button type="button" onClick={onClose} data-testid="button-close-how-it-works" className="absolute right-5 top-5 rounded-full p-2 text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]"><X className="h-5 w-5" /></button>
        <div className="mb-8 pr-8">
          <p className="gw-mono text-[10px] font-bold uppercase tracking-[.18em] text-[hsl(var(--primary))]">The GreenWindow method</p>
          <h2 id="how-it-works-title" className="gw-display mt-2 text-4xl leading-none text-[hsl(var(--foreground))]">One decision, three signals.</h2>
          <p className="mt-3 max-w-lg text-sm leading-6 text-[hsl(var(--muted-foreground))]">We turn renewable supply, soil need, and crop condition into a window you can act on before the pump starts.</p>
        </div>
        <div className="space-y-3">
          {[
            { icon: SunMedium, number: '01', title: 'Read the day’s clean supply', copy: 'The energy curve shows when solar and other clean sources are strongest at your farm.' },
            { icon: Droplets, number: '02', title: 'Tell us what the soil needs', copy: 'Move the soil moisture control. GreenWindow checks the need against your watering threshold.' },
            { icon: Zap, number: '03', title: 'Irrigate in the right window', copy: 'The recommendation updates to protect the crop, save energy, and avoid avoidable emissions.' },
          ].map(({ icon: Icon, number, title, copy }) => (
            <div key={number} className="flex gap-4 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/.55)] p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--primary)/.12)] text-[hsl(var(--primary))]"><Icon className="h-5 w-5" /></div>
              <div><p className="gw-mono text-[10px] font-bold text-[hsl(var(--accent-foreground))]">{number}</p><h3 className="mt-0.5 font-semibold text-[hsl(var(--foreground))]">{title}</h3><p className="mt-1 text-sm leading-5 text-[hsl(var(--muted-foreground))]">{copy}</p></div>
            </div>
          ))}
        </div>
        <button type="button" onClick={onClose} data-testid="button-got-it" className="mt-7 flex w-full items-center justify-center rounded-xl bg-[hsl(var(--primary))] px-4 py-3 text-sm font-bold text-[hsl(var(--primary-foreground))] transition hover:brightness-110">Got it</button>
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
  const classify = useClassifyRipeness();

  const submit = (imageData: string, imageName: string) => {
    setPreview(imageData);
    setFileName(imageName);
    classify.mutate({ data: { image_data: imageData, image_name: imageName } }, { onSuccess: (value) => setResult(value) });
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
    await navigator.clipboard?.writeText(`Crop check: ${result.classification}. ${result.confidence_note}`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <section className="gw-card rounded-3xl p-5 sm:p-6" data-testid="card-ripeness">
      <div className="flex items-start justify-between gap-4">
        <div><p className="gw-mono text-[10px] font-bold uppercase tracking-[.18em] text-[hsl(var(--primary))]">Crop check</p><h2 className="mt-1 text-lg font-bold">Ripeness desk</h2><p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">A quick visual check before the next harvest round.</p></div>
        <div className="rounded-xl bg-[hsl(var(--accent)/.17)] p-2 text-[hsl(var(--accent-foreground))]"><Leaf className="h-5 w-5" /></div>
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-[132px_1fr]">
        <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-2xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--muted)/.65)]">
          {preview ? <img src={preview} alt="Selected crop sample" className="h-full w-full object-cover" data-testid="img-ripeness-preview" /> : <FileImage className="h-8 w-8 text-[hsl(var(--muted-foreground)/.65)]" />}
          {classify.isPending && <div className="absolute inset-0 flex items-center justify-center bg-[hsl(201_30%_18%/.56)] text-[hsl(var(--card))]"><LoaderCircle className="h-7 w-7 animate-spin" /></div>}
        </div>
        <div className="flex flex-col justify-center">
          <input ref={inputRef} type="file" accept="image/*" onChange={onFileChange} className="hidden" data-testid="input-ripeness-file" />
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => inputRef.current?.click()} data-testid="button-upload-ripeness" className="inline-flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-3.5 py-2.5 text-sm font-bold text-[hsl(var(--primary-foreground))] transition hover:brightness-110"><Upload className="h-4 w-4" /> Upload photo</button>
            <button type="button" onClick={() => submit(SAMPLE_IMAGE, 'field-sample.svg')} data-testid="button-use-ripeness-sample" className="rounded-xl border border-[hsl(var(--border))] px-3.5 py-2.5 text-sm font-semibold text-[hsl(var(--foreground))] transition hover:bg-[hsl(var(--muted))]">Use field sample</button>
          </div>
          <p className="mt-2 text-xs text-[hsl(var(--muted-foreground))]">{fileName || 'JPG, PNG or a camera photo · one fruit in frame works best'}</p>
        </div>
      </div>
      {classify.isError && <p className="mt-4 flex items-center gap-2 text-xs text-[hsl(var(--destructive))]"><AlertCircle className="h-3.5 w-3.5" /> Could not classify that image. Try a clearer crop photo.</p>}
      {result && (
        <div className="mt-5 rounded-2xl border border-[hsl(var(--primary)/.2)] bg-[hsl(var(--primary)/.06)] p-4" data-testid="status-ripeness-result">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="gw-mono text-[10px] font-bold uppercase tracking-[.14em] text-[hsl(var(--primary))]">Field read</p><p className="mt-1 text-xl font-bold capitalize">{result.classification}</p></div><span className="rounded-full bg-[hsl(var(--primary)/.13)] px-3 py-1 text-xs font-semibold text-[hsl(var(--primary))]">Cooling: {result.cooling_state}</span></div>
          <p className="mt-2 text-sm leading-5 text-[hsl(var(--muted-foreground))]">{result.confidence_note}</p>
          <div className="mt-4 flex items-end gap-1.5">{Object.entries(result.color_metrics).map(([key, value]) => <div key={key} className="flex-1"><div className="mb-1 flex justify-between text-[10px] text-[hsl(var(--muted-foreground))]"><span className="capitalize">{key.replace('_score', '')}</span><span className="gw-mono">{Math.round(value * 100)}%</span></div><div className="h-1.5 overflow-hidden rounded-full bg-[hsl(var(--border))]"><div className="h-full rounded-full bg-[hsl(var(--accent))]" style={{ width: `${Math.min(value * 100, 100)}%` }} /></div></div>)}</div>
          <button type="button" onClick={copyResult} data-testid="button-copy-ripeness" className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-[hsl(var(--primary))]">{copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}{copied ? 'Copied to clipboard' : 'Copy field note'}</button>
        </div>
      )}
    </section>
  );
}

function Home() {
  const [soilMoisture, setSoilMoisture] = useState(38);
  const [showHow, setShowHow] = useState(false);
  const [alertCopied, setAlertCopied] = useState(false);
  useEffect(() => {
    const interval = window.setInterval(() => {
      setSoilMoisture((value) => {
        const drift = 0.08 + Math.random() * 0.08;
        return value > 4 ? Math.max(0, Math.round(value * 0.997 - drift)) : value;
      });
    }, 12000);
    return () => window.clearInterval(interval);
  }, []);
  const energy = useGetCleanEnergyToday();
  const forecast = useGetForecast();
  const scheduleParams = useMemo(() => ({ soil_moisture: soilMoisture, crop_threshold: 34 }), [soilMoisture]);
  const schedule = useGetSchedule(scheduleParams);
  const scheduleValue = schedule.data as ScheduleRecommendation | undefined;
  const energyValue = energy.data as CleanEnergyToday | undefined;
  const forecastValue = forecast.data as ForecastResult | undefined;

  const liveStart = scheduleValue?.start_label ?? (soilMoisture < 34 ? '2:00 PM' : '11:00 AM');
  const liveEnd = scheduleValue?.end_label ?? (soilMoisture < 34 ? '4:00 PM' : '1:00 PM');
  const liveReason = scheduleValue?.reason ?? (soilMoisture < 34 ? 'Soil is holding enough moisture; use the clean afternoon peak.' : 'The crop is thirsty; take the next clean-energy window.');
  const alertText = `GreenWindow: irrigate ${liveStart}–${liveEnd}. Soil moisture is ${soilMoisture}%. ${liveReason}`;
  const copyAlert = async () => {
    await navigator.clipboard?.writeText(alertText);
    setAlertCopied(true);
    window.setTimeout(() => setAlertCopied(false), 1800);
  };

  return (
    <div className="gw-shell min-h-[100dvh] text-[hsl(var(--foreground))]">
      <header className="mx-auto flex max-w-[1440px] items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
        <div className="flex items-center gap-3" data-testid="brand-greenwindow">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-[13px] bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-[4px_4px_0_hsl(var(--accent))]"><Sprout className="h-5 w-5" /><span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-[hsl(var(--accent))]" /></div>
          <div><p className="text-[15px] font-bold tracking-tight">GreenWindow</p><p className="gw-mono text-[9px] uppercase tracking-[.17em] text-[hsl(var(--muted-foreground))]">Irrigation control room</p></div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card)/.55)] px-3 py-1.5 text-xs text-[hsl(var(--muted-foreground))] sm:flex"><span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--primary))] gw-pulse" /> live field model</div>
          <button type="button" onClick={() => setShowHow(true)} data-testid="button-how-it-works" className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card)/.55)] px-3.5 py-2 text-xs font-bold transition hover:border-[hsl(var(--primary)/.4)] hover:bg-[hsl(var(--card))]"><CircleHelp className="h-4 w-4 text-[hsl(var(--primary))]" /> How it works</button>
        </div>
      </header>

      <main className="mx-auto max-w-[1440px] px-5 pb-12 sm:px-8 lg:px-12">
        <section className="gw-reveal mb-8 grid gap-6 border-b border-[hsl(var(--border))] pb-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div><div className="mb-3 flex items-center gap-2 text-xs font-semibold text-[hsl(var(--primary))]"><span className="h-px w-7 bg-[hsl(var(--primary))]" /> {formatDate(energyValue?.date)}</div><h1 className="gw-display max-w-3xl text-[clamp(2.65rem,6vw,5.65rem)] leading-[.9] tracking-[-.03em]">Water when the<br /><em className="text-[hsl(var(--primary))]">window is right.</em></h1><p className="mt-5 max-w-xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">GreenWindow reads clean-energy availability and crop need together, so the next irrigation decision is clear at a glance.</p></div>
          <div className="flex items-center gap-3 lg:pb-1"><div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/.6)] px-4 py-3"><p className="gw-mono text-[9px] uppercase tracking-[.16em] text-[hsl(var(--muted-foreground))]">Current hour</p><p className="mt-1 text-lg font-bold" data-testid="text-current-hour">{energyValue ? formatHour(energyValue.current_hour) : '—'}</p></div><div className="rounded-2xl border border-[hsl(var(--accent)/.35)] bg-[hsl(var(--accent)/.13)] px-4 py-3"><p className="gw-mono text-[9px] uppercase tracking-[.16em] text-[hsl(var(--accent-foreground))]">Decision status</p><p className="mt-1 flex items-center gap-1.5 text-lg font-bold text-[hsl(var(--primary))]"><span className="h-2 w-2 rounded-full bg-[hsl(var(--primary))]" /> ready</p></div></div>
        </section>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(340px,.9fr)]">
          <section className="gw-card gw-reveal-2 rounded-3xl p-5 sm:p-7" data-testid="card-soil-control">
            <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="gw-mono text-[10px] font-bold uppercase tracking-[.18em] text-[hsl(var(--primary))]">01 / crop need</p><h2 className="mt-1 text-xl font-bold">How thirsty is the field?</h2><p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">Drag to set today’s soil moisture reading.</p></div><div className="flex items-center gap-2 rounded-full bg-[hsl(var(--muted))] px-3 py-1.5 text-xs font-semibold"><Droplets className="h-3.5 w-3.5 text-[hsl(var(--primary))]" /> threshold 34%</div></div>
            <div className="mt-8 rounded-2xl bg-[hsl(var(--background)/.72)] p-5 sm:p-7"><div className="flex items-end justify-between gap-3"><div><span className="gw-display text-6xl leading-none text-[hsl(var(--foreground))]" data-testid="text-soil-moisture">{soilMoisture}</span><span className="ml-1 text-2xl text-[hsl(var(--muted-foreground))]">%</span><p className="mt-2 text-xs font-semibold text-[hsl(var(--muted-foreground))]">{soilMoisture < 34 ? 'Below the crop’s watering threshold' : 'Above the crop’s watering threshold'}</p></div><div className="hidden text-right sm:block"><p className="gw-mono text-[10px] uppercase tracking-widest text-[hsl(var(--muted-foreground))]">simulated reading</p><p className="mt-1 text-sm font-semibold">North plot · rice</p></div></div><input type="range" min="0" max="100" value={soilMoisture} onChange={(event) => setSoilMoisture(Number(event.target.value))} style={{ '--slider-progress': `${soilMoisture}%` } as CSSProperties} className="gw-slider mt-8 w-full" data-testid="input-soil-moisture" aria-label="Soil moisture percentage" /><div className="mt-3 flex justify-between text-[10px] font-semibold text-[hsl(var(--muted-foreground))]"><span>dry</span><span>needs watering</span><span>holding well</span></div></div>
            <div className="mt-5 flex items-center gap-3 text-xs text-[hsl(var(--muted-foreground))]"><LockKeyhole className="h-4 w-4 text-[hsl(var(--primary))]" /><span>Only you can change this field reading. Recommendation updates as you move.</span></div>
          </section>

          <section className="gw-reveal-3 rounded-3xl bg-[hsl(var(--primary))] p-5 text-[hsl(var(--primary-foreground))] shadow-[0_14px_40px_hsl(167_47%_33%/.18)] sm:p-7" data-testid="card-recommendation">
            <div className="flex items-start justify-between"><div><p className="gw-mono text-[10px] font-bold uppercase tracking-[.18em] text-[hsl(var(--primary-foreground)/.65)]">02 / recommendation</p><h2 className="mt-1 text-xl font-bold">Your irrigation window</h2></div><div className="rounded-xl bg-[hsl(var(--primary-foreground)/.12)] p-2"><Zap className="h-5 w-5 text-[hsl(var(--accent))]" /></div></div>
            {schedule.isLoading && !scheduleValue ? <div className="mt-8 space-y-3"><Skeleton className="h-16 bg-[hsl(var(--primary-foreground)/.16)]" /><Skeleton className="h-5 w-4/5 bg-[hsl(var(--primary-foreground)/.16)]" /><Skeleton className="h-5 w-3/5 bg-[hsl(var(--primary-foreground)/.16)]" /></div> : schedule.isError ? <div className="mt-6 rounded-2xl bg-[hsl(var(--primary-foreground)/.1)] p-4 text-sm">The field recommendation is resting. <button type="button" onClick={() => schedule.refetch()} data-testid="button-retry-schedule" className="mt-3 underline">Try again</button></div> : <><div className="mt-8 flex items-end gap-3"><p className="gw-display text-5xl leading-none" data-testid="text-irrigation-window">{liveStart}</p><ChevronRight className="mb-1 h-5 w-5 opacity-60" /><p className="gw-display text-5xl leading-none">{liveEnd}</p></div><p className="mt-5 max-w-sm text-sm leading-6 text-[hsl(var(--primary-foreground)/.78)]" data-testid="text-recommendation-reason">{liveReason}</p><div className="mt-7 grid grid-cols-2 gap-2 border-t border-[hsl(var(--primary-foreground)/.18)] pt-4"><div><p className="gw-mono text-[9px] uppercase tracking-wider text-[hsl(var(--primary-foreground)/.58)]">clean energy saved</p><p className="mt-1 text-lg font-bold">{scheduleValue?.kwh_saved ?? '—'} <span className="text-xs font-medium opacity-65">kWh</span></p></div><div><p className="gw-mono text-[9px] uppercase tracking-wider text-[hsl(var(--primary-foreground)/.58)]">CO₂ avoided</p><p className="mt-1 text-lg font-bold">{scheduleValue?.co2_avoided_kg ?? '—'} <span className="text-xs font-medium opacity-65">kg</span></p></div></div></>}
          </section>
        </div>

        <section className="gw-card gw-reveal-2 mt-5 rounded-3xl p-5 sm:p-7" data-testid="card-clean-energy">
          <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="gw-mono text-[10px] font-bold uppercase tracking-[.18em] text-[hsl(var(--primary))]">03 / clean supply</p><h2 className="mt-1 text-xl font-bold">Today’s clean-energy timeline</h2></div><p className="max-w-sm text-right text-xs leading-5 text-[hsl(var(--muted-foreground))]">{energyValue?.source_note ?? 'Solar and grid mix model for your local field connection.'}</p></div>
          {energy.isLoading ? <Skeleton className="mt-6 h-52" /> : energy.isError || !energyValue ? <div className="mt-5"><ErrorState label="Clean energy timeline" retry={() => energy.refetch()} /></div> : <CleanEnergyChart data={energyValue} currentHour={energyValue.current_hour} />}
        </section>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1.08fr_.92fr]">
          <section className="gw-card rounded-3xl p-5 sm:p-7" data-testid="card-alert">
            <div className="flex items-start justify-between gap-4"><div><p className="gw-mono text-[10px] font-bold uppercase tracking-[.18em] text-[hsl(var(--primary))]">On the ground</p><h2 className="mt-1 text-xl font-bold">Farmer alert preview</h2><p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">A short note ready for the field team.</p></div><CloudSun className="h-6 w-6 text-[hsl(var(--accent-foreground))]" /></div>
            <div className="mt-5 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/.67)] p-4"><div className="flex items-center gap-2 text-xs font-semibold"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]"><Sprout className="h-3.5 w-3.5" /></span> North plot · today</div><p className="mt-4 text-sm leading-6" data-testid="text-alert-preview">{alertText}</p><p className="mt-2 border-l-2 border-[hsl(var(--accent))] pl-3 text-sm leading-6 text-[hsl(var(--foreground)/.78)]">सिंचाई का सही समय: {liveStart}–{liveEnd}. मिट्टी की नमी {soilMoisture}% है।</p><div className="mt-4 flex items-center justify-between border-t border-[hsl(var(--border))] pt-3 text-xs text-[hsl(var(--muted-foreground))]"><span>Prepared from live field readings</span><button type="button" onClick={copyAlert} data-testid="button-copy-alert" className="inline-flex items-center gap-1.5 font-bold text-[hsl(var(--primary))]">{alertCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}{alertCopied ? 'Copied' : 'Copy note'}</button></div></div>
          </section>

          <section className="gw-card rounded-3xl p-5 sm:p-7" data-testid="card-forecast">
            <div className="flex items-start justify-between gap-4"><div><p className="gw-mono text-[10px] font-bold uppercase tracking-[.18em] text-[hsl(var(--primary))]">Tomorrow / model check</p><h2 className="mt-1 text-xl font-bold">Forecast accuracy</h2></div><div className="flex items-center gap-1 text-sm font-bold text-[hsl(var(--primary))]">{forecastValue ? <><ArrowDownRight className="h-4 w-4" /> {forecastValue.mape}% MAPE</> : '—'}</div></div>
            {forecast.isLoading ? <Skeleton className="mt-6 h-44" /> : forecast.isError || !forecastValue ? <div className="mt-5"><ErrorState label="Forecast" retry={() => forecast.refetch()} /></div> : <><ForecastChart data={forecastValue} /><div className="mt-4 flex items-center justify-between border-t border-[hsl(var(--border))] pt-3 text-xs text-[hsl(var(--muted-foreground))]"><span>{forecastValue.model_used} · {forecastValue.holdout_days} holdout days</span><span className="font-semibold text-[hsl(var(--foreground))]">directionally reliable</span></div></>}
          </section>
        </div>

        <div className="mt-5"><RipenessCard /></div>
        <footer className="mt-8 flex flex-col justify-between gap-3 border-t border-[hsl(var(--border))] pt-5 text-xs text-[hsl(var(--muted-foreground))] sm:flex-row sm:items-center"><span className="flex items-center gap-2"><Sprout className="h-3.5 w-3.5 text-[hsl(var(--primary))]" /> Built for decisions in the field.</span><span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--primary))]" /> data refreshes automatically</span></footer>
      </main>
      {showHow && <Modal onClose={() => setShowHow(false)} />}
    </div>
  );
}

export default Home;