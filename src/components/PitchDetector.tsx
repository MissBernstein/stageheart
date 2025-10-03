import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnimatedButton } from "@/ui/AnimatedButton";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { motionDur, motionEase } from "@/ui/motion";
import { usePrefersReducedMotion } from "@/ui/usePrefersReducedMotion";

// -------------------------------------------------------------
// Stage Heart · Prep Tools
// 1) Pitch Detector (with 8s Hold‑Note Test)
// 2) Metronome (accented, tap tempo)
// Tailwind + shadcn/ui, no extra deps. All client-side.
// -------------------------------------------------------------

// Utility note name table
const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] as const;

export type DetectorRangeKey = "voice" | "guitar" | "bass" | "violin" | "piano" | "wide";

const DETECT_RANGES: Record<DetectorRangeKey, { min: number; max: number; label: string }> = {
  voice: { min: 80, max: 1000, label: "Voice" }, // Alto–Tenor–Soprano fundamentals
  guitar: { min: 80, max: 880, label: "Guitar" },
  bass: { min: 40, max: 400, label: "Bass" },
  violin: { min: 196, max: 3520, label: "Violin" },
  piano: { min: 27.5, max: 4186, label: "Piano" },
  wide: { min: 40, max: 4000, label: "Wide" },
};

export interface UsePitchOptions {
  gate?: number; // minimum RMS to consider a signal (0..1)
  range?: DetectorRangeKey;
  a4?: number; // reference A4 (Hz)
  fftSize?: 2048 | 4096;
}

export interface PitchState {
  running: boolean;
  noteName?: string; // e.g., "A4"
  frequency?: number; // Hz
  cents?: number; // detune vs nearest
  level: number; // 0..1
}

type NumArray = ArrayLike<number> | ReadonlyArray<number> | Float32Array;

export function usePitchDetector(
  opts: UsePitchOptions = {}
): [
  PitchState,
  {
    start: () => Promise<void>;
    stop: () => void;
    setA4: (hz: number) => void;
    setRange: (key: DetectorRangeKey) => void;
    getSampleRate: () => number | undefined;
  }
] {
  const gate = opts.gate ?? 0.015;
  const initialRange = opts.range ?? "voice";
  const initialA4 = opts.a4 ?? 440;

  const audioRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const bufRef = useRef(new Float32Array(opts.fftSize ?? 2048));
  const rafRef = useRef<number>(0);
  const prevFreqRef = useRef<number>(0);
  const a4Ref = useRef<number>(initialA4);
  const rangeRef = useRef(DETECT_RANGES[initialRange]);

  const [state, setState] = useState<PitchState>({ running: false, level: 0 });

  const freqToNote = useCallback((f: number) => {
    const n = Math.round(12 * Math.log2(f / a4Ref.current) + 69);
    const name = NOTE_NAMES[((n % 12) + 12) % 12] + Math.floor(n / 12 - 1);
    const ref = a4Ref.current * Math.pow(2, (n - 69) / 12);
    const cents = 1200 * Math.log2(f / ref);
    return { name, cents, ref };
  }, []);

  const rms = (buf: NumArray) => {
    let s = 0;
    const L = buf.length;
    for (let i = 0; i < L; i++) s += (buf as any)[i] * (buf as any)[i];
    return Math.sqrt(s / L);
  };

  // Basic autocorrelation (ACF) with windowing + quadratic peak interp
  const detectPitchACF = (input: NumArray, sampleRate: number) => {
    const SIZE = input.length;
    const buf = new Float32Array(SIZE);
    for (let i = 0; i < SIZE; i++) buf[i] = (input as any)[i];
    // Remove DC, apply Hann window
    let mean = 0;
    for (let i = 0; i < SIZE; i++) mean += buf[i];
    mean /= SIZE;
    for (let i = 0; i < SIZE; i++) buf[i] = (buf[i] - mean) * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (SIZE - 1)));

    const { min, max } = rangeRef.current;
    const maxLag = Math.floor(sampleRate / Math.max(50, min));
    const minLag = Math.max(2, Math.floor(sampleRate / Math.min(1000, max)));

    let bestOffset = -1,
      bestCorr = 0;
    for (let lag = minLag; lag < maxLag; lag++) {
      let corr = 0;
      for (let i = 0; i < SIZE - lag; i++) corr += buf[i] * buf[i + lag];
      if (corr > bestCorr) {
        bestCorr = corr;
        bestOffset = lag;
      }
    }
    if (bestOffset <= 0) return 0;

    // Quadratic interpolation around the peak
    const lag = bestOffset;
    let c0 = 0,
      c1 = 0,
      c2 = 0;
    for (let i = 0; i < SIZE - lag; i++) {
      const a = buf[i];
      c0 += a * buf[i + lag];
      c1 += a * (buf[i + lag - 1] || 0);
      c2 += a * (buf[i + lag + 1] || 0);
    }
    const denom = 2 * (2 * bestCorr - c1 - c2) || 1;
    const shift = (c2 - c1) / denom;
    const period = bestOffset + shift;
    const freq = sampleRate / period;

    return freq >= min && freq <= max ? freq : 0;
  };

  const smooth = (prev: number, next: number) => {
    if (!prev) return next;
    const alpha = 0.25; // higher = more responsive, lower = smoother
    return prev + alpha * (next - prev);
  };

  const update = useCallback(() => {
    const analyser = analyserRef.current;
    const audio = audioRef.current;
    if (!analyser || !audio) return;

    analyser.getFloatTimeDomainData(bufRef.current);
    const level = Math.min(1, rms(bufRef.current) * 6);

    if (level > gate) {
      const tmp = new Float32Array(bufRef.current.length);
      tmp.set(bufRef.current);
      const f = detectPitchACF(tmp, audio.sampleRate);
      if (f) {
        prevFreqRef.current = smooth(prevFreqRef.current, f);
        const { name, cents } = freqToNote(prevFreqRef.current);
        setState((s) => ({ ...s, frequency: prevFreqRef.current, noteName: name, cents, level }));
      } else {
        setState((s) => ({ ...s, frequency: undefined, noteName: undefined, cents: undefined, level }));
      }
    } else {
      setState((s) => ({ ...s, frequency: undefined, noteName: undefined, cents: undefined, level }));
    }

    rafRef.current = requestAnimationFrame(update);
  }, [freqToNote, gate]);

  const start = useCallback(async () => {
    if (audioRef.current) return; // already started
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      const audio = new (window.AudioContext || (window as any).webkitAudioContext)();
      const src = audio.createMediaStreamSource(stream);
      const analyser = audio.createAnalyser();
      analyser.fftSize = bufRef.current.length;
      src.connect(analyser);
      audioRef.current = audio;
      analyserRef.current = analyser;
      setState((s) => ({ ...s, running: true }));
      rafRef.current = requestAnimationFrame(update);
    } catch (e) {
      console.error(e);
      setState({ running: false, level: 0 });
    }
  }, [update]);

  const stop = useCallback(() => {
    if (!audioRef.current) return;
    cancelAnimationFrame(rafRef.current);
    audioRef.current.close();
    audioRef.current = null;
    analyserRef.current = null;
    prevFreqRef.current = 0;
    setState({ running: false, level: 0 });
  }, []);

  const setA4 = (hz: number) => {
    a4Ref.current = hz;
  };
  const setRange = (key: DetectorRangeKey) => {
    rangeRef.current = DETECT_RANGES[key];
  };
  const getSampleRate = () => audioRef.current?.sampleRate;

  useEffect(() => () => stop(), [stop]);

  return [state, { start, stop, setA4, setRange, getSampleRate }];
}

function detuneColor(cents?: number) {
  if (cents == null) return "text-muted-foreground";
  const a = Math.abs(cents);
  if (a <= 5) return "text-green-400";
  if (a <= 20) return "text-yellow-400";
  return "text-red-400";
}

function needleAngle(cents?: number) {
  if (cents == null) return 0;
  const clamped = Math.max(-50, Math.min(50, cents));
  return (clamped / 50) * 50; // ±50° sweep
}

export interface PitchDetectorProps {
  className?: string;
  defaultRange?: DetectorRangeKey;
  defaultA4?: number;
  showTips?: boolean;
}

// Small helper for a sparkline
function Sparkline({ points }: { points: number[] }) {
  const n = points.length;
  const width = 220;
  const height = 48;
  const min = -50;
  const max = 50;
  const path = points
    .map((v, i) => {
      const x = (i / Math.max(1, n - 1)) * width;
      const y = height - ((v - min) / (max - min)) * height;
      return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-12">
      <path d={path} fill="none" strokeWidth={2} stroke="currentColor" className="text-blue-300/80" />
      {/* zero line */}
      <line x1={0} x2={width} y1={height / 2} y2={height / 2} className="stroke-slate-600" strokeDasharray="4 4" />
    </svg>
  );
}

export default function PitchDetectorCard({ className, defaultRange = "voice", defaultA4 = 440, showTips = true }: PitchDetectorProps) {
  const [state, api] = usePitchDetector({ range: defaultRange, a4: defaultA4 });
  const { t } = useTranslation();
  const prefersReducedMotion = usePrefersReducedMotion();
  const liftTile = prefersReducedMotion
    ? {}
    : { whileHover: { y: -2, scale: 1.01 }, whileTap: { scale: 0.99 }, transition: { duration: motionDur.fast / 1000, ease: motionEase.standard } };
  const liftSubtle = prefersReducedMotion
    ? {}
    : { whileHover: { y: -1, scale: 1.005 }, transition: { duration: motionDur.fast / 1000, ease: motionEase.standard } };
  const [range, setRangeKey] = useState<DetectorRangeKey>(defaultRange);
  const [a4, setA4Val] = useState<number>(defaultA4);

  // Hold‑Note Test (8s)
  const [testing, setTesting] = useState(false);
  const [testData, setTestData] = useState<{ centsSeries: number[]; avgCents?: number; mad?: number; avgFreq?: number; note?: string } | null>(null);
  const testTimerRef = useRef<number | null>(null);

  // keep hook options updated
  useEffect(() => api.setRange(range), [range]);
  useEffect(() => api.setA4(a4), [a4]);

  // capture cents over time during test
  useEffect(() => {
    if (!testing) return;
    if (state.cents == null || state.frequency == null) return;
    setTestData((d) => ({ ...(d || { centsSeries: [] }), centsSeries: [ ...(d?.centsSeries || []), state.cents ], avgFreq: state.frequency, note: state.noteName }));
  }, [state.cents, state.frequency, state.noteName, testing]);

  const finalizeTest = useCallback(() => {
    setTesting(false);
    setTestData((d) => {
      if (!d || d.centsSeries.length === 0) return { centsSeries: [] };
      const avg = d.centsSeries.reduce((a, b) => a + b, 0) / d.centsSeries.length;
      const mad = d.centsSeries.reduce((a, b) => a + Math.abs(b - avg), 0) / d.centsSeries.length; // mean abs deviation (¢)
      return { ...d, avgCents: avg, mad };
    });
  }, []);

  const startTest = useCallback(async () => {
    if (!state.running) await api.start();
    setTestData({ centsSeries: [] });
    setTesting(true);
    if (testTimerRef.current) window.clearTimeout(testTimerRef.current);
    testTimerRef.current = window.setTimeout(finalizeTest, 8000);
  }, [api, finalizeTest, state.running]);

  const resetTest = () => {
    setTesting(false);
    setTestData(null);
    if (testTimerRef.current) window.clearTimeout(testTimerRef.current);
  };

  const angle = useMemo(() => needleAngle(state.cents), [state.cents]);

  const stabilityLabel = useMemo(() => {
    const mad = testData?.mad;
    if (mad == null) return null;
    if (mad <= 5) return { text: "Rock steady (±5¢)", cls: "text-green-400" };
    if (mad <= 10) return { text: "Steady (±10¢)", cls: "text-emerald-400" };
    if (mad <= 20) return { text: "Okay (±20¢)", cls: "text-yellow-400" };
    return { text: "Wobbly (>±20¢)", cls: "text-red-400" };
  }, [testData?.mad]);

  return (
    <Card className={cn("w-full max-w-3xl mx-auto border-0", className)}>
        <CardContent>
          <TooltipProvider>
          <div className="grid gap-6 md:grid-cols-2">
            {/* Dial */}
            <motion.div
              {...liftTile}
              className="rounded-2xl border bg-gradient-to-b from-slate-900 to-slate-950 p-6 relative overflow-hidden"
            >
              <div className="aspect-square w-full rounded-xl border bg-slate-950 grid place-items-center">
                <svg viewBox="0 0 100 100" className="w-5/6">
                  {/* arc marks */}
                  <g stroke="#233" strokeWidth="1.5" strokeLinecap="round">
                    <line x1="50" y1="10" x2="50" y2="22" />
                    <line x1="25" y1="18" x2="29" y2="29" />
                    <line x1="75" y1="18" x2="71" y2="29" />
                  </g>
                  {/* needle */}
                  <g transform={`rotate(${angle} 50 60)`}>
                    <rect x="49" y="20" width="2" height="40" fill="#9cf" />
                  </g>
                  <circle cx="50" cy="60" r="3.5" fill="#9cf" />
                </svg>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl border bg-slate-950 p-3">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide">Note</div>
                  <div className="text-4xl font-extrabold leading-tight">{state.noteName ?? "—"}</div>
                </div>
                <div className="rounded-xl border bg-slate-950 p-3">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide">Frequency</div>
                  <div className="text-2xl font-bold tabular-nums">{state.frequency ? `${state.frequency.toFixed(2)} Hz` : "—"}</div>
                </div>
                <div className="rounded-xl border bg-slate-950 p-3 col-span-2">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">Detune</div>
                    <div className={cn("text-3xl font-extrabold", detuneColor(state.cents))}>{state.cents != null ? Math.round(state.cents) : "—"} <span className="text-base font-normal text-muted-foreground">cents</span></div>
                  </div>
                  {/* level meter */}
                  <div className="mt-3 h-2 rounded-full border bg-slate-900 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-300" style={{ width: `${Math.round((state.level || 0) * 100)}%` }} />
                  </div>
                </div>
              </div>
            </motion.div>
            {/* Controls + 8s test */}
            <div className="rounded-2xl border bg-card p-6 space-y-6">
              <motion.div {...liftSubtle} className="space-y-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="text-sm text-muted-foreground cursor-help">A4 Reference</div>
                  </TooltipTrigger>
                  <TooltipContent>{t('prep.tips.a4')}</TooltipContent>
                </Tooltip>
                <div className="flex items-center gap-3">
                  <Slider value={[a4]} min={415} max={466} step={0.5} onValueChange={(v) => setA4Val(v[0])} className="w-full" />
                  <div className="w-24 text-right tabular-nums font-medium">{a4.toFixed(1)} Hz</div>
                </div>
              </motion.div>
              <motion.div {...liftSubtle} className="space-y-3">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="text-sm text-muted-foreground cursor-help">Range</div>
                  </TooltipTrigger>
                  <TooltipContent>{t('prep.tips.range')}</TooltipContent>
                </Tooltip>
                <Tabs value={range} onValueChange={(v) => setRangeKey(v as DetectorRangeKey)}>
                  <TabsList className="grid grid-cols-3 gap-1 rounded-xl bg-slate-900/60 p-1 [&>button]:h-8 [&>button]:text-sm">
                    {["voice", "guitar", "bass"].map((key) => (
                      <TabsTrigger asChild key={key} value={key}>
                        <motion.button
                          whileHover={prefersReducedMotion ? {} : { scale: 1.06 }}
                          whileTap={prefersReducedMotion ? {} : { scale: 0.96 }}
                          animate={range === key ? { backgroundColor: "#2d3748", color: "#fbbf24", scale: 1.08 } : { backgroundColor: "#1e293b", color: "#f1f5f9", scale: 1 }}
                          transition={{ type: "spring", stiffness: 350, damping: 30 }}
                          className="w-full h-8 rounded-xl px-2 text-sm font-medium focus:outline-none"
                        >
                          {key.charAt(0).toUpperCase() + key.slice(1)}
                        </motion.button>
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  <div className="mt-2" />
                  <TabsList className="grid grid-cols-3 gap-1 rounded-xl bg-slate-900/60 p-1 [&>button]:h-8 [&>button]:text-sm">
                    {["violin", "piano", "wide"].map((key) => (
                      <TabsTrigger asChild key={key} value={key}>
                        <motion.button
                          whileHover={prefersReducedMotion ? {} : { scale: 1.06 }}
                          whileTap={prefersReducedMotion ? {} : { scale: 0.96 }}
                          animate={range === key ? { backgroundColor: "#2d3748", color: "#fbbf24", scale: 1.08 } : { backgroundColor: "#1e293b", color: "#f1f5f9", scale: 1 }}
                          transition={{ type: "spring", stiffness: 350, damping: 30 }}
                          className="w-full h-8 rounded-xl px-2 text-sm font-medium focus:outline-none"
                        >
                          {key.charAt(0).toUpperCase() + key.slice(1)}
                        </motion.button>
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              </motion.div>
              <div className="mt-6 flex justify-center gap-2">
                {!testing ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <AnimatedButton onClick={startTest} disabled={!state.running}>Hold Note Test (8s)</AnimatedButton>
                    </TooltipTrigger>
                    <TooltipContent>{t('prep.tips.hold')}</TooltipContent>
                  </Tooltip>
                ) : (
                  <AnimatedButton variant="secondary" onClick={resetTest}>Cancel</AnimatedButton>
                )}
              </div>
              {testing && (
                <div className="mt-3 text-sm text-muted-foreground">Testing… Keep a steady tone for 8 seconds.</div>
              )}
              {testData && !testing && (
                <motion.div {...liftSubtle} className="mt-6 rounded-xl border p-3 bg-slate-950">
                  <div>
                    <div className="text-xs text-muted-foreground uppercase">Hold‑Note Results</div>
                    <div className="mt-2 grid gap-2 md:grid-cols-3">
                      <div className="contents">
                        <div>
                          <div className="text-sm text-muted-foreground">Average Note</div>
                          <div className="text-xl font-bold">{testData.note ?? "—"}</div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Average Freq</div>
                          <div className="text-xl font-bold tabular-nums">{testData.avgFreq ? `${testData.avgFreq.toFixed(2)} Hz` : "—"}</div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Mean Abs Detune</div>
                          <div className={cn("text-xl font-bold tabular-nums", stabilityLabel?.cls)}>{testData.mad != null ? `${testData.mad.toFixed(1)}¢` : "—"}</div>
                        </div>
                      </div>
                    </div>
                    {stabilityLabel && (
                      <div className={cn("mt-2 text-sm", stabilityLabel.cls)}>{stabilityLabel.text}</div>
                    )}
                    {testData.centsSeries.length > 1 && (
                      <div className="mt-3 text-xs text-muted-foreground">Cents over time (±50¢)</div>
                    )}
                    {testData.centsSeries.length > 1 && <Sparkline points={testData.centsSeries.slice(-120)} />}
                    <div className="mt-2 text-xs text-muted-foreground">Tip: Aim for ≤ ±10¢ for stage‑ready steadiness on long notes.</div>
                  </div>
                </motion.div>
              )}
              {showTips && (
                <div className="mt-6 text-xs text-muted-foreground space-y-2">
                  <p>• Use headphones to avoid feedback.</p>
                  <p>• Sing or play a steady tone. Green = in tune (±5¢).</p>
                  <p>• Microphone access requires HTTPS in production.</p>
                </div>
              )}
              <div className="mt-4 flex justify-center">
                {!state.running ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <AnimatedButton onClick={api.start}>Enable Microphone</AnimatedButton>
                    </TooltipTrigger>
                    <TooltipContent>{t('prep.tips.enableMic')}</TooltipContent>
                  </Tooltip>
                ) : (
                  <AnimatedButton variant="secondary" onClick={api.stop}>Disable</AnimatedButton>
                )}
              </div>
            </div>
          </div>
          <div className="mt-4 text-xs text-muted-foreground">A4 ref affects note & cents math only (not detection). Detection runs locally; no audio leaves the device.</div>
          </TooltipProvider>
        </CardContent>
      </Card>
    );
}

// Optional: lightweight inline version for tight spaces
export function PitchDetectorLite(props: { className?: string }) {
  const [state, api] = usePitchDetector({ range: "voice", a4: 440 });
  return (
    <div className={cn("rounded-xl border p-4 bg-card", props.className)}>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-muted-foreground uppercase">Pitch</div>
          <div className="text-xl font-bold">{state.noteName ?? "—"}</div>
          <div className="text-sm text-muted-foreground">{state.frequency ? `${state.frequency.toFixed(2)} Hz` : "—"} · {state.cents != null ? `${Math.round(state.cents)}¢` : "—"}</div>
        </div>
        {!state.running ? (
          <AnimatedButton size="sm" onClick={api.start}>Mic</AnimatedButton>
        ) : (
          <AnimatedButton size="sm" variant="secondary" onClick={api.stop}>Stop</AnimatedButton>
        )}
      </div>
      <div className="mt-3 h-1.5 rounded-full border bg-slate-900 overflow-hidden">
        <div className="h-full bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-300" style={{ width: `${Math.round((state.level || 0) * 100)}%` }} />
      </div>
    </div>
  );
}

// ===================== METRONOME =====================
export function MetronomeCard({ className }: { className?: string }) {
  const { t } = useTranslation();
  const [bpm, setBpm] = useState(100);
  const [beats, setBeats] = useState(4); // beats per bar (top number for simple meters)
  const [subdiv, setSubdiv] = useState<1 | 2 | 3 | 4>(1); // quarter, eighth, triplet, sixteenth
  const [running, setRunning] = useState(false);
  const [swing, setSwing] = useState(0); // 0..0.6 (applies to 8ths only)
  const [tapTimes, setTapTimes] = useState<number[]>([]);
  const [sound, setSound] = useState<"blip" | "woodblock" | "hihat" | "clave">("blip");
  const [grouping, setGrouping] = useState<string>("4"); // e.g., "2+2+3" for 7/8
  const [countInBars, setCountInBars] = useState<number>(0); // 0 = off
  const masterGainRef = useRef<GainNode | null>(null);
  const [volume, setVolume] = useState(0.8);
  const flashTimersRef = useRef<number[]>([]);
  const [flash, setFlash] = useState<null | "bar" | "beat" | "sub">(null);
  const [currentBeat, setCurrentBeat] = useState(0); // 0-based beat index within the bar
  const prefersReducedMotion = usePrefersReducedMotion();
  const tileLift = prefersReducedMotion
    ? {}
    : { whileHover: { y: -2, scale: 1.01 }, whileTap: { scale: 0.99 }, transition: { duration: motionDur.fast / 1000, ease: motionEase.standard } };
  const subtleLift = prefersReducedMotion
    ? {}
    : { whileHover: { y: -1, scale: 1.005 }, transition: { duration: motionDur.fast / 1000, ease: motionEase.standard } };

  const audioRef = useRef<AudioContext | null>(null);
  const nextTickTimeRef = useRef(0);
  const tickIndexRef = useRef(0); // counts ticks within the bar (beats * subdiv)
  const timerRef = useRef<number | null>(null);
  const countInRemainingRef = useRef<number>(0);

  const secondsPerBeat = useMemo(() => 60 / bpm, [bpm]);
  const tempoLabel = useMemo(() => bpmToItalian(bpm), [bpm]);

  // Parse grouping string like "2+2+3" into beat indices [0,2,4] accents
  const groupBeats = useMemo(() => parseGrouping(grouping, beats), [grouping, beats]);

  const scheduleClick = useCallback(
    (time: number, accent: "bar" | "beat" | "sub") => {
      const audio = audioRef.current;
      const out = masterGainRef.current;
      if (!audio || !out) return;
      const dur = 0.04;

      const delayMs = Math.max(0, (time - audio.currentTime) * 1000);
      const flashId = window.setTimeout(() => {
        setFlash(accent);
        flashTimersRef.current = flashTimersRef.current.filter((id) => id !== flashId);
        const clearId = window.setTimeout(() => {
          setFlash(null);
          flashTimersRef.current = flashTimersRef.current.filter((id) => id !== clearId);
        }, 120);
        flashTimersRef.current.push(clearId);
      }, delayMs);
      flashTimersRef.current.push(flashId);

      if (sound === "blip") {
        const osc = audio.createOscillator();
        const gain = audio.createGain();
        osc.type = "square";
        osc.frequency.value = accent === "bar" ? 2000 : accent === "beat" ? 1500 : 1100;
        gain.gain.value = 0;
        osc.connect(gain).connect(out);
        const peak = (accent === "bar" ? 0.28 : accent === "beat" ? 0.22 : 0.16) * volume;
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(peak, time + 0.004);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);
        osc.start(time);
        osc.stop(time + dur);
        return;
      }

      // Noise-based percussive sounds
      const bufferSize = Math.floor(audio.sampleRate * dur);
      const buffer = audio.createBuffer(1, bufferSize, audio.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
      const src = audio.createBufferSource();
      src.buffer = buffer;
      const bp = audio.createBiquadFilter();
      const gain = audio.createGain();
      src.connect(bp).connect(gain).connect(out);

      if (sound === "woodblock") {
        bp.type = "bandpass";
        bp.frequency.value = accent === "bar" ? 1800 : 1400;
        bp.Q.value = 8;
        gain.gain.setValueAtTime((accent === "bar" ? 0.35 : 0.25) * volume, time);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);
      } else if (sound === "hihat") {
        bp.type = "highpass";
        bp.frequency.value = 6000;
        bp.Q.value = 0.7;
        gain.gain.setValueAtTime((accent === "bar" ? 0.28 : accent === "beat" ? 0.22 : 0.16) * volume, time);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.03);
      } else if (sound === "clave") {
        // clave: short noise + ping
        const osc = audio.createOscillator();
        const ogain = audio.createGain();
        osc.type = "sine";
        osc.frequency.value = accent === "bar" ? 2000 : 1600;
        ogain.gain.setValueAtTime(0.001, time);
        ogain.gain.exponentialRampToValueAtTime((accent === "bar" ? 0.35 : 0.25) * volume, time + 0.003);
        ogain.gain.exponentialRampToValueAtTime(0.0001, time + 0.06);
        osc.connect(ogain).connect(out);
        osc.start(time);
        osc.stop(time + 0.08);

        bp.type = "bandpass";
        bp.frequency.value = 2500;
        bp.Q.value = 6;
        gain.gain.setValueAtTime(0.15 * volume, time);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.02);
      }

      src.start(time);
      src.stop(time + dur);
    },
    [sound, volume]
  );

  const scheduler = useCallback(() => {
    const audio = audioRef.current!;
    const ticksPerBar = beats * subdiv;
    while (nextTickTimeRef.current < audio.currentTime + 0.2) {
      const tickInBar = tickIndexRef.current % ticksPerBar; // 0..ticksPerBar-1
      const beatInBar = Math.floor(tickInBar / subdiv); // 0..beats-1
      const isBeat = tickInBar % subdiv === 0;

      // update current beat for UI BEFORE scheduling audio (so visual matches audio)
      if (isBeat) {
        setCurrentBeat(beatInBar);
      }

      let accent: "bar" | "beat" | "sub" = "sub";
      const groupedStrong = groupBeats.includes(beatInBar);
      if (isBeat && beatInBar === 0) accent = "bar"; // first beat strongest
      else if (isBeat && groupedStrong) accent = "beat";

      // during count-in: accent only beats (bar strong), suppress sub accents
      if (countInRemainingRef.current > 0) {
        accent = isBeat ? (beatInBar === 0 ? "bar" : "beat") : "sub";
      }

      scheduleClick(nextTickTimeRef.current, accent);

      // interval length
      const base = secondsPerBeat / subdiv;
      let interval = base;
      if (subdiv === 2) {
        const isOff = tickInBar % 2 === 1; // swing on 8ths
        interval = isOff ? base * (1 + swing) : base * (1 - swing);
      }

      // advance time and indices
      nextTickTimeRef.current += interval;
      tickIndexRef.current += 1;

      // handle end of bar for count-in
      if (((tickIndexRef.current % ticksPerBar) === 0) && countInRemainingRef.current > 0) {
        countInRemainingRef.current -= 1;
      }
    }
    timerRef.current = window.setTimeout(scheduler, 50);
  }, [beats, groupBeats, scheduleClick, secondsPerBeat, subdiv, swing]);

  const start = useCallback(async () => {
    if (running) return;
    const audio = new (window.AudioContext || (window as any).webkitAudioContext)();
    audioRef.current = audio;
    const master = audio.createGain();
    master.gain.value = volume;
    master.connect(audio.destination);
    masterGainRef.current = master;
    nextTickTimeRef.current = audio.currentTime + 0.05;
    tickIndexRef.current = 0;
    setCurrentBeat(0);
    countInRemainingRef.current = countInBars;
    flashTimersRef.current.forEach((id) => window.clearTimeout(id));
    flashTimersRef.current = [];
    setFlash(null);
    setRunning(true);
    scheduler();
  }, [running, scheduler, countInBars, volume]);

  const stop = useCallback(() => {
    setRunning(false);
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = null;
    flashTimersRef.current.forEach((id) => window.clearTimeout(id));
    flashTimersRef.current = [];
    setFlash(null);
    setCurrentBeat(0);
    masterGainRef.current?.disconnect();
    masterGainRef.current = null;
    audioRef.current?.close();
    audioRef.current = null;
  }, []);

  useEffect(() => () => stop(), [stop]);

  // Tap tempo: average of last 4 intervals
  const onTap = () => {
    const now = performance.now();
    setTapTimes((arr) => {
      const next = [...arr, now].slice(-5);
      if (next.length >= 2) {
        const intervals = next.slice(1).map((t, i) => t - next[i]);
        const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const bpm = Math.min(240, Math.max(40, Math.round(60000 / avg)));
        setBpm(bpm);
      }
      return next;
    });
  };

  // Visuals: LED indicators + numeric counter

  useEffect(() => {
    if (masterGainRef.current) {
      masterGainRef.current.gain.value = volume;
    }
  }, [volume]);

  return (
    <Card className={cn("w-full max-w-3xl mx-auto border-0", className)}>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-start">
        <div className="flex gap-2 items-center">
          <TooltipProvider>
            {!running ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <AnimatedButton onClick={start}>Start</AnimatedButton>
                </TooltipTrigger>
                <TooltipContent>{t('prep.tips.start')}</TooltipContent>
              </Tooltip>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <AnimatedButton variant="secondary" onClick={stop}>Stop</AnimatedButton>
                </TooltipTrigger>
                <TooltipContent>{t('prep.tips.stop')}</TooltipContent>
              </Tooltip>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <AnimatedButton variant="outline" onClick={onTap}>Tap</AnimatedButton>
              </TooltipTrigger>
              <TooltipContent>{t('prep.tips.tap')}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent>
        <TooltipProvider>
        <div className="grid gap-8">
          {/* Visuals */}
          <div className="space-y-4">
            <div className="text-center text-lg font-medium text-muted-foreground">{tempoLabel}</div>
            <motion.div
            {...tileLift}
            className={cn(
              "rounded-2xl border bg-gradient-to-b from-slate-900 to-slate-950 p-6 relative",
              flash === "bar" && "ring-2 ring-blue-300 shadow-[0_0_20px_rgba(147,197,253,0.4)]",
              flash === "beat" && "ring-2 ring-cyan-300/70 shadow-[0_0_16px_rgba(103,232,249,0.3)]",
              flash === "sub" && "ring-2 ring-purple-300/60 shadow-[0_0_12px_rgba(196,181,253,0.25)]"
            )}
          >
            {/* Accessibility announcer */}
            <div aria-live="polite" className="sr-only">
              Beat {currentBeat + 1} of {beats}
            </div>
            
            {/* LED Row */}
            <div className="flex items-center justify-center mb-6">
              {Array.from({ length: beats }).map((_, i) => {
                const isActive = i === currentBeat;
                const isFirstBeat = i === 0;
                return (
                  <div key={i} className="flex items-center justify-center w-8 sm:w-10">
                    <motion.div
                      className={cn(
                        "h-3 w-3 sm:h-3.5 sm:w-3.5 rounded-full border transition-transform duration-100",
                        isActive
                          ? isFirstBeat
                            ? "bg-blue-400 border-blue-300 scale-110 shadow-[0_0_0_4px_rgba(59,130,246,0.35)]" // stronger accent for beat 1
                            : "bg-blue-300 border-blue-200 scale-110 shadow-[0_0_0_3px_rgba(147,197,253,0.25)]"
                          : "bg-slate-800 border-slate-600"
                      )}
                      animate={isActive ? { scale: 1.1 } : { scale: 1 }}
                      transition={{ duration: 0.1, ease: "easeOut" }}
                    />
                  </div>
                );
              })}
            </div>

            {/* Numeric Counter - hide when beats > 8 */}
            {beats <= 8 && (
              <div className="mt-2 flex justify-center text-sm sm:text-base font-medium">
                {Array.from({ length: beats }).map((_, i) => {
                  const isActive = i === currentBeat;
                  const isFirstBeat = i === 0;
                  return (
                    <div key={i} className="flex items-center justify-center w-8 sm:w-10">
                      <motion.span
                        className={cn(
                          "transition-all duration-100 text-center",
                          isActive
                            ? isFirstBeat
                              ? "text-blue-400 font-extrabold scale-110" // stronger accent for beat 1
                              : "text-blue-300 font-extrabold scale-110"
                            : "text-slate-400"
                        )}
                        animate={isActive ? { scale: 1.1 } : { scale: 1 }}
                        transition={{ duration: 0.1, ease: "easeOut" }}
                      >
                        {i + 1}
                      </motion.span>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-4 text-center text-xs text-muted-foreground">
              {t('prep.metronome.labels.footnote', { grouping, count: countInBars })}
            </div>
          </motion.div>
          </div>

          {/* Controls (stacked below visuals) */}
          <div className="rounded-3xl border bg-card/95 p-6 space-y-8">
            <div className="space-y-3">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="text-sm text-muted-foreground cursor-help">{t('prep.metronome.labels.tempo')}</div>
                </TooltipTrigger>
                <TooltipContent>{t('prep.tips.tempo')}</TooltipContent>
              </Tooltip>
              <div className="mt-2 flex items-center gap-3">
                <Slider value={[bpm]} min={40} max={240} step={1} onValueChange={(v) => setBpm(v[0])} className="w-full" />
                <div className="w-32 text-right tabular-nums font-medium leading-tight">
                  {bpm} BPM
                  <span className="block text-xs text-muted-foreground">({tempoLabel})</span>
                </div>
              </div>
            </div>

            <div className="grid gap-6">
              <div className="space-y-6">
                <div className="space-y-3">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="text-sm text-muted-foreground cursor-help">{t('prep.metronome.labels.beatsPerBar')}</div>
                    </TooltipTrigger>
                    <TooltipContent>{t('prep.tips.beats')}</TooltipContent>
                  </Tooltip>
                  <Tabs value={String(beats)} onValueChange={(v) => setBeats(parseInt(v))}>
                    <TabsList
                      className="grid grid-cols-4 sm:grid-cols-8 gap-2 w-full rounded-xl bg-slate-900/60 p-1 [&>button]:h-9 [&>button]:px-2 [&>button]:text-xs sm:[&>button]:text-sm"
                    >
                      {[1,2,3,4,5,6,7,8].map(n => (
                        <TabsTrigger key={n} value={String(n)}>{n}</TabsTrigger>
                      ))}
                    </TabsList>
                  </Tabs>
                </div>
                <div className="space-y-3">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="text-sm text-muted-foreground cursor-help">{t('prep.metronome.labels.subdivisions')}</div>
                    </TooltipTrigger>
                    <TooltipContent>{t('prep.tips.subdiv')}</TooltipContent>
                  </Tooltip>
                  <Tabs value={String(subdiv)} onValueChange={(v) => setSubdiv(parseInt(v) as 1|2|3|4)}>
                    <TabsList className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full rounded-xl bg-slate-900/60 p-1 [&>button]:h-9 [&>button]:px-3 [&>button]:text-xs sm:[&>button]:text-sm">
                      <TabsTrigger value="1">{t('prep.metronome.subdivOptions.quarter')}</TabsTrigger>
                      <TabsTrigger value="2">{t('prep.metronome.subdivOptions.eighths')}</TabsTrigger>
                      <TabsTrigger value="3">{t('prep.metronome.subdivOptions.triplets')}</TabsTrigger>
                      <TabsTrigger value="4">{t('prep.metronome.subdivOptions.sixteenths')}</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </div>

              {subdiv === 2 && (
                <div className="space-y-3">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="text-sm text-muted-foreground cursor-help">{t('prep.metronome.labels.swing8ths')}</div>
                    </TooltipTrigger>
                    <TooltipContent>{t('prep.tips.swing')}</TooltipContent>
                  </Tooltip>
                  <div className="flex items-center gap-3">
                    <Slider value={[swing]} min={0} max={0.6} step={0.02} onValueChange={(v) => setSwing(v[0])} className="w-full" />
                    <div className="w-20 text-right tabular-nums font-medium">{Math.round(swing * 100)}%</div>
                  </div>
                </div>
              )}

              <div className="space-y-6">
                <div className="space-y-3">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="text-sm text-muted-foreground cursor-help">{t('prep.metronome.labels.sound')}</div>
                    </TooltipTrigger>
                    <TooltipContent>{t('prep.tips.sound')}</TooltipContent>
                  </Tooltip>
                  <Tabs value={sound} onValueChange={(v) => setSound(v as any)}>
                    <TabsList className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full rounded-xl bg-slate-900/60 p-1 [&>button]:h-9 [&>button]:px-3 [&>button]:text-xs sm:[&>button]:text-sm">
                      <TabsTrigger value="blip">{t('prep.metronome.soundOptions.blip')}</TabsTrigger>
                      <TabsTrigger value="woodblock">{t('prep.metronome.soundOptions.woodblock')}</TabsTrigger>
                      <TabsTrigger value="hihat">{t('prep.metronome.soundOptions.hihat')}</TabsTrigger>
                      <TabsTrigger value="clave">{t('prep.metronome.soundOptions.clave')}</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
                <div className="space-y-3">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="text-sm text-muted-foreground cursor-help">{t('prep.metronome.labels.countInBars')}</div>
                    </TooltipTrigger>
                    <TooltipContent>{t('prep.tips.countIn')}</TooltipContent>
                  </Tooltip>
                  <Tabs value={String(countInBars)} onValueChange={(v) => setCountInBars(parseInt(v))}>
                    <TabsList className="grid grid-cols-4 gap-2 w-full rounded-xl bg-slate-900/60 p-1 [&>button]:h-9 [&>button]:px-2 [&>button]:text-xs sm:[&>button]:text-sm">
                      {[0,1,2,4].map(n => (
                        <TabsTrigger key={n} value={String(n)}>{n}</TabsTrigger>
                      ))}
                    </TabsList>
                  </Tabs>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] items-end">
                <div className="space-y-3">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="text-sm text-muted-foreground cursor-help">{t('prep.metronome.labels.accentGroupingBeats')}</div>
                    </TooltipTrigger>
                    <TooltipContent>{t('prep.tips.grouping')}</TooltipContent>
                  </Tooltip>
                  <input
                    value={grouping}
                    onChange={(e) => setGrouping(e.target.value)}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    placeholder="e.g., 2+2+3 for 7/8"
                  />
                </div>
                <div className="space-y-3">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="text-sm text-muted-foreground cursor-help">{t('prep.metronome.labels.volume')}</div>
                    </TooltipTrigger>
                    <TooltipContent>{t('prep.tips.volume')}</TooltipContent>
                  </Tooltip>
                  <div className="flex items-center gap-3">
                    <Slider value={[volume]} min={0} max={1} step={0.01} onValueChange={(v) => setVolume(v[0])} className="w-full" />
                    <div className="w-16 text-right tabular-nums font-medium">{Math.round(volume * 100)}%</div>
                  </div>
                </div>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                Use "+" to group beats inside the bar. Must sum to the selected beats. Example: 7 beats with "2+2+3" accents beat 1, 3, and 5.
              </p>
            </div>

            {/* Tempo markings info - Collapsible */}
            <Collapsible className="rounded-xl border bg-slate-950 p-4">
              <CollapsibleTrigger className="w-full text-left hover:opacity-80 transition-opacity">
                <div className="text-xs text-muted-foreground uppercase tracking-wide">{t('prep.metronome.labels.tempoMarkings')} ▼</div>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3">
                {(() => {
                  const list = t('prep.metronome.tempoList', { returnObjects: true }) as unknown as string[];
                  return (
                    <div className="grid gap-x-6 gap-y-2 text-sm text-slate-200 sm:grid-cols-2">
                      {Array.isArray(list) && list.map((line, idx) => (
                        <span key={idx}>{line}</span>
                      ))}
                    </div>
                  );
                })()}
              </CollapsibleContent>
            </Collapsible>

            <div className="text-xs text-muted-foreground">{t('prep.metronome.labels.audioNote')}</div>
          </div>
        </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}

function bpmToItalian(bpm: number) {
  if (bpm < 25) return "Larghissimo";
  if (bpm < 40) return "Grave";
  if (bpm < 60) return "Largo";
  if (bpm < 66) return "Larghetto";
  if (bpm < 76) return "Adagio";
  if (bpm < 98) return "Andante";
  if (bpm < 120) return "Moderato";
  if (bpm < 156) return "Allegro";
  if (bpm < 176) return "Vivace";
  if (bpm < 200) return "Presto";
  return "Prestissimo";
}

function parseGrouping(input: string, beats: number): number[] {
  try {
    const parts = input.split("+").map((s) => parseInt(s.trim(), 10)).filter((n) => !Number.isNaN(n) && n > 0);
    const sum = parts.reduce((a, b) => a + b, 0);
    if (sum !== beats || parts.length === 0) return [0];
    let acc = 0; const accents: number[] = [];
    for (const p of parts) { accents.push(acc); acc += p; }
    return accents; // beat indices where group starts (0-based)
  } catch {
    return [0];
  }
}
