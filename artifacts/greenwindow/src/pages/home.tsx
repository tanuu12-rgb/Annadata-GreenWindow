import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  Camera,
  Check,
  ChevronDown,
  CircleHelp,
  CloudSun,
  Droplets,
  ExternalLink,
  Fan,
  Info,
  Leaf,
  Lightbulb,
  LoaderCircle,
  Mail,
  Moon,
  MoveRight,
  Power,
  RotateCcw,
  Send,
  ShieldCheck,
  Sprout,
  Sun,
  ThermometerSun,
  Upload,
  Zap,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CameraPreviewModal } from '../components/camera-preview-modal';
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

const gridMixDefault = [18, 14, 12, 10, 11, 18, 27, 38, 52, 64, 75, 82, 86, 84, 79, 70, 61, 57, 49, 42, 34, 29, 24, 20];
const hours = ['12a', '1a', '2a', '3a', '4a', '5a', '6a', '7a', '8a', '9a', '10a', '11a', '12p', '1p', '2p', '3p', '4p', '5p', '6p', '7p', '8p', '9p', '10p', '11p'];

const cropData = {
  Tomato: { moisture: 42, threshold: 38, decay: [52, 49, 47, 44, 42, 39, 36, 34] },
  Wheat: { moisture: 58, threshold: 45, decay: [67, 65, 63, 61, 58, 55, 53, 50] },
  Rice: { moisture: 74, threshold: 62, decay: [82, 81, 79, 77, 74, 72, 69, 67] },
  Cotton: { moisture: 36, threshold: 31, decay: [46, 43, 41, 39, 36, 33, 31, 28] },
} as const;

function energyColor(value: number) {
  if (value >= 70) return 'bg-[#2d6a4f]';
  if (value >= 50) return 'bg-[#527e4f]';
  if (value >= 30) return 'bg-[#b7a04e]';
  return 'bg-[#bb6b43]';
}

function SectionLabel({
  number,
  eyebrow,
  title,
  description,
}: {
  number: string;
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-6 flex items-start gap-4">
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-[#dfeee1] text-sm font-bold text-[#1b4332] dark:bg-[#274f3b] dark:text-[#d5f0d7]">
        {number}
      </span>
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#6b8b76]">{eyebrow}</p>
        <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-[#1b4332] dark:text-[#edf7ed] sm:text-3xl">
          {title}
        </h2>
        {description && <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>}
      </div>
    </div>
  );
}

function Intro({ onDone }: { onDone: () => void }) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setVisible(false);
      onDone();
    }, 3500);
    return () => window.clearTimeout(timer);
  }, [onDone]);

  const bars = [18, 12, 9, 8, 9, 14, 22, 34, 49, 64, 78, 90, 96, 94, 87, 76, 63, 52, 42, 34, 27, 22, 19, 17];

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.65 }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-[#1b4332] px-6 text-[#faf9f6]"
          style={{
            backgroundImage:
              "linear-gradient(120deg, rgba(12, 48, 31, .9), rgba(35, 67, 35, .56)), url('/annadata-hero.png')",
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <button
            onClick={() => {
              setVisible(false);
              onDone();
            }}
            className="absolute right-6 top-6 rounded-full border border-white/20 px-4 py-2 text-xs font-semibold text-white/75 transition hover:bg-[#fffdf7]/10"
          >
            Skip intro
          </button>
          <motion.div
            initial={{ clipPath: 'inset(0 100% 0 0)' }}
            animate={{ clipPath: 'inset(0 0% 0 0)' }}
            transition={{ duration: 1.1, ease: 'easeOut' }}
            className="text-5xl font-black tracking-tight sm:text-7xl"
          >
            अन्ना<span className="text-[#e9c46a]">data</span>
          </motion.div>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="mt-3 text-sm text-white/65 font-medium"
          >
            by Sonia Lotlikar and Tanaya Deshmukh
          </motion.p>
          <div className="relative mt-16 flex h-28 w-full max-w-xl items-end gap-1.5 px-2 sm:gap-2">
            {bars.map((height, i) => (
              <motion.div
                key={i}
                initial={{ height: 0 }}
                animate={{ height: `${height}%` }}
                transition={{ delay: 0.9 + i * 0.045, duration: 0.45, ease: 'easeOut' }}
                className={`flex-1 rounded-t-sm ${i > 8 && i < 18 ? 'bg-[#7fb069]' : 'bg-[#e9c46a]'}`}
              />
            ))}
            <motion.div
              initial={{ left: '0%' }}
              animate={{ left: '100%' }}
              transition={{ delay: 1.1, duration: 1.8, ease: 'easeInOut' }}
              className="absolute -top-8 -translate-x-1/2 text-[#f4d58d]"
            >
              <Sun className="size-8 fill-current" />
            </motion.div>
          </div>
          <p className="mt-8 text-xs uppercase tracking-[.22em] text-white/40">
            powering better decisions for every acre
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function Home() {
  const [intro, setIntro] = useState(true);
  const [solar, setSolar] = useState(false);
  const [dark, setDark] = useState(false);
  const [help, setHelp] = useState(false);
  const [crop, setCrop] = useState<keyof typeof cropData>('Tomato');
  const [decayIndex, setDecayIndex] = useState(4);
  const [moisture, setMoisture] = useState<number>(cropData.Tomato.moisture);
  const [manualMoisture, setManualMoisture] = useState(false);
  const [alertLang, setAlertLang] = useState<'English' | 'हिंदी / मराठी'>('English');
  const [abnormal, setAbnormal] = useState(false);
  const [sample, setSample] = useState<'Unripe' | 'Ripe' | 'Turning' | 'Spoiling'>('Turning');
  const [cooling, setCooling] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [clock, setClock] = useState(new Date());
  const [farmerEmail, setFarmerEmail] = useState('deshmukhtanaya90@gmail.com');
  const [emailStatus, setEmailStatus] = useState<{ loading: boolean; success?: boolean; message?: string } | null>(null);

  const handleSendEmail = async (overrideRecipient?: string) => {
    const toEmail = (overrideRecipient || farmerEmail || 'deshmukhtanaya90@gmail.com').trim();
    setEmailStatus({ loading: true });
    try {
      const res = await fetch('/api/send-alert-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient_email: toEmail,
          crop,
          moisture,
          threshold: currentCrop.threshold,
          needs_water: needsWater,
          window_display: windowDisplay,
          location: 'Field 01 · Mumbai, MH',
          lang: alertLang,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setEmailStatus({
          loading: false,
          success: true,
          message: data.message || `Advisory email successfully dispatched to ${toEmail}!`,
        });
      } else {
        setEmailStatus({ loading: false, success: false, message: data.message || data.error || 'Failed to dispatch email.' });
      }
    } catch (err: any) {
      setEmailStatus({ loading: false, success: false, message: err?.message || 'Network error while dispatching email.' });
    }
  };

  // Real-time clock syncing
  useEffect(() => {
    const timer = window.setInterval(() => {
      setClock(new Date());
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const timeString = useMemo(() => {
    return clock.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }, [clock]);

  const clockHour = clock.getHours();
  const clockMinute = clock.getMinutes();
  const timeProgressPct = useMemo(() => {
    const fraction = (clockHour + clockMinute / 60) / 24;
    return Math.min(96, Math.max(4, Number((fraction * 100).toFixed(2))));
  }, [clockHour, clockMinute]);

  // Automated telemetry readings based on crop decay array
  useEffect(() => {
    if (manualMoisture) return;
    const interval = window.setInterval(() => {
      setDecayIndex((prev) => {
        const arr = cropData[crop].decay;
        const next = (prev + 1) % arr.length;
        setMoisture(arr[next]);
        return next;
      });
    }, 4000);
    return () => window.clearInterval(interval);
  }, [crop, manualMoisture]);

  // Connect to live backend APIs
  const energy = useGetCleanEnergyToday();
  const forecastApi = useGetForecast();
  const scheduleParams = useMemo(
    () => ({ soil_moisture: moisture, crop_threshold: cropData[crop].threshold }),
    [moisture, crop],
  );
  const schedule = useGetSchedule(scheduleParams);
  const classify = useClassifyRipeness();

  const currentCrop = cropData[crop];
  const decay = useMemo(
    () =>
      currentCrop.decay.map((value, i) => ({
        day: i,
        moisture: manualMoisture ? Math.max(12, moisture - i * 2) : value,
      })),
    [currentCrop.decay, manualMoisture, moisture],
  );

  // Use backend energy curve if loaded, otherwise Annadata default
  const gridMix = useMemo(() => {
    if (energy.data?.curve && energy.data.curve.length === 24) {
      return energy.data.curve.map((p) => p.clean_pct);
    }
    return gridMixDefault;
  }, [energy.data]);

  // Combine forecast data
  const forecastChartData = useMemo(() => {
    if (forecastApi.data?.predicted_curve && forecastApi.data?.actual_curve) {
      return hours.map((hour, i) => ({
        hour,
        today: forecastApi.data?.actual_curve[i] ?? gridMix[i],
        tomorrow: forecastApi.data?.predicted_curve[i] ?? gridMix[i],
      }));
    }
    return hours.map((hour, i) => ({
      hour,
      today: gridMix[i],
      tomorrow: Math.min(
        95,
        Math.max(
          8,
          gridMix[i] + [3, 2, 1, 1, 0, 2, 3, 2, 4, 3, 1, 0, -2, -1, 2, 3, 4, 1, 0, 3, 4, 2, 2, 1][i],
        ),
      ),
    }));
  }, [forecastApi.data, gridMix]);

  const scheduleValue = schedule.data as ScheduleRecommendation | undefined;
  const needsWater = moisture <= currentCrop.threshold;
  const liveStart = scheduleValue?.start_label ?? '11 AM';
  const liveEnd = scheduleValue?.end_label ?? '2 PM';
  const windowDisplay = scheduleValue?.start_label
    ? `${scheduleValue.start_label}–${scheduleValue.end_label}`
    : '11 AM–2 PM';

  const kwhSaved =
    scheduleValue?.kwh_saved && scheduleValue.kwh_saved > 0
      ? scheduleValue.kwh_saved
      : 18.4;
  const co2Avoided =
    scheduleValue?.co2_avoided_kg && scheduleValue.co2_avoided_kg > 0
      ? scheduleValue.co2_avoided_kg
      : 12.7;

  const verdict = sample === 'Spoiling' ? 'Spoiling risk' : sample === 'Ripe' ? 'Ripe' : sample === 'Turning' ? 'Turning' : 'Unripe';
  const accent = verdict === 'Spoiling risk' ? 'amber' : verdict === 'Ripe' ? 'green' : 'slate';

  const fileInputRef = useRef<HTMLInputElement>(null);
  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      classify.mutate(
        { data: { image_data: dataUrl, image_name: file.name } },
        {
          onSuccess: (res) => {
            if (res.classification === 'spoiling') setSample('Spoiling');
            else if (res.classification === 'ripe') setSample('Ripe');
            else setSample('Unripe');
            if (res.cooling_state === 'full') setCooling(true);
          },
        },
      );
    };
    reader.readAsDataURL(file);
  };

  const handleCameraCapture = (imageDataUrl: string, imageName: string) => {
    classify.mutate(
      { data: { image_data: imageDataUrl, image_name: imageName } },
      {
        onSuccess: (res) => {
          if (res.classification === 'spoiling') setSample('Spoiling');
          else if (res.classification === 'ripe') setSample('Ripe');
          else setSample('Unripe');
          if (res.cooling_state === 'full') setCooling(true);
        },
      },
    );
  };

  return (
    <div className={dark ? 'dark' : ''}>
      <AnimatePresence>{intro && <Intro onDone={() => setIntro(false)} />}</AnimatePresence>

      <main className="min-h-screen overflow-hidden bg-[#efe8d8] text-[#1b4332] dark:bg-[#12231b] dark:text-[#edf7ed]">
        {/* Ambient atmospheric orbs */}
        <div className="pointer-events-none fixed inset-0 z-10 opacity-60 dark:opacity-40">
          <div className="ambient-orb ambient-orb-one" />
          <div className="ambient-orb ambient-orb-two" />
        </div>

        {/* Sticky Header */}
        <header className="sticky top-0 z-30 border-b border-[#dce9df] bg-[#e8efe5]/90 backdrop-blur-xl dark:border-white/10 dark:bg-[#12231b]/90">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
            <div className="flex items-center gap-3" data-testid="brand-greenwindow">
              <div className="flex size-10 items-center justify-center rounded-xl bg-[#1b4332] text-lg font-black text-[#e9c46a] shadow-lg shadow-[#1b4332]/15">
                अ
              </div>
              <div>
                <div className="text-lg font-black leading-none">
                  अन्ना<span className="text-[#c8942c]">data</span>
                </div>
                <div className="mt-1 hidden text-[10px] font-semibold tracking-wide text-muted-foreground sm:block">
                  Technology ki soch, kheti ki nayi khoj
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
              <div className="hidden items-center gap-2 rounded-full border border-[#dce9df] bg-white/60 p-1 text-xs font-bold dark:border-white/10 dark:bg-[#fffdf7]/5 sm:flex">
                <button
                  type="button"
                  onClick={() => setSolar(false)}
                  className={`rounded-full px-3 py-1.5 transition ${
                    !solar ? 'bg-[#1b4332] text-white' : 'text-muted-foreground'
                  }`}
                >
                  Grid pump
                </button>
                <button
                  type="button"
                  onClick={() => setSolar(true)}
                  className={`rounded-full px-3 py-1.5 transition ${
                    solar ? 'bg-[#1b4332] text-white' : 'text-muted-foreground'
                  }`}
                >
                  Solar pump
                </button>
              </div>

              <button
                type="button"
                aria-label="Toggle theme"
                onClick={() => setDark(!dark)}
                className="rounded-full border border-[#dce9df] p-2.5 text-muted-foreground transition hover:bg-[#eaf3e9] dark:border-white/10 dark:hover:bg-[#fffdf7]/10"
              >
                {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
              </button>

              <button
                type="button"
                aria-label="How it works"
                onClick={() => setHelp(true)}
                data-testid="button-how-it-works"
                className="rounded-full border border-[#dce9df] p-2.5 text-muted-foreground transition hover:bg-[#eaf3e9] dark:border-white/10 dark:hover:bg-[#fffdf7]/10"
              >
                <CircleHelp className="size-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <div className="mx-auto max-w-7xl px-5 pb-16 pt-6 sm:px-8 sm:pt-8">
          {/* Hero Section */}
          <section className="hero-panel relative isolate mb-16 min-h-[430px] overflow-hidden rounded-[2rem] bg-[#203b27] shadow-[0_24px_80px_rgba(27,67,50,.25)]">
            <div
              className="absolute inset-0 z-0 bg-cover bg-center transition-transform duration-1000 hover:scale-105"
              style={{ backgroundImage: "url('/annadata-hero.png')" }}
            />
            <div className="absolute inset-0 z-10 bg-gradient-to-r from-[#142b1c]/55 via-[#1e3c24]/25 to-[#7d6a2a]/5" />
            <div className="absolute inset-x-0 bottom-0 z-10 h-40 bg-gradient-to-t from-[#12291b]/45 to-transparent" />

            <div className="absolute right-7 top-7 hidden rounded-2xl border border-white/20 bg-[#17351f]/55 p-4 text-white shadow-2xl backdrop-blur-md sm:block">
              <div className="flex items-center gap-2 text-xs font-bold">
                <span className="size-2 animate-pulse rounded-full bg-[#b7d88b]" />
                FIELD SIGNALS LIVE
              </div>
              <p className="mt-2 text-[11px] text-white/65">Mumbai, Maharashtra · {timeString}</p>
            </div>

            <div className="relative z-20 flex min-h-[430px] flex-col justify-end p-7 text-white sm:p-12">
              <div className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-[#fffdf7]/10 px-3 py-1.5 text-xs font-bold backdrop-blur-md">
                <span className="size-1.5 rounded-full bg-[#f4d58d]" />
                Live planning workspace
              </div>
              <h1 className="max-w-3xl text-5xl font-black leading-[.98] tracking-[-.055em] drop-shadow-lg sm:text-8xl">
                अन्न<span className="text-[#f4d58d]">दाता</span>
              </h1>
              <p className="mt-4 max-w-xl text-base font-medium leading-7 text-white/80 sm:text-lg">
                Technology ki soch, kheti ki nayi khoj — helping farmers grow more with cleaner power and timely decisions.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href="#energy"
                  className="rounded-full bg-[#f4d58d] px-5 py-3 text-sm font-extrabold text-[#24452a] shadow-lg transition hover:-translate-y-1 hover:bg-[#fffdf7]"
                >
                  Explore today&apos;s clean hours <ArrowRight className="ml-2 inline size-4" />
                </a>
                <a
                  href="#moisture"
                  className="rounded-full border border-white/30 bg-[#fffdf7]/10 px-5 py-3 text-sm font-bold text-white backdrop-blur transition hover:bg-[#fffdf7]/20"
                >
                  Check my field
                </a>
              </div>
            </div>

            <div className="absolute bottom-5 right-7 hidden items-center gap-2 text-[10px] font-bold uppercase tracking-[.18em] text-white/55 lg:flex">
              <Leaf className="size-4" />
              Built for every acre
            </div>
          </section>

          {/* Clean Energy Title Block */}
          <div id="energy" className="mb-12 max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-[#e8f2e8] px-3 py-1.5 text-xs font-bold text-[#467452] dark:bg-[#204633] dark:text-[#c9e8cd]">
              <span className="size-1.5 rounded-full bg-[#5f9f68]" />
              Clean energy dashboard
            </div>
            <h2 className="text-4xl font-black leading-[1.05] tracking-[-.04em] text-[#1b4332] dark:text-[#f1f8f1] sm:text-6xl">
              Let clean power<br />
              <span className="text-[#c8942c]">work for your crop.</span>
            </h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">
              An AI scheduler for Indian farms that runs pumps and cooling only when the grid is clean and the crop actually needs it.
            </p>
          </div>

          {/* Section 01: Clean Energy Timeline */}
          <section className="mb-16" data-testid="card-clean-energy">
            <SectionLabel
              number="01"
              eyebrow="Clean energy today"
              title="A better hour to run your pump"
              description="The cleanest hours are not always the same as the convenient ones. Annadata finds the overlap."
            />
            <div className="overflow-hidden rounded-2xl border border-[#cfe0d2] bg-[#fffdf7] p-4 shadow-[0_12px_45px_rgba(27,67,50,.07)] dark:border-white/10 dark:bg-[#1a3327] sm:p-6">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <span className="flex size-7 items-center justify-center rounded-lg bg-[#e9f3e9] dark:bg-[#204633]">
                    <CloudSun className="size-4 text-[#477653] dark:text-[#b7d88b]" />
                  </span>
                  Grid cleanliness by hour{' '}
                  <span className="font-normal text-muted-foreground">
                    · modeled from India Energy Atlas fuel-mix patterns
                  </span>
                </div>
                <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <i className="size-2 rounded-full bg-[#bb6b43]" />
                    Coal-heavy
                  </span>
                  <span className="flex items-center gap-1.5">
                    <i className="size-2 rounded-full bg-[#2d6a4f]" />
                    Cleaner mix
                  </span>
                </div>
              </div>

              <div className="relative pt-8">
                <div
                  className="pointer-events-none absolute top-0 z-20 flex -translate-x-1/2 flex-col items-center transition-all duration-500"
                  style={{ left: `${timeProgressPct}%` }}
                >
                  <span className="rounded-full bg-[#1b4332] px-2.5 py-1 text-[10px] font-black text-white shadow-lg whitespace-nowrap">
                    NOW · {timeString}
                  </span>
                  <span className="h-5 border-l-2 border-dashed border-[#1b4332] dark:border-[#b7d88b]" />
                </div>

                <div
                  className="grid grid-cols-24 gap-1"
                  style={{ gridTemplateColumns: 'repeat(24, minmax(20px, 1fr))' }}
                >
                  {gridMix.map((value, i) => (
                    <motion.div
                      key={i}
                      layout
                      transition={{ duration: 0.25 }}
                      className={`relative flex h-24 min-w-0 flex-col items-center justify-end rounded-md px-1 py-2 text-[10px] font-bold text-white ${energyColor(
                        value,
                      )} ${
                        i >= 11 && i <= 14
                          ? 'ring-2 ring-white ring-offset-2 ring-offset-[#faf9f6] dark:ring-offset-[#1a3327]'
                          : ''
                      }`}
                    >
                      <span>{value}%</span>
                      <span
                        className="mt-1 w-px bg-[#fffdf7]/35"
                        style={{ height: `${Math.max(10, value / 3)}px` }}
                      />
                    </motion.div>
                  ))}
                </div>

                <div
                  className="mt-2 grid grid-cols-24 gap-1 text-center text-[9px] text-muted-foreground"
                  style={{ gridTemplateColumns: 'repeat(24, minmax(20px, 1fr))' }}
                >
                  {hours.map((hour) => (
                    <span key={hour}>{hour}</span>
                  ))}
                </div>

                <div className="mt-5 flex items-center justify-center">
                  <div className="flex items-center gap-2 rounded-full border border-[#aecbb1] bg-[#f3faf2] px-4 py-2 text-xs font-bold text-[#1b4332] shadow-sm dark:border-white/10 dark:bg-[#204633] dark:text-[#d6f1d7]">
                    <span className="flex size-5 items-center justify-center rounded-full bg-[#2d6a4f] text-white">
                      <Check className="size-3" />
                    </span>
                    Run pump {windowDisplay}{' '}
                    <span className="font-normal text-muted-foreground">· best clean-energy overlap</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Section 02 & 03: Soil Moisture & Best Window */}
          <div id="moisture" className="grid gap-8 lg:grid-cols-[1.04fr_.96fr]">
            {/* Section 02: Soil Moisture */}
            <section data-testid="card-soil-control">
              <SectionLabel
                number="02"
                eyebrow="Soil moisture"
                title="Know before you water"
                description="A quick read on what the crop needs next."
              />
              <div className="rounded-2xl border border-[#cfe0d2] bg-[#fffdf7] p-6 shadow-[0_12px_45px_rgba(27,67,50,.06)] dark:border-white/10 dark:bg-[#1a3327]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Droplets className="size-4 text-[#5f9f68]" />
                    <span className="text-sm font-bold">Field 01 · Mumbai, MH</span>
                  </div>
                  <div className="relative">
                    <select
                      value={crop}
                      onChange={(e) => {
                        const next = e.target.value as keyof typeof cropData;
                        setCrop(next);
                        setDecayIndex(0);
                        setMoisture(cropData[next].decay[0]);
                        setManualMoisture(false);
                      }}
                      className="appearance-none rounded-lg border border-[#dce9df] bg-[#f7faf6] py-2 pl-3 pr-8 text-xs font-bold text-[#1b4332] outline-none dark:border-white/10 dark:bg-[#fffdf7]/5 dark:text-white"
                    >
                      {Object.keys(cropData).map((item) => (
                        <option key={item}>{item}</option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2 top-2.5 size-3.5" />
                  </div>
                </div>

                <div className="mt-8 flex items-end justify-between">
                  <div>
                    <span
                      className="text-7xl font-black tracking-[-.08em] text-[#1b4332] dark:text-[#eaf6ea]"
                      data-testid="text-soil-moisture"
                    >
                      {moisture}
                    </span>
                    <span className="ml-1 text-2xl font-extrabold text-[#80a584]">%</span>
                    <div className="mt-1 flex items-center gap-2">
                      <p className="text-xs font-semibold text-muted-foreground">current moisture</p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          moisture > currentCrop.threshold
                            ? 'bg-[#d8eed8] text-[#24583b] dark:bg-[#204633] dark:text-[#b6dfa9]'
                            : 'bg-[#ffeed6] text-[#b36200] dark:bg-[#4d3215] dark:text-[#f3c27e]'
                        }`}
                      >
                        {moisture > currentCrop.threshold ? 'Soil is wet' : 'Needs water'}
                      </span>
                    </div>
                  </div>
                  <div className="rounded-xl bg-[#eff7ed] px-3 py-2 text-right text-xs font-bold text-[#477653] dark:bg-[#204633] dark:text-[#c9e8cd]">
                    <span className="block text-lg">{currentCrop.threshold}%</span>
                    watering threshold
                  </div>
                </div>

                <div className="relative mt-8">
                  <input
                    aria-label="Soil moisture"
                    type="range"
                    min="0"
                    max="100"
                    value={moisture}
                    onChange={(e) => {
                      setMoisture(Number(e.target.value));
                      setManualMoisture(true);
                    }}
                    data-testid="input-soil-moisture"
                    className="relative z-10 h-2 w-full cursor-pointer appearance-none rounded-full bg-[#dce9df] accent-[#1b4332]"
                  />
                  <div
                    className="pointer-events-none absolute -top-1 h-4 w-0.5 bg-[#c8942c]"
                    style={{ left: `${currentCrop.threshold}%` }}
                  />
                  <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
                    <span>Dry</span>
                    <span className="text-[#c8942c]">Threshold ({currentCrop.threshold}%)</span>
                    <span>Wet</span>
                  </div>
                </div>

                <div className="mt-8 h-20">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={decay}>
                      <Line type="monotone" dataKey="moisture" stroke="#5f9f68" strokeWidth={3} dot={false} />
                      <Line
                        type="monotone"
                        dataKey={() => currentCrop.threshold}
                        stroke="#c8942c"
                        strokeDasharray="4 4"
                        strokeWidth={1.5}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Moisture decay · next 8 days</span>
                  {manualMoisture && (
                    <button
                      type="button"
                      onClick={() => {
                        setDecayIndex(0);
                        setMoisture(cropData[crop].decay[0]);
                        setManualMoisture(false);
                      }}
                      className="flex items-center gap-1 font-bold text-[#1b4332] dark:text-[#d7efd8]"
                    >
                      <RotateCcw className="size-3" /> Resume decay
                    </button>
                  )}
                </div>

                <div className="mt-5 flex items-center gap-2 rounded-lg bg-[#f7faf6] px-3 py-2 text-[11px] text-muted-foreground dark:bg-[#fffdf7]/5">
                  <ShieldCheck className="size-4 shrink-0 text-[#5f9f68]" />
                  Simulated. Hardware-ready for capacitive soil sensor input
                </div>
              </div>
            </section>

            {/* Section 03: Best Irrigation Window */}
            <section data-testid="card-recommendation">
              <SectionLabel
                number="03"
                eyebrow="Best irrigation window"
                title="Make the next run count"
                description="The scheduler balances clean energy with crop demand."
              />
              <div className="relative overflow-hidden rounded-2xl bg-[#1b4332] p-7 text-white shadow-[0_18px_55px_rgba(27,67,50,.22)] sm:p-8">
                <div className="absolute -right-14 -top-14 size-44 rounded-full bg-[#2d6a4f]/60 blur-2xl" />
                <div className="relative">
                  <div className="flex items-center justify-between">
                    <span
                      className={`rounded-full border px-3 py-1.5 text-[11px] font-bold transition ${
                        needsWater
                          ? 'border-white/15 bg-[#fffdf7]/10 text-[#d8efd8]'
                          : 'border-[#81c784]/30 bg-[#81c784]/20 text-[#b6dfa9]'
                      }`}
                    >
                      {needsWater ? 'Recommended next run' : 'Holding · Soil is wet'}
                    </span>
                    <Zap className={`size-5 ${needsWater ? 'text-[#e9c46a]' : 'text-[#81c784]'}`} />
                  </div>

                  <div
                    className={`mt-8 font-black tracking-[-.05em] leading-tight transition-all ${
                      needsWater ? 'text-5xl sm:text-6xl text-white' : 'text-3xl sm:text-4xl text-[#eef6ed]'
                    }`}
                    data-testid="text-irrigation-window"
                  >
                    {needsWater ? windowDisplay : 'Holding — No watering needed'}
                  </div>
                  <p className="mt-4 max-w-sm text-sm leading-6 text-white/75" data-testid="text-recommendation-reason">
                    {needsWater
                      ? (scheduleValue?.reason ||
                        `The grid is cleanest while your ${crop.toLowerCase()} is nearing its watering threshold. Shift the run, keep the harvest steady.`)
                      : `Soil is wet (${moisture}%), above the ${currentCrop.threshold}% watering threshold for ${crop.toLowerCase()}. Watering is not needed right now — holding the pump to save power and water.`}
                  </p>

                  <div className="my-8 grid grid-cols-2 gap-4 border-y border-white/15 py-6">
                    <div>
                      <div className="text-3xl font-black text-[#e9c46a]">
                        {kwhSaved} <span className="text-base">kWh</span>
                      </div>
                      <p className="mt-1 text-[11px] leading-4 text-white/55">
                        {needsWater
                          ? 'coal-sourced power avoided vs fixed 6 AM start'
                          : 'power saved by holding pump while soil is wet'}
                      </p>
                    </div>
                    <div>
                      <div className="text-3xl font-black text-[#b6dfa9]">
                        {co2Avoided} <span className="text-base">kg</span>
                      </div>
                      <p className="mt-1 text-[11px] leading-4 text-white/55">
                        CO2 avoided · 120-day season total
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-white/55">
                    {solar
                      ? 'Solar pump mode: use the sunniest hours to top up your battery.'
                      : needsWater
                      ? 'Grid pump mode: choosing the cleanest available grid window.'
                      : `Grid pump mode: pump idle while soil is wet (${moisture}%). Will resume when nearing ${currentCrop.threshold}%.`}
                  </p>

                  <div className="mt-7 flex items-center justify-between rounded-xl bg-[#fffdf7]/10 px-4 py-3">
                    <div className="flex items-center gap-2 text-xs font-semibold">
                      <Power className="size-4 text-[#b6dfa9]" />
                      Pump check
                      <span className="ml-1 flex size-2 rounded-full bg-[#81c784]" />
                    </div>
                    <button
                      type="button"
                      onClick={() => setAbnormal(!abnormal)}
                      className="rounded-lg bg-[#fffdf7]/10 px-3 py-2 text-[11px] font-bold transition hover:bg-[#fffdf7]/20"
                    >
                      {abnormal ? 'Reset check' : 'Simulate abnormal run'}
                    </button>
                  </div>

                  {abnormal && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-3 rounded-lg border border-[#e9c46a]/30 bg-[#e9c46a]/10 px-4 py-3 text-xs font-semibold leading-5 text-[#f5dc99]"
                    >
                      This pump used 40% more energy than its normal pattern. Check for leaks.
                    </motion.div>
                  )}

                  <div className="mt-5 border-t border-white/10 pt-4 flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => handleSendEmail(farmerEmail)}
                      disabled={emailStatus?.loading}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 py-2.5 px-4 text-xs font-bold text-white backdrop-blur transition hover:bg-white/20 disabled:opacity-60"
                    >
                      {emailStatus?.loading ? (
                        <LoaderCircle className="size-4 animate-spin text-[#e9c46a]" />
                      ) : (
                        <Mail className="size-4 text-[#e9c46a]" />
                      )}
                      Email advisory to farmer ({farmerEmail})
                    </button>
                    <a
                      href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
                        farmerEmail || 'deshmukhtanaya90@gmail.com'
                      )}&su=${encodeURIComponent(
                        needsWater
                          ? `💧 [Annadata Alert] Irrigation Recommended for ${crop} - Field 01 Mumbai`
                          : `🌱 [Annadata Notice] Soil Moisture Healthy for ${crop} (${moisture}%) - Holding Pump`
                      )}&body=${encodeURIComponent(
                        needsWater
                          ? `Annadata Irrigation Advisory\n\nLocation: Field 01 · Mumbai, MH\nCrop: ${crop}\nSoil Moisture: ${moisture}% (Threshold: ${currentCrop.threshold}%)\nStatus: Irrigation Recommended\nOptimal Clean Window: ${windowDisplay}\n\nField soil moisture is below the crop threshold. Irrigating during the clean energy window saves power and avoids carbon emissions.`
                          : `Annadata Soil Moisture Notice\n\nLocation: Field 01 · Mumbai, MH\nCrop: ${crop}\nSoil Moisture: ${moisture}% (Threshold: ${currentCrop.threshold}%)\nStatus: Soil is wet. No watering needed right now. Pump is on standby to conserve electricity.`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 py-2 text-[11px] font-bold text-white/90 transition hover:bg-white/15"
                    >
                      <ExternalLink className="size-3 text-[#e9c46a]" /> Open & Send in Gmail
                    </a>
                    {emailStatus && (
                      <p
                        className={`mt-1 text-center text-[11px] font-semibold ${
                          emailStatus.success ? 'text-[#b6dfa9]' : 'text-[#f5dc99]'
                        }`}
                      >
                        {emailStatus.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Section 04: Farmer Alert */}
          <section className="mt-16" data-testid="card-alert">
            <SectionLabel
              number="04"
              eyebrow="Farmer alert"
              title="The right message, at the right time"
              description="Clear, low-bandwidth updates for the people making the decisions."
            />
            <div className="flex flex-col gap-8 rounded-2xl border border-[#cfe0d2] bg-[#f0f6ef] p-6 dark:border-white/10 dark:bg-[#1a3327] md:flex-row md:items-center md:justify-between md:p-8">
              <div className="max-w-md flex-1">
                <div className="flex gap-2 rounded-full bg-[#fffdf7] px-1 py-1 shadow-sm dark:bg-[#fffdf7]/10">
                  <button
                    type="button"
                    onClick={() => setAlertLang('English')}
                    className={`flex-1 rounded-full px-3 py-2 text-xs font-bold transition ${
                      alertLang === 'English' ? 'bg-[#1b4332] text-white' : 'text-muted-foreground'
                    }`}
                  >
                    English
                  </button>
                  <button
                    type="button"
                    onClick={() => setAlertLang('हिंदी / मराठी')}
                    className={`flex-1 rounded-full px-3 py-2 text-xs font-bold transition ${
                      alertLang !== 'English' ? 'bg-[#1b4332] text-white' : 'text-muted-foreground'
                    }`}
                  >
                    हिंदी / मराठी
                  </button>
                </div>

                <div className="mt-5 rounded-2xl border border-[#dce9df] bg-[#fffdf7] p-5 shadow-sm dark:border-white/10 dark:bg-[#244433]">
                  <div className="mb-4 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    <span>AD-ANNADT</span>
                    <span>{timeString}</span>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#dfeee1] text-[#1b4332]">
                      <Sprout className="size-4" />
                    </div>
                    <div
                      className="rounded-2xl rounded-tl-sm bg-[#eaf3e9] px-4 py-3 text-sm leading-6 text-[#1b4332] dark:bg-[#1b4332] dark:text-[#eaf6ea]"
                      data-testid="text-alert-preview"
                    >
                      {alertLang === 'English' ? (
                        needsWater ? (
                          <>
                            Your field is ready for irrigation. Soil moisture is at <b>{moisture}%</b> (threshold: {currentCrop.threshold}%). Run the pump between <b>{windowDisplay}</b> when power is cleaner. Save {co2Avoided} kg CO2 this season.
                          </>
                        ) : (
                          <>
                            No watering needed right now. Soil is wet at <b>{moisture}%</b>, above the {currentCrop.threshold}% threshold for {crop.toLowerCase()}. Pump is on standby to save power.
                          </>
                        )
                      ) : (
                        needsWater ? (
                          <>
                            आपका खेत तैयार है। मिट्टी की नमी <b>{moisture}%</b> है (सीमा {currentCrop.threshold}%)। पंप <b>सुबह 11–दोपहर 2 बजे</b> चलाएं — बिजली साफ़ है।
                          </>
                        ) : (
                          <>
                            अभी सिंचाई की जरूरत नहीं है। मिट्टी गीली है (<b>{moisture}%</b>), जो {currentCrop.threshold}% सीमा से ऊपर है। पंप स्टैंडबाय पर है।
                          </>
                        )
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Email Dispatch Console */}
              <div className="flex flex-1 flex-col justify-between rounded-2xl border border-[#cfe0d2] bg-[#fffdf7] p-6 shadow-sm dark:border-white/10 dark:bg-[#1a3327] md:min-w-[340px]">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#477653] dark:text-[#b7d88b]">
                      <Mail className="size-4" /> Live Email Advisory
                    </span>
                    <span className="rounded-md bg-[#eaf3e9] px-2 py-0.5 text-[10px] font-bold text-[#2d6a4f] dark:bg-[#204633] dark:text-[#c9e8cd]">
                      Verified ID
                    </span>
                  </div>

                  <h3 className="mt-3 text-base font-black text-[#1b4332] dark:text-[#edf7ed]">
                    Send Advisory to Farmer
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    Dispatch real-time irrigation guidance & soil telemetry directly to the farmer&apos;s verified inbox.
                  </p>

                  <div className="mt-4">
                    <label className="block text-[11px] font-bold text-[#1b4332] dark:text-[#dcefdc] mb-1">
                      Farmer Authenticated Email:
                    </label>
                    <input
                      type="email"
                      value={farmerEmail}
                      onChange={(e) => setFarmerEmail(e.target.value)}
                      placeholder="deshmukhtanaya90@gmail.com"
                      className="w-full rounded-xl border border-[#dce9df] bg-[#f7faf6] px-3.5 py-2.5 text-xs font-semibold text-[#1b4332] outline-none transition focus:border-[#2d6a4f] dark:border-white/10 dark:bg-[#12231b] dark:text-white"
                    />
                  </div>

                  {emailStatus && (
                    <div
                      className={`mt-3 rounded-xl p-3 text-xs font-bold leading-5 ${
                        emailStatus.success
                          ? 'border border-[#a3d9b0] bg-[#eaf7eb] text-[#24583b] dark:bg-[#204633] dark:text-[#c9e8cd]'
                          : 'border border-[#f8c27a] bg-[#fff5e6] text-[#b36200]'
                      }`}
                    >
                      {emailStatus.message}
                    </div>
                  )}
                </div>

                <div className="mt-5 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => handleSendEmail()}
                    disabled={emailStatus?.loading}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1b4332] px-4 py-3 text-xs font-bold text-white shadow-md transition hover:bg-[#24543d] disabled:opacity-60"
                  >
                    {emailStatus?.loading ? (
                      <LoaderCircle className="size-4 animate-spin text-[#e9c46a]" />
                    ) : (
                      <Send className="size-4 text-[#e9c46a]" />
                    )}
                    Send Email Advisory to Farmer
                  </button>

                  <a
                    href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
                      farmerEmail || 'deshmukhtanaya90@gmail.com'
                    )}&su=${encodeURIComponent(
                      needsWater
                        ? `💧 [Annadata Alert] Irrigation Recommended for ${crop} - Field 01 Mumbai`
                        : `🌱 [Annadata Notice] Soil Moisture Healthy for ${crop} (${moisture}%) - Holding Pump`
                    )}&body=${encodeURIComponent(
                      needsWater
                        ? `Annadata Irrigation Advisory\n\nLocation: Field 01 · Mumbai, MH\nCrop: ${crop}\nSoil Moisture: ${moisture}% (Threshold: ${currentCrop.threshold}%)\nStatus: Irrigation Recommended\nOptimal Clean Window: ${windowDisplay}\n\nField soil moisture is below the crop threshold. Irrigating during the clean energy window saves power and avoids carbon emissions.\n\n— Annadata Precision Irrigation Scheduler`
                        : `Annadata Soil Moisture Notice\n\nLocation: Field 01 · Mumbai, MH\nCrop: ${crop}\nSoil Moisture: ${moisture}% (Threshold: ${currentCrop.threshold}%)\nStatus: Soil is wet. No watering needed right now.\nPump Status: Holding on standby to conserve electricity and avoid overwatering.\n\n— Annadata Precision Irrigation Scheduler`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#2d6a4f]/25 bg-[#2d6a4f]/10 py-2.5 px-4 text-xs font-bold text-[#1b4332] transition hover:bg-[#2d6a4f]/20 dark:border-white/15 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
                  >
                    <Mail className="size-3.5 text-[#2d6a4f] dark:text-[#b7d88b]" />
                    Send via Gmail (Instant)
                  </a>

                  <a
                    href={`mailto:${farmerEmail}?subject=${encodeURIComponent(
                      needsWater
                        ? `[Annadata Alert] Irrigation Recommended for ${crop} - Field 01 Mumbai`
                        : `[Annadata Notice] Soil Moisture Healthy for ${crop} (${moisture}%)`
                    )}&body=${encodeURIComponent(
                      needsWater
                        ? `Annadata Irrigation Advisory\n\nLocation: Field 01 · Mumbai, MH\nCrop: ${crop}\nSoil Moisture: ${moisture}% (Threshold: ${currentCrop.threshold}%)\nAction: Irrigation Recommended between ${windowDisplay}\n\nSave energy and avoid coal emissions by irrigating during clean grid hours.`
                        : `Annadata Soil Moisture Notice\n\nLocation: Field 01 · Mumbai, MH\nCrop: ${crop}\nSoil Moisture: ${moisture}% (Threshold: ${currentCrop.threshold}%)\nStatus: Soil is wet. No watering needed right now. Pump is on standby.`
                    )}`}
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-[#dce9df] bg-white py-2 text-[11px] font-bold text-[#1b4332] transition hover:bg-[#f7faf6] dark:border-white/10 dark:bg-transparent dark:text-white dark:hover:bg-white/5"
                  >
                    <ExternalLink className="size-3 text-muted-foreground" /> Open in Mail App
                  </a>
                </div>
              </div>
            </div>
          </section>

          {/* Section 05: Tomorrow's Forecast */}
          <section className="mt-16" data-testid="card-forecast">
            <SectionLabel
              number="05"
              eyebrow="Tomorrow's forecast"
              title="Plan one day ahead"
              description="A model trained to spot a cleaner 3-hour window before the day begins."
            />
            <div className="rounded-2xl border border-[#cfe0d2] bg-[#fffdf7] p-5 shadow-[0_12px_45px_rgba(27,67,50,.06)] dark:border-white/10 dark:bg-[#1a3327] sm:p-7">
              <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="text-5xl font-black tracking-[-.07em] text-[#1b4332] dark:text-[#eef9ef]">
                    {forecastApi.data?.mape ?? '8.6'}%
                  </span>
                  <span className="ml-2 text-sm font-bold text-muted-foreground">MAPE</span>
                  <p className="mt-1 text-xs text-muted-foreground">
                    on a held-out test · tomorrow&apos;s clean-energy curve
                  </p>
                </div>
                <div className="flex flex-wrap gap-4 text-[11px] font-semibold text-muted-foreground">
                  <span className="flex items-center gap-2">
                    <i className="h-0.5 w-5 bg-[#5f9f68]" />
                    Tomorrow predicted
                  </span>
                  <span className="flex items-center gap-2">
                    <i className="w-5 border-t-2 border-dashed border-[#c8942c]" />
                    Today actual
                  </span>
                </div>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={forecastChartData} margin={{ top: 10, right: 5, left: -22, bottom: 0 }}>
                    <defs>
                      <linearGradient id="cleanFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#5f9f68" stopOpacity={0.3} />
                        <stop offset="1%" stopColor="#5f9f68" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="#dce9df" strokeDasharray="3 3" />
                    <XAxis
                      dataKey="hour"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 10, fill: '#77907d' }}
                      interval={2}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 10, fill: '#77907d' }}
                      domain={[0, 100]}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #dce9df', fontSize: 12 }} />
                    <ReferenceArea x1="11a" x2="2p" fill="#e9c46a" fillOpacity={0.14} />
                    <Area type="monotone" dataKey="tomorrow" stroke="#5f9f68" strokeWidth={3} fill="url(#cleanFill)" />
                    <Line
                      type="monotone"
                      dataKey="today"
                      stroke="#c8942c"
                      strokeDasharray="5 5"
                      strokeWidth={2}
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#edf2ed] pt-5 text-xs dark:border-white/10">
                <span className="text-muted-foreground">
                  Seasonal-naive baseline <b className="text-[#1b4332] dark:text-white">14.2% MAPE</b>{' '}
                  <ArrowRight className="mx-1 inline size-3" /> linear model{' '}
                  <b className="text-[#1b4332] dark:text-white">8.6% MAPE</b>
                </span>
                <span className="flex items-center gap-1.5 font-bold text-[#477653] dark:text-[#b7d88b]">
                  <Lightbulb className="size-4" />
                  Best window: 11 AM–2 PM
                </span>
              </div>
            </div>
          </section>

          {/* Section 06: Storage Check & Ripeness */}
          <section className="mt-16" data-testid="card-ripeness">
            <SectionLabel
              number="06"
              eyebrow="Storage check"
              title="Keep good produce from becoming waste"
              description="Optical spectrometry helps cooling respond to produce condition and storage stability."
            />
            <div className="grid gap-8 lg:grid-cols-[.9fr_1.1fr]">
              {/* Camera Preview / Crop Preview Box */}
              <div className="relative flex min-h-[320px] flex-col justify-between overflow-hidden rounded-2xl bg-[#253f2e] p-6 text-white">
                <div
                  className={`absolute inset-0 opacity-80 ${
                    sample === 'Spoiling'
                      ? 'bg-gradient-to-br from-[#6c3d2d] via-[#3a4c2d] to-[#1a291f]'
                      : sample === 'Ripe'
                      ? 'bg-gradient-to-br from-[#8c783d] via-[#4c652f] to-[#1a291f]'
                      : 'bg-gradient-to-br from-[#537747] via-[#2e5536] to-[#1a291f]'
                  }`}
                />
                <div className="relative flex items-center justify-between">
                  <span className="rounded-full bg-black/20 px-3 py-1.5 text-[11px] font-bold backdrop-blur">
                    Camera preview
                  </span>
                  <Camera className="size-5 text-white/70" />
                </div>

                <div className="relative flex flex-1 items-center justify-center">
                  <div className="flex size-40 items-center justify-center rounded-full border border-white/20 bg-[#fffdf7]/10 shadow-2xl backdrop-blur-sm">
                    <div
                      className={`size-28 rounded-full shadow-inner transition-all duration-500 ${
                        sample === 'Spoiling'
                          ? 'bg-gradient-to-br from-[#4a2e2b] via-[#3a1d1d] to-[#1d1212]'
                          : sample === 'Ripe'
                          ? 'bg-gradient-to-br from-[#d9534f] via-[#c9302c] to-[#7a1818]'
                          : sample === 'Turning'
                          ? 'bg-gradient-to-br from-[#8aa54c] via-[#d49a37] to-[#5a3a27]'
                          : 'bg-gradient-to-br from-[#4ca54c] via-[#5cb85c] to-[#255625]'
                      }`}
                      data-testid="img-ripeness-preview"
                    />
                  </div>
                </div>

                <div className="relative flex gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={onFileChange}
                    className="hidden"
                    data-testid="input-ripeness-file"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    data-testid="button-upload-ripeness"
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#fffdf7] px-3 py-2.5 text-xs font-bold text-[#1b4332] shadow-sm transition hover:bg-white"
                  >
                    <Upload className="size-4" />
                    Upload photo
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCameraOpen(true)}
                    data-testid="button-use-ripeness-sample"
                    className="flex items-center justify-center gap-2 rounded-lg bg-[#fffdf7]/15 px-4 py-2.5 text-xs font-bold backdrop-blur transition hover:bg-[#fffdf7]/25"
                  >
                    <Camera className="size-4" />
                    Use camera
                  </button>
                </div>
              </div>

              {/* Optical Spectrometry Result & Cooling Trigger */}
              <div className="rounded-2xl border border-[#cfe0d2] bg-[#fffdf7] p-6 dark:border-white/10 dark:bg-[#1a3327]">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                      Optical spectrometry verdict
                    </p>
                    <h3
                      className={`mt-2 text-3xl font-black ${
                        accent === 'amber'
                          ? 'text-[#b67825]'
                          : accent === 'green'
                          ? 'text-[#477653] dark:text-[#b7d88b]'
                          : 'text-[#6c7f72]'
                      }`}
                      data-testid="status-ripeness-result"
                    >
                      {verdict}
                    </h3>
                  </div>
                  <div className="flex size-12 items-center justify-center rounded-full bg-[#eef6ed] dark:bg-[#204633]">
                    <ThermometerSun className="size-6 text-[#5f9f68] dark:text-[#b7d88b]" />
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-2">
                  {(['Unripe', 'Ripe', 'Turning', 'Spoiling'] as const).map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => {
                        setSample(item);
                        if (item === 'Spoiling') setCooling(true);
                        else setCooling(false);
                      }}
                      className={`rounded-full border px-3 py-1.5 text-[11px] font-bold transition ${
                        sample === item
                          ? 'border-[#1b4332] bg-[#1b4332] text-white'
                          : 'border-[#dce9df] text-muted-foreground hover:border-[#9fbea3] dark:border-white/15'
                      }`}
                    >
                      Try {item}
                    </button>
                  ))}
                </div>

                <div className="mt-7 flex flex-col gap-3">
                  {[
                    ['Green / unripe', sample === 'Unripe' ? 68 : sample === 'Spoiling' ? 18 : 42, 'bg-[#6b994a]'],
                    ['Red / orange', sample === 'Ripe' ? 54 : sample === 'Spoiling' ? 30 : 24, 'bg-[#d38e39]'],
                    ['Dark / brown', sample === 'Spoiling' ? 52 : 12, 'bg-[#6d4933]'],
                  ].map(([label, value, color]) => (
                    <div key={label as string} className="flex items-center gap-3 text-xs">
                      <span className="w-28 text-muted-foreground">{label}</span>
                      <div className="h-2 flex-1 rounded-full bg-[#edf2ed] dark:bg-white/10">
                        <div
                          className={`h-2 rounded-full ${color}`}
                          style={{ width: `${value}%` }}
                        />
                      </div>
                      <span className="w-8 text-right font-bold">{value}%</span>
                    </div>
                  ))}
                </div>

                {verdict === 'Spoiling risk' && (
                  <div className="mt-6 rounded-lg bg-[#fff7df] px-3 py-2.5 text-xs font-bold text-[#896425]">
                    Move this batch to market before it is lost.
                  </div>
                )}

                <div className="mt-7 flex items-center justify-between rounded-xl bg-[#f7faf6] p-3 dark:bg-[#fffdf7]/5">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex size-9 items-center justify-center rounded-full ${
                        cooling
                          ? 'bg-[#dceef0] text-[#34757b]'
                          : 'bg-[#eaf3e9] text-[#477653] dark:bg-[#204633] dark:text-[#b7d88b]'
                      }`}
                    >
                      <Fan className={`size-4 ${cooling ? 'animate-spin' : ''}`} />
                    </div>
                    <div>
                      <p className="text-xs font-bold">
                        {cooling ? 'Full cooling triggered' : 'Variable, low cooling'}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {cooling
                          ? 'Protecting the batch now'
                          : 'Saving energy while produce is stable'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCooling(!cooling)}
                    className="rounded-lg border border-[#cfe0d2] px-3 py-2 text-[11px] font-bold dark:border-white/10 hover:bg-[#eaf3e9] dark:hover:bg-white/10 transition"
                  >
                    {cooling ? 'Reduce' : 'Trigger full'}
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Footer */}
          <footer className="mt-20 flex flex-col gap-3 border-t border-[#dce9df] pt-6 text-xs text-muted-foreground dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
            <span className="font-bold text-[#1b4332] dark:text-[#dcefdc]">
              अन्ना<span className="text-[#c8942c]">data</span> by Sonia Lotlikar and Tanaya Deshmukh
            </span>
            <span>
              Grid data is modelled · soil is simulated · optical crop spectrometry
            </span>
          </footer>
        </div>
      </main>

      {/* Camera Preview Modal (accessible via "Use camera" button) */}
      <CameraPreviewModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={handleCameraCapture}
      />

      {/* "How It Works" Modal */}
      {help && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-40 flex items-center justify-center bg-[#10251a]/60 p-5 backdrop-blur-sm"
          onClick={() => setHelp(false)}
        >
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-2xl bg-[#efe8d8] p-6 text-[#1b4332] shadow-2xl dark:bg-[#1a3327] dark:text-[#eef9ef] sm:p-8"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-[#6b8b76]">How it works</p>
                <h2 className="mt-2 text-3xl font-black tracking-tight">One simple decision rule.</h2>
              </div>
              <button
                type="button"
                onClick={() => setHelp(false)}
                className="rounded-full p-2 text-muted-foreground hover:bg-black/5 dark:hover:bg-[#fffdf7]/10"
              >
                <span className="sr-only">Close</span>×
              </button>
            </div>

            <div className="mt-7 rounded-xl bg-[#eaf3e9] p-5 text-lg font-bold leading-7 dark:bg-[#204633]">
              “Run energy-hungry equipment only when the power is clean and the crop actually needs it.”
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-5 sm:items-center">
              {['Grid energy mix', 'Soil moisture', 'Storage camera', 'Scheduling engine', 'Farmer alerts'].map(
                (item, i) => (
                  <div key={item} className="flex items-center gap-2">
                    <div
                      className={`flex min-h-16 flex-1 items-center justify-center rounded-xl border p-3 text-center text-xs font-bold ${
                        i === 3
                          ? 'border-[#1b4332] bg-[#1b4332] text-white'
                          : 'border-[#cfe0d2] bg-[#fffdf7] dark:border-white/10 dark:bg-[#fffdf7]/5'
                      }`}
                    >
                      {item}
                    </div>
                    {i < 4 && <MoveRight className="hidden size-4 text-[#9ab69e] sm:block" />}
                  </div>
                ),
              )}
            </div>

            <p className="mt-5 text-sm leading-6 text-muted-foreground">
              The engine turns these signals into irrigation pump timing and cold-storage cooling, then sends alerts in English, Hindi or Marathi.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-[#cfe0d2] p-4 dark:border-white/10">
                <p className="text-xs font-bold uppercase tracking-widest text-[#477653] dark:text-[#b7d88b]">
                  Simulated now
                </p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Grid mix, soil moisture, forecast curve and optical crop spectrometry.
                </p>
              </div>
              <div className="rounded-xl border border-[#cfe0d2] p-4 dark:border-white/10">
                <p className="text-xs font-bold uppercase tracking-widest text-[#477653] dark:text-[#b7d88b]">
                  Hardware-ready
                </p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Capacitive soil sensors, pump energy patterns, camera input and SMS delivery.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setHelp(false)}
              className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-[#1b4332] py-3 text-sm font-bold text-white shadow-md transition hover:bg-[#255625]"
            >
              Got it <Check className="size-4" />
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}