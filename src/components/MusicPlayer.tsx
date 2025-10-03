"use client";
import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Repeat,
  Shuffle,
  Volume2,
  VolumeX,
  Music,
  Upload,
  Trash2,
  Link as LinkIcon,
  GripVertical,
  RefreshCcw,
  Download,
  Pencil,
  Check,
  X,
  Flag,
  BookmarkPlus,
  ChevronDown,
} from "lucide-react";

// -------------------------------------------------------------
// Stage Heart · Prep Tools · Music Player (React, no extra deps)
// - Local & URL tracks, playlist, loop/shuffle, seek, volume
// - Lightweight analyzer (Web Audio)
// - Drag-to-reorder playlist, Crossfade, A/B loop
// - Import/Export playlist (JSON), Inline rename, Tiny EQ (low/high shelf)
// -------------------------------------------------------------

type Track = {
  id: string;
  title: string;
  src: string; // object URL (blob) or remote URL
  duration?: number;
  fileName?: string;
};

type LoopMode = "off" | "one" | "all";
type ActivePlayer = "A" | "B";

const LS_KEY = "stageheart.player.v3";
const POSITION_UPDATE_THROTTLE = 100; // ms
const STORAGE_DEBOUNCE = 250; // ms
const ANALYZER_FPS = 30;

// Utility functions
function formatTime(secs?: number): string {
  if (secs == null || !Number.isFinite(secs)) return "0:00";
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function createTrackFromFile(file: File): Track {
  return {
    id: crypto.randomUUID(),
    title: file.name.replace(/\.[^/.]+$/, ""),
    src: URL.createObjectURL(file),
    fileName: file.name
  };
}

function revokeTrackUrl(track: Track): void {
  if (track.src.startsWith("blob:")) {
    URL.revokeObjectURL(track.src);
  }
}

export default function MusicPlayerCard({ className }: { className?: string }) {
  const { t } = useTranslation();
  const fileInputId = useId();
  const importInputId = useId();
  
  // Elements (dual players for crossfade)
  const audioARef = useRef<HTMLAudioElement | null>(null);
  const audioBRef = useRef<HTMLAudioElement | null>(null);
  const activeRef = useRef<ActivePlayer>("A");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const importJsonInputRef = useRef<HTMLInputElement | null>(null);
  const isMountedRef = useRef(true);

  // WebAudio graph
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const lowShelfRef = useRef<BiquadFilterNode | null>(null);
  const highShelfRef = useRef<BiquadFilterNode | null>(null);
  const gainARef = useRef<GainNode | null>(null);
  const gainBRef = useRef<GainNode | null>(null);
  const srcARef = useRef<MediaElementAudioSourceNode | null>(null);
  const srcBRef = useRef<MediaElementAudioSourceNode | null>(null);
  const rafRef = useRef<number>(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const nextTrackRef = useRef<() => boolean>(() => false);
  const lastPositionUpdateRef = useRef(0);
  const storageTimeoutRef = useRef<number | null>(null);
  const canvasSizeRef = useRef({ width: 0, height: 0 });

  // Playlist & playback state
  const [tracks, setTracks] = useState<Track[]>([]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [shuf, setShuf] = useState(false);
  const [loopMode, setLoopMode] = useState<LoopMode>("off");
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.9);
  const [muted, setMuted] = useState(false);
  const [crossfade, setCrossfade] = useState(1.5); // seconds
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // A/B loop
  const [A, setA] = useState<number | null>(null);
  const [B, setB] = useState<number | null>(null);
  const [abOn, setAbOn] = useState(false);

  // Rename inline
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameText, setRenameText] = useState("");

  // Drag to reorder
  const dragIndexRef = useRef<number | null>(null);

  // EQ
  const [lowShelf, setLowShelf] = useState(0); // dB -12..+12
  const [highShelf, setHighShelf] = useState(0); // dB -12..+12

  // Responsive: collapse some sections on small screens
  const [isDesktop, setIsDesktop] = useState(true);
  const [showViz, setShowViz] = useState(true);
  const [showAB, setShowAB] = useState(true);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onResize = () => setIsDesktop(window.innerWidth >= 640);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  useEffect(() => {
    // Auto-expand on desktop, collapse on mobile by default
    setShowViz(isDesktop);
    setShowAB(isDesktop);
  }, [isDesktop]);

  // Load persisted playlist
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as { tracks: Track[]; index: number };
        setTracks(saved.tracks || []);
        setIndex(Math.min(Math.max(0, saved.index || 0), Math.max(0, (saved.tracks || []).length - 1)));
      }
    } catch {}
  }, []);

  // Debounced localStorage save
  const saveToStorage = useCallback(() => {
    if (storageTimeoutRef.current) {
      clearTimeout(storageTimeoutRef.current);
    }
    storageTimeoutRef.current = window.setTimeout(() => {
      if (isMountedRef.current) {
        try {
          localStorage.setItem(LS_KEY, JSON.stringify({ tracks, index }));
        } catch (error) {
          console.warn('Failed to save playlist to localStorage:', error);
        }
      }
    }, STORAGE_DEBOUNCE);
  }, [tracks, index]);

  useEffect(() => {
    saveToStorage();
  }, [saveToStorage]);

  const current = tracks[index];

  // Lazy audio context initialization
  const ensureAudioGraph = useCallback(async (): Promise<boolean> => {
    if (ctxRef.current && ctxRef.current.state !== 'closed') {
      if (ctxRef.current.state === 'suspended') {
        try {
          await ctxRef.current.resume();
        } catch (error) {
          console.warn('Failed to resume AudioContext:', error);
          return false;
        }
      }
      return true;
    }

    // Ensure audio elements exist
    if (!audioARef.current || !audioBRef.current) {
      console.warn('Audio elements not ready');
      return false;
    }

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) {
        console.warn('Web Audio API not supported');
        return false;
      }

      const ctx = new AudioCtx();
      ctxRef.current = ctx;

      // Create nodes
      const master = ctx.createGain();
      master.gain.value = muted ? 0 : volume;
      master.connect(ctx.destination);
      masterGainRef.current = master;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;
      master.connect(analyser);

      const low = ctx.createBiquadFilter();
      low.type = "lowshelf";
      low.frequency.value = 200;
      low.gain.value = lowShelf;
      
      const high = ctx.createBiquadFilter();
      high.type = "highshelf";
      high.frequency.value = 4000;
      high.gain.value = highShelf;
      
      lowShelfRef.current = low;
      highShelfRef.current = high;
      low.connect(high).connect(master);

      // Connect audio elements
      const a = audioARef.current;
      const b = audioBRef.current;
      
      a.crossOrigin = "anonymous";
      b.crossOrigin = "anonymous";
      
      const ga = ctx.createGain();
      ga.gain.value = 1;
      gainARef.current = ga;
      const sa = ctx.createMediaElementSource(a);
      srcARef.current = sa;
      sa.connect(ga).connect(low);

      const gb = ctx.createGain();
      gb.gain.value = 0;
      gainBRef.current = gb;
      const sb = ctx.createMediaElementSource(b);
      srcBRef.current = sb;
      sb.connect(gb).connect(low);

      // Start analyzer if canvas is ready
      if (canvasRef.current) {
        startAnalyzerLoop();
      }

      return true;
    } catch (error) {
      console.error('Failed to initialize audio graph:', error);
      return false;
    }
  }, [volume, muted, lowShelf, highShelf]);

  // Optimized analyzer loop with ResizeObserver
  const startAnalyzerLoop = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }

    const draw = () => {
      if (!isMountedRef.current) return;
      
      const cvs = canvasRef.current;
      const ana = analyserRef.current;
      if (!cvs || !ana) return;

      const g = cvs.getContext("2d");
      if (!g) return;

      const rect = cvs.getBoundingClientRect();
      const newWidth = Math.floor(rect.width);
      const newHeight = Math.floor(rect.height);
      
      // Only resize canvas if dimensions changed
      if (canvasSizeRef.current.width !== newWidth || canvasSizeRef.current.height !== newHeight) {
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        cvs.width = newWidth * dpr;
        cvs.height = newHeight * dpr;
        g.scale(dpr, dpr);
        canvasSizeRef.current = { width: newWidth, height: newHeight };
      }

      const data = new Uint8Array(ana.frequencyBinCount);
      ana.getByteFrequencyData(data);
      
      g.clearRect(0, 0, newWidth, newHeight);
      
      const bars = 32;
      const step = Math.floor(data.length / bars);
      const barWidth = (newWidth / bars) * 0.7;
      
      for (let i = 0; i < bars; i++) {
        const value = data[i * step] / 255;
        const x = (newWidth / bars) * i + (newWidth / bars - barWidth) / 2;
        const barHeight = Math.max(2, value * newHeight);
        g.fillStyle = "#9cc9ff";
        g.fillRect(x, newHeight - barHeight, barWidth, barHeight);
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
  }, []);

  // Component cleanup
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      if (storageTimeoutRef.current) {
        clearTimeout(storageTimeoutRef.current);
      }
      // Cleanup audio graph
      try {
        srcARef.current?.disconnect();
        srcBRef.current?.disconnect();
        lowShelfRef.current?.disconnect();
        highShelfRef.current?.disconnect();
        masterGainRef.current?.disconnect();
        analyserRef.current?.disconnect();
        ctxRef.current?.close();
      } catch (error) {
        console.warn('Cleanup error:', error);
      }
      // Revoke blob URLs
      tracks.forEach(revokeTrackUrl);
    };
  }, [tracks]);

  // Keep volume/mute/EQ in sync
  useEffect(() => { if (masterGainRef.current) masterGainRef.current.gain.value = muted ? 0 : volume; }, [volume, muted]);
  useEffect(() => { if (lowShelfRef.current) lowShelfRef.current.gain.value = lowShelf; }, [lowShelf]);
  useEffect(() => { if (highShelfRef.current) highShelfRef.current.gain.value = highShelf; }, [highShelf]);

  // Attach element listeners (timeupdate, ended) for both players
  useEffect(() => {
    const onTime = () => {
      if (!isMountedRef.current) return;
      
      const el = activeRef.current === "A" ? audioARef.current : audioBRef.current;
      if (!el) return;
      
      const now = Date.now();
      if (now - lastPositionUpdateRef.current < POSITION_UPDATE_THROTTLE) return;
      
      const currentTime = el.currentTime || 0;
      const currentDuration = el.duration || 0;
      
      setPosition(currentTime);
      setDuration(currentDuration);
      lastPositionUpdateRef.current = now;
      
      // A/B loop check
      if (abOn && A != null && B != null && B > A && currentTime >= B - 0.01) {
        el.currentTime = A;
      }
    };
    const onEnded = () => {
      if (loopMode === "one") {
        const el = activeRef.current === "A" ? audioARef.current! : audioBRef.current!;
        el.currentTime = A ?? 0; el.play();
      } else {
        const moved = nextTrackRef.current();
        if (!moved) {
          setPlaying(false);
        }
      }
    };
    const a = audioARef.current!, b = audioBRef.current!;
    a.addEventListener("timeupdate", onTime); b.addEventListener("timeupdate", onTime);
    a.addEventListener("ended", onEnded); b.addEventListener("ended", onEnded);
    const onErr = () => {
      setErrorMsg("Failed to load audio. Use a direct audio URL (e.g., .mp3) with CORS enabled, or add a local file.");
      setPlaying(false);
    };
    a.addEventListener("error", onErr); b.addEventListener("error", onErr);
    return () => {
      a.removeEventListener("timeupdate", onTime); b.removeEventListener("timeupdate", onTime);
      a.removeEventListener("ended", onEnded); b.removeEventListener("ended", onEnded);
      a.removeEventListener("error", onErr); b.removeEventListener("error", onErr);
    };
  }, [A, B, abOn, loopMode]);

  // Load current track into active element on change
  useEffect(() => {
    if (!current) { setPlaying(false); return; }
    const act = activeRef.current;
    const el = act === "A" ? audioARef.current! : audioBRef.current!;
    if (!current.src) { setPlaying(false); return; }
    try { el.crossOrigin = "anonymous"; } catch {}
    el.src = current.src; el.currentTime = 0; setErrorMsg(null);
    if (playing) el.play().catch(()=>{});
  }, [current?.id]);

  // Play/Pause toggles active element
  useEffect(() => {
    const el = activeRef.current === "A" ? audioARef.current : audioBRef.current;
    if (!el || !isMountedRef.current) return;
    
    if (playing) {
      ensureAudioGraph().then((success) => {
        if (success && isMountedRef.current && el) {
          el.play().catch((error) => {
            console.warn('Playback failed:', error);
            if (isMountedRef.current) {
              setPlaying(false);
            }
          });
        }
      });
    } else {
      el.pause();
    }
  }, [playing, ensureAudioGraph]);

  // Helpers
  const playIndex = useCallback((i: number) => {
    if (i < 0 || i >= tracks.length) return;
    const canCrossfade = !!(ctxRef.current && gainARef.current && gainBRef.current);
    if (!playing || crossfade <= 0 || !canCrossfade) {
      setIndex(i);
      const act = activeRef.current; const el = act === "A" ? audioARef.current! : audioBRef.current!;
      el.src = tracks[i].src; el.currentTime = 0; setPosition(0); setDuration(0);
      ensureAudioGraph().then((success) => {
        if (success) setPlaying(true);
      });
      return;
    }
    // Crossfade: load into inactive, ramp gains, then swap active
    const now = (ctxRef.current?.currentTime ?? 0);
    const fade = Math.max(0.2, crossfade);
    const act = activeRef.current;
    const fromEl = act === "A" ? audioARef.current! : audioBRef.current!;
    const fromGain = act === "A" ? gainARef.current! : gainBRef.current!;
    const toEl = act === "A" ? audioBRef.current! : audioARef.current!;
    const toGain = act === "A" ? gainBRef.current! : gainARef.current!;

    toEl.src = tracks[i].src; toEl.currentTime = 0; toGain.gain.setValueAtTime(0, now);
  ensureAudioGraph().then((success) => {
    if (success) {
      toEl.play().catch(() => {});
    }
  });
    // ramp
    fromGain.gain.cancelScheduledValues(now); toGain.gain.cancelScheduledValues(now);
    fromGain.gain.setValueAtTime(fromGain.gain.value, now); fromGain.gain.linearRampToValueAtTime(0.0001, now + fade);
    toGain.gain.setValueAtTime(0.0001, now); toGain.gain.linearRampToValueAtTime(1, now + fade);

    // finalize swap
    window.setTimeout(() => {
      fromEl.pause();
      activeRef.current = act === "A" ? "B" : "A";
      setIndex(i); setPosition(0); setDuration(0);
    }, fade * 1000 + 50);
  }, [tracks.length, crossfade, playing, tracks, ensureAudioGraph]);

  const nextTrack = useCallback((): boolean => {
    if (tracks.length === 0) return false;
    let n = index;
    if (shuf && tracks.length > 1){
      n = Math.floor(Math.random()*tracks.length);
      if (n === index) n = (index+1)%tracks.length;
    } else if (index < tracks.length-1) n = index+1;
    else if (loopMode === "all") n = 0;
    else return false;
    playIndex(n);
    return true;
  }, [index, loopMode, shuf, tracks.length, playIndex]);

  // keep ref in sync
  useEffect(() => { nextTrackRef.current = nextTrack; }, [nextTrack]);

  const prevTrack = () => setIndex(i => (i > 0 ? (playIndex(i-1), i-1) : 0));

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === " ") { e.preventDefault(); setPlaying(p=>!p); }
      if (e.key === "ArrowRight") { const el = activeRef.current === "A" ? audioARef.current! : audioBRef.current!; el.currentTime = Math.min(duration, (el.currentTime||0)+5); }
      if (e.key === "ArrowLeft") { const el = activeRef.current === "A" ? audioARef.current! : audioBRef.current!; el.currentTime = Math.max(0, (el.currentTime||0)-5); }
      if (e.key === "ArrowUp") { setVolume(v=>Math.min(1, v+0.05)); }
      if (e.key === "ArrowDown") { setVolume(v=>Math.max(0, v-0.05)); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [duration]);

  // File handling with proper types
  const onFiles = useCallback((files: FileList | null) => {
    if (!files?.length) return;
    
    const added: Track[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("audio/")) continue;
      added.push(createTrackFromFile(file));
    }
    
    if (added.length > 0) {
      setTracks(prev => {
        const next = [...prev, ...added];
        if (prev.length === 0) {
          setIndex(0);
        }
        return next;
      });
    }
  }, []);

  const addUrl = () => {
    const u = prompt("Add audio URL (https://…)");
    if (!u) return;
    const title = prompt("Title for this track?") || "Track";
    try {
      const parsed = new URL(u);
      if (!/^https?:$/.test(parsed.protocol)) throw new Error("Only http(s) URLs supported");
    } catch {
      setErrorMsg("Invalid URL. Please use a full http(s) link to a direct audio file.");
      return;
    }
    setTracks(t => [...t, { id: crypto.randomUUID(), title, src: u }]);
    setErrorMsg(null);
  };

  const removeAt = useCallback((i: number) => {
    setTracks(prev => {
      if (i < 0 || i >= prev.length) return prev;
      
      const next = [...prev];
      const [removed] = next.splice(i, 1);
      
      // Clean up blob URL
      if (removed) {
        revokeTrackUrl(removed);
      }
      
      // Update index and playing state
      if (i < index) {
        setIndex(idx => Math.max(0, idx - 1));
      } else if (i === index) {
        setPlaying(false);
        if (next.length > 0) {
          setIndex(idx => Math.min(idx, next.length - 1));
        }
      }
      
      return next;
    });
  }, [index]);

  // Drag to reorder handlers with proper types
  const onDragStart = useCallback((i: number) => (e: React.DragEvent<HTMLLIElement>) => {
    dragIndexRef.current = i;
    e.dataTransfer.effectAllowed = "move";
  }, []);
  
  const onDragOver = useCallback((i: number) => (e: React.DragEvent<HTMLLIElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);
  
  const onDrop = useCallback((i: number) => (e: React.DragEvent<HTMLLIElement>) => {
    e.preventDefault();
    const from = dragIndexRef.current;
    dragIndexRef.current = null;
    
    if (from == null || from === i) return;
    
    setTracks(list => {
      const copy = [...list];
      const [moved] = copy.splice(from, 1);
      copy.splice(i, 0, moved);
      return copy;
    });
    
    // Update current index if needed
    if (from < index && i >= index) {
      setIndex(prev => prev - 1);
    } else if (from > index && i <= index) {
      setIndex(prev => prev + 1);
    } else if (from === index) {
      setIndex(i);
    }
  }, [index]);

  const setSeek = (t: number) => {
    const el = activeRef.current === "A" ? audioARef.current! : audioBRef.current!;
    el.currentTime = Math.max(0, Math.min(duration, t));
    setPosition(el.currentTime);
  };

  // Import/Export
  const exportJson = () => {
    const payload = tracks.map(({ title, src, fileName }) => ({ title, src, fileName }));
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "stageheart-playlist.json"; a.click();
    URL.revokeObjectURL(url);
  };
  const onImportJson = useCallback(async (files: FileList | null) => {
    if (!files?.[0]) return;
    
    try {
      const text = await files[0].text();
      const data = JSON.parse(text);
      
      if (!Array.isArray(data)) {
        throw new Error('Invalid playlist format');
      }
      
      const sanitized: Track[] = [];
      for (const item of data) {
        if (!item || typeof item.title !== "string" || typeof item.src !== "string") continue;
        // Skip blob URLs (not valid across sessions)
        if (item.src.startsWith("blob:")) continue;
        
        sanitized.push({
          id: crypto.randomUUID(),
          title: item.title,
          src: item.src,
          fileName: item.fileName
        });
      }
      
      if (sanitized.length) {
        setTracks(prev => [...prev, ...sanitized]);
      } else {
        setErrorMsg("No usable tracks found. Only http(s) URLs can be imported.");
        setTimeout(() => setErrorMsg(null), 5000);
      }
    } catch (error) {
      console.error('Import error:', error);
      setErrorMsg("Invalid JSON playlist format.");
      setTimeout(() => setErrorMsg(null), 5000);
    } finally {
      if (importJsonInputRef.current) {
        importJsonInputRef.current.value = "";
      }
    }
  }, []);

  // Rename
  const startRename = (t: Track) => { setRenaming(t.id); setRenameText(t.title); };
  const confirmRename = (t: Track) => {
    const val = renameText.trim(); if (!val) { setRenaming(null); return; }
    setTracks(list => list.map(x => x.id === t.id ? { ...x, title: val } : x));
    setRenaming(null);
  };

  return (
    <Card className={cn("w-full max-w-3xl mx-auto border-0 shadow-none", className)}>
  <CardHeader className="flex flex-col gap-4 pt-0">
        {/* Title removed per request; keep actions only */}
  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
    <Button className="w-full motion-safe:transition-transform motion-safe:hover:-translate-y-0.5" variant="outline" onClick={() => document.getElementById("file-input")?.click()} title={t('prep.player.help.addFiles') as string}><Upload className="h-4 w-4 mr-2"/>Add Files</Button>
          <input id="file-input" type="file" accept="audio/*" multiple className="hidden" onChange={(e)=>onFiles(e.target.files)} />
    <Button className="w-full motion-safe:transition-transform motion-safe:hover:-translate-y-0.5" variant="outline" onClick={addUrl} title={t('prep.player.help.addUrl') as string}><LinkIcon className="h-4 w-4 mr-2"/>Add URL</Button>
    <Button className="w-full motion-safe:transition-transform motion-safe:hover:-translate-y-0.5" variant="outline" onClick={exportJson}><Download className="h-4 w-4 mr-2"/>Export</Button>
    <Button className="w-full motion-safe:transition-transform motion-safe:hover:-translate-y-0.5" variant="outline" onClick={() => importJsonInputRef.current?.click()} title={t('prep.player.help.import') as string}><Upload className="h-4 w-4 mr-2"/>Import</Button>
          <input ref={importJsonInputRef} type="file" accept="application/json" className="hidden" onChange={(e)=>onImportJson(e.target.files)} />
        </div>
        <div className="text-xs text-muted-foreground sm:text-right">{t('prep.player.help.addUrl')}</div>
      </CardHeader>
      <CardContent>
        {errorMsg && (
          <div className="mb-3 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {errorMsg}
          </div>
        )}
        <div className="grid gap-5 sm:gap-6 md:grid-cols-2">
          {/* Visualizer + Transport */}
          <div className="rounded-2xl border bg-gradient-to-b from-slate-900 to-slate-950 p-4 sm:p-6 motion-safe:transition-transform motion-safe:hover:-translate-y-0.5 hover:shadow-lg">
            {/* Visualizer (collapsible on mobile) */}
            <button
              type="button"
              className="sm:hidden w-full rounded-md bg-slate-900/60 px-3 py-2 text-left text-xs text-slate-200 flex items-center justify-between border border-slate-800"
              onClick={()=> setShowViz(v=>!v)}
            >
              <span>Visualizer</span>
              <ChevronDown className={cn("h-4 w-4 transition-transform", showViz ? "rotate-180" : "")} />
            </button>
            {(isDesktop || showViz) && (
              <div className="mt-2 sm:mt-0 rounded-xl border bg-slate-950 h-24 sm:h-28 overflow-hidden">
                <canvas ref={canvasRef} className="w-full h-full"/>
              </div>
            )}
            {/* Current title */}
            <div className="mt-3 text-base sm:text-base text-sm font-medium truncate">{current?.title ?? "No track selected"}</div>

            {/* Transport */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button size="icon" className="motion-safe:transition-transform motion-safe:hover:-translate-y-0.5" variant="secondary" onClick={prevTrack} disabled={!tracks.length}><SkipBack className="h-4 w-4"/></Button>
              <Button size="icon" className="h-9 w-9 sm:h-10 sm:w-10 motion-safe:transition-transform motion-safe:hover:-translate-y-0.5" onClick={()=>setPlaying(p=>!p)} disabled={!tracks.length}>
                {playing ? <Pause className="h-5 w-5"/> : <Play className="h-5 w-5"/>}
              </Button>
              <Button size="icon" className="motion-safe:transition-transform motion-safe:hover:-translate-y-0.5" variant="secondary" onClick={nextTrack} disabled={!tracks.length}><SkipForward className="h-4 w-4"/></Button>
              <Button size="icon" className="motion-safe:transition-transform motion-safe:hover:-translate-y-0.5" variant={shuf?"default":"secondary"} onClick={()=>setShuf(s=>!s)} title="Shuffle"><Shuffle className="h-4 w-4"/></Button>
              <Button size="icon" className="motion-safe:transition-transform motion-safe:hover:-translate-y-0.5" variant={loopMode!=="off"?"default":"secondary"} onClick={()=>setLoopMode(m=>m==="off"?"all":m==="all"?"one":"off")} title="Loop (off/all/one)"><Repeat className="h-4 w-4"/></Button>
              <div className="w-full sm:w-auto sm:ml-auto mt-2 sm:mt-0 flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Crossfade</span>
                <Slider value={[crossfade]} min={0} max={5} step={0.1} onValueChange={(v)=>setCrossfade(v[0])} className="w-full sm:w-32"/>
                <div className="w-10 text-right text-xs tabular-nums hidden sm:block">{crossfade.toFixed(1)}s</div>
              </div>
            </div>

            {/* Seek */}
            <div className="mt-4">
              <div className="flex items-center gap-3">
                <div className="w-14 text-xs text-muted-foreground tabular-nums">{formatTime(position)}</div>
                <Slider value={[Math.min(position,duration)]} min={0} max={Math.max(0,duration)} step={0.01}
                        onValueChange={(v)=> setSeek(v[0]) } className="w-full"/>
                <div className="w-14 text-xs text-muted-foreground tabular-nums text-right">{formatTime(duration)}</div>
              </div>
            </div>

            {/* Volume & EQ */}
            <div className="mt-4 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <Button size="icon" variant="ghost" onClick={()=>setMuted(m=>!m)} title={muted?"Unmute":"Mute"}>
                  {muted || volume===0 ? <VolumeX className="h-4 w-4"/> : <Volume2 className="h-4 w-4"/>}
                </Button>
                <Slider value={[muted?0:volume]} min={0} max={1} step={0.01} onValueChange={(v)=>{ setMuted(false); setVolume(v[0]); }} className="w-full"/>
                <div className="w-10 text-right text-xs tabular-nums">{Math.round((muted?0:volume)*100)}%</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-muted-foreground">Low Shelf (200 Hz)</div>
                  <div className="flex items-center gap-3 mt-1">
                    <Slider value={[lowShelf]} min={-12} max={12} step={0.5} onValueChange={(v)=>setLowShelf(v[0])} className="w-full"/>
                    <div className="w-10 text-right text-xs tabular-nums">{lowShelf.toFixed(0)} dB</div>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">High Shelf (4 kHz)</div>
                  <div className="flex items-center gap-3 mt-1">
                    <Slider value={[highShelf]} min={-12} max={12} step={0.5} onValueChange={(v)=>setHighShelf(v[0])} className="w-full"/>
                    <div className="w-10 text-right text-xs tabular-nums">{highShelf.toFixed(0)} dB</div>
                  </div>
                </div>
              </div>
            </div>

            {/* A/B loop (collapsible on mobile) */}
            <button
              type="button"
              className="sm:hidden mt-3 w-full rounded-md border bg-slate-900/60 px-3 py-2 text-left text-xs text-slate-200 flex items-center justify-between"
              onClick={()=> setShowAB(v=>!v)}
            >
              <span>A/B Loop</span>
              <ChevronDown className={cn("h-4 w-4 transition-transform", showAB ? "rotate-180" : "")} />
            </button>
            {(isDesktop || showAB) && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Button variant="secondary" size="sm" onClick={()=>{ setA(position); if (B!=null && B<=position) setB(null); }} title="Set loop start"><Flag className="h-4 w-4 mr-1"/>Set A</Button>
                <Button variant="secondary" size="sm" onClick={()=>{ if (A!=null && position>A) setB(position); }} title="Set loop end"><BookmarkPlus className="h-4 w-4 mr-1"/>Set B</Button>
                <Button size="sm" onClick={()=>setAbOn(v=>!v)} variant={abOn?"default":"secondary"} title="Toggle A/B loop"><RefreshCcw className="h-4 w-4 mr-1"/>{abOn?"A/B On":"A/B Off"}</Button>
                <div className="text-xs text-muted-foreground ml-auto">A: {A!=null?formatTime(A):"--"} · B: {B!=null?formatTime(B):"--"}</div>
              </div>
            )}
          </div>

          {/* Playlist (drag-reorder + rename) */}
          <div className="rounded-2xl border bg-card p-4 sm:p-6 motion-safe:transition-transform motion-safe:hover:-translate-y-0.5 hover:shadow-lg">
            <div className="text-sm text-muted-foreground">Playlist</div>
            <ul className="mt-2 divide-y divide-slate-800 rounded-xl border bg-slate-950">
              {tracks.length===0 && (
                <li className="p-4 text-xs text-muted-foreground">Add files or URLs to start building your set.</li>
              )}
              {tracks.map((t,i)=> (
                <li key={t.id}
                    draggable
                    onDragStart={onDragStart(i)} onDragOver={onDragOver(i)} onDrop={onDrop(i)}
                    className={cn("p-3 flex items-center gap-3 cursor-grab", i===index && "bg-slate-900/60")}
                    onDoubleClick={()=>{ setIndex(i); setPlaying(true); playIndex(i); }}>
                  <GripVertical className="h-4 w-4 text-slate-400"/>
                  <Button size="sm" variant={i===index?"default":"secondary"} onClick={()=> { if (i===index) setPlaying(p=>!p); else playIndex(i); }}>
                    {i===index && playing ? <Pause className="h-4 w-4"/> : <Play className="h-4 w-4"/>}
                  </Button>
                  <div className="flex-1 min-w-0">
                    {renaming === t.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          autoFocus
                          value={renameText}
                          onChange={(e)=>setRenameText(e.target.value)}
                          className="flex-1 rounded-md border bg-background px-2 py-1 text-sm"
                        />
                        <Button size="icon" variant="secondary" onClick={()=>confirmRename(t)}><Check className="h-4 w-4"/></Button>
                        <Button size="icon" variant="ghost" onClick={()=>setRenaming(null)}><X className="h-4 w-4"/></Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="truncate text-sm font-medium">{t.title}</div>
                        <Button size="icon" variant="ghost" onClick={()=>startRename(t)} title="Rename"><Pencil className="h-4 w-4"/></Button>
                      </div>
                    )}
                    {t.fileName && <div className="text-xs text-muted-foreground truncate">{t.fileName}</div>}
                  </div>
                  <Button size="icon" variant="ghost" onClick={()=>removeAt(i)} title="Remove"><Trash2 className="h-4 w-4"/></Button>
                </li>
              ))}
            </ul>
            <div className="mt-3 text-xs text-muted-foreground">Tip: Drag to reorder. Drop audio files onto this card to add them. Export imports only remote URLs (blob files can’t be restored later).</div>
          </div>
        </div>

        {/* Hidden audio elements */}
        <audio ref={audioARef} preload="metadata" />
        <audio ref={audioBRef} preload="metadata" />

        {/* Drag & Drop overlay */}
        <DropOverlay onFiles={onFiles} />
      </CardContent>
    </Card>
  );
}

function DropOverlay({ onFiles }: { onFiles: (files: FileList | null) => void }){
  const [over, setOver] = useState(false);
  useEffect(()=>{
    const onDrag = (e: DragEvent) => { e.preventDefault(); setOver(true); };
    const onLeave = (e: DragEvent) => { e.preventDefault(); setOver(false); };
    const onDrop = (e: DragEvent) => { e.preventDefault(); setOver(false); onFiles(e.dataTransfer?.files || null); };
    window.addEventListener("dragover", onDrag as any);
    window.addEventListener("dragleave", onLeave as any);
    window.addEventListener("drop", onDrop as any);
    return ()=>{ window.removeEventListener("dragover", onDrag as any); window.removeEventListener("dragleave", onLeave as any); window.removeEventListener("drop", onDrop as any); };
  }, [onFiles]);
  if (!over) return null;
  return (
    <div className="fixed inset-0 z-10 grid place-items-center bg-black/40">
      <div className="rounded-2xl border bg-slate-900 px-6 py-4 text-slate-200">
        Drop audio files to add to playlist
      </div>
    </div>
  );
}
