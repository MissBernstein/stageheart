"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
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

const LS_KEY = "stageheart.player.v3";

function formatTime(secs?: number) {
  if (secs == null || !Number.isFinite(secs)) return "0:00";
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function MusicPlayerCard({ className }: { className?: string }) {
  const { t } = useTranslation();
  // Elements (dual players for crossfade)
  const audioARef = useRef<HTMLAudioElement | null>(null);
  const audioBRef = useRef<HTMLAudioElement | null>(null);
  const activeRef = useRef<"A" | "B">("A");

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

  // Playlist & playback state
  const [tracks, setTracks] = useState<Track[]>([]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [shuf, setShuf] = useState(false);
  const [loopMode, setLoopMode] = useState<"off" | "one" | "all">("off");
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

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify({ tracks, index }));
  }, [tracks, index]);

  const current = tracks[index];

  // Ensure AudioContext is running before play
  const resumeAudio = useCallback(async () => {
    try { await ctxRef.current?.resume?.(); } catch {}
  }, []);

  // Build WebAudio graph once
  useEffect(() => {
    // Ensure refs exist before building graph (defensive for certain mount orders)
    if (!audioARef.current || !audioBRef.current) {
      // try once on next tick
      const id = window.setTimeout(() => {
        if (!audioARef.current || !audioBRef.current) return;
        // re-run effect body by forcing a small state update? not needed; below continues
      }, 0);
      return () => window.clearTimeout(id);
    }
    let created = false;
    try {
      const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      ctxRef.current = ctx;

    // Nodes
    const master = ctx.createGain();
    master.gain.value = muted ? 0 : volume;
    master.connect(ctx.destination);
    masterGainRef.current = master;

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyserRef.current = analyser;
    master.connect(analyser);

    const low = ctx.createBiquadFilter();
    low.type = "lowshelf"; low.frequency.value = 200; low.gain.value = lowShelf;
    const high = ctx.createBiquadFilter();
    high.type = "highshelf"; high.frequency.value = 4000; high.gain.value = highShelf;
    lowShelfRef.current = low; highShelfRef.current = high;

    // connect: sources -> gains -> low -> high -> master -> analyser -> dest
    low.connect(high).connect(master);

    // connect A
  const a = audioARef.current!; a.crossOrigin = "anonymous";
    const ga = ctx.createGain(); ga.gain.value = 1; gainARef.current = ga;
    const sa = ctx.createMediaElementSource(a); srcARef.current = sa;
    sa.connect(ga).connect(low);

  // connect B
  const b = audioBRef.current!; b.crossOrigin = "anonymous";
    const gb = ctx.createGain(); gb.gain.value = 0; gainBRef.current = gb;
    const sb = ctx.createMediaElementSource(b); srcBRef.current = sb;
    sb.connect(gb).connect(low);

    // Visualizer draw loop
    const draw = () => {
      const cvs = canvasRef.current; const ana = analyserRef.current; if (!cvs || !ana) return;
      const g = cvs.getContext("2d"); if (!g) return;
      const rect = cvs.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      cvs.width = Math.floor(rect.width * dpr); cvs.height = Math.floor(rect.height * dpr);
      if ((g as any).resetTransform) (g as any).resetTransform(); else g.setTransform(1,0,0,1,0,0);
      g.scale(dpr, dpr);
      const w = rect.width, h = rect.height;
      const data = new Uint8Array(ana.frequencyBinCount);
      ana.getByteFrequencyData(data);
      g.clearRect(0,0,w,h);
      const bars = 32; const step = Math.floor(data.length / bars);
      for (let i=0;i<bars;i++){
        const v = data[i*step] / 255; const bw = (w/bars) * 0.7; const x = (w/bars) * i + (w/bars-bw)/2; const bh = Math.max(2, v*h);
        g.fillStyle = "#9cc9ff"; g.fillRect(x, h-bh, bw, bh);
      }
      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);
    created = true;

    return () => {
      cancelAnimationFrame(rafRef.current);
      try {
        if (created) {
          srcARef.current?.disconnect();
          srcBRef.current?.disconnect();
          low.disconnect();
          high.disconnect();
          master.disconnect();
          analyser.disconnect();
          ctx.close();
        }
      } catch {}
      analyserRef.current = null; masterGainRef.current = null; srcARef.current = null; srcBRef.current = null; gainARef.current = null; gainBRef.current = null; lowShelfRef.current = null; highShelfRef.current = null; ctxRef.current = null;
    };
    } catch (e) {
      console.error("MusicPlayer init failed", e);
      return () => { /* no graph created */ };
    }
  }, []);

  // Keep volume/mute/EQ in sync
  useEffect(() => { if (masterGainRef.current) masterGainRef.current.gain.value = muted ? 0 : volume; }, [volume, muted]);
  useEffect(() => { if (lowShelfRef.current) lowShelfRef.current.gain.value = lowShelf; }, [lowShelf]);
  useEffect(() => { if (highShelfRef.current) highShelfRef.current.gain.value = highShelf; }, [highShelf]);

  // Attach element listeners (timeupdate, ended) for both players
  useEffect(() => {
    const onTime = () => {
      const el = activeRef.current === "A" ? audioARef.current! : audioBRef.current!;
      setPosition(el.currentTime || 0);
      setDuration(el.duration || 0);
      if (abOn && A != null && B != null && B > A && el.currentTime >= B - 0.01) {
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
    const el = activeRef.current === "A" ? audioARef.current! : audioBRef.current!;
    if (playing) {
      resumeAudio().then(()=>{
        el.play().catch(()=>setPlaying(false));
      });
    } else {
      el.pause();
    }
  }, [playing, resumeAudio]);

  // Helpers
  const playIndex = useCallback((i: number) => {
    if (i < 0 || i >= tracks.length) return;
    const canCrossfade = !!(ctxRef.current && gainARef.current && gainBRef.current);
    if (!playing || crossfade <= 0 || !canCrossfade) {
      setIndex(i);
      const act = activeRef.current; const el = act === "A" ? audioARef.current! : audioBRef.current!;
      el.src = tracks[i].src; el.currentTime = 0; setPosition(0); setDuration(0);
      resumeAudio().then(()=> setPlaying(true));
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
  resumeAudio().then(()=>{ toEl.play().catch(()=>{}); });
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
  }, [tracks.length, crossfade, playing, tracks, resumeAudio]);

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

  // File handling
  const onFiles = async (files: FileList | null) => {
    if (!files || !files.length) return;
    const added: Track[] = [];
    for (const f of Array.from(files)){
      if (!f.type.startsWith("audio/")) continue;
      const url = URL.createObjectURL(f);
      added.push({ id: crypto.randomUUID(), title: f.name.replace(/\.[^/.]+$/, ""), src: url, fileName: f.name });
    }
    setTracks(t => [...t, ...added]);
    if (tracks.length === 0 && added.length > 0) setIndex(0);
  };

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

  const removeAt = (i: number) => {
    setTracks(t => {
      const next = t.slice();
      const [removed] = next.splice(i,1);
      if (removed?.src.startsWith("blob:")) URL.revokeObjectURL(removed.src);
      if (i < index) setIndex(idx=>Math.max(0, idx-1));
      else if (i === index) setPlaying(false);
      return next;
    });
  };

  // Drag to reorder handlers
  const onDragStart = (i: number) => (e: React.DragEvent) => { dragIndexRef.current = i; e.dataTransfer.effectAllowed = "move"; };
  const onDragOver = (i: number) => (e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; };
  const onDrop = (i: number) => (e: React.DragEvent) => {
    e.preventDefault();
    const from = dragIndexRef.current; dragIndexRef.current = null;
    if (from == null || from === i) return;
    setTracks(list => {
      const copy = list.slice();
      const [moved] = copy.splice(from,1);
      copy.splice(i,0,moved);
      return copy;
    });
    if (from < index && i >= index) setIndex(prev=>prev-1);
    if (from > index && i <= index) setIndex(prev=>prev+1);
  };

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
  const importJsonInputRef = useRef<HTMLInputElement | null>(null);
  const onImportJson = async (files: FileList | null) => {
    if (!files || !files[0]) return;
    try {
      const text = await files[0].text();
      const arr = JSON.parse(text) as Array<{ title: string; src: string; fileName?: string }>;
      const sanitized: Track[] = [];
      for (const it of arr) {
        if (!it || typeof it.title !== "string" || typeof it.src !== "string") continue;
        // skip blob: URLs (not valid across sessions)
        if (it.src.startsWith("blob:")) continue;
        sanitized.push({ id: crypto.randomUUID(), title: it.title, src: it.src, fileName: it.fileName });
      }
      if (sanitized.length) setTracks(t => [...t, ...sanitized]);
      else alert("No usable tracks found. Only http(s) URLs can be imported.");
    } catch (e) {
      alert("Invalid JSON playlist.");
    } finally {
      if (importJsonInputRef.current) importJsonInputRef.current.value = "";
    }
  };

  // Rename
  const startRename = (t: Track) => { setRenaming(t.id); setRenameText(t.title); };
  const confirmRename = (t: Track) => {
    const val = renameText.trim(); if (!val) { setRenaming(null); return; }
    setTracks(list => list.map(x => x.id === t.id ? { ...x, title: val } : x));
    setRenaming(null);
  };

  return (
    <Card className={cn("w-full max-w-3xl mx-auto", className)}>
  <CardHeader className="flex flex-col gap-4">
        <CardTitle className="text-lg flex items-center gap-2"><Music className="h-5 w-5"/>Music Player</CardTitle>
  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Button variant="outline" onClick={() => document.getElementById("file-input")?.click()} title={t('prep.player.help.addFiles') as string}><Upload className="h-4 w-4 mr-2"/>Add Files</Button>
          <input id="file-input" type="file" accept="audio/*" multiple className="hidden" onChange={(e)=>onFiles(e.target.files)} />
          <Button variant="outline" onClick={addUrl} title={t('prep.player.help.addUrl') as string}><LinkIcon className="h-4 w-4 mr-2"/>Add URL</Button>
          <Button variant="outline" onClick={exportJson}><Download className="h-4 w-4 mr-2"/>Export</Button>
          <Button variant="outline" onClick={() => importJsonInputRef.current?.click()} title={t('prep.player.help.import') as string}><Upload className="h-4 w-4 mr-2"/>Import</Button>
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
        <div className="grid gap-6 md:grid-cols-2">
          {/* Visualizer + Transport */}
          <div className="rounded-2xl border bg-gradient-to-b from-slate-900 to-slate-950 p-6">
            {/* Visualizer */}
            <div className="rounded-xl border bg-slate-950 h-28 overflow-hidden">
              <canvas ref={canvasRef} className="w-full h-full"/>
            </div>
            {/* Title */}
            <div className="mt-3 text-base font-medium truncate">{current?.title ?? "No track selected"}</div>

            {/* Transport */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button size="icon" variant="secondary" onClick={prevTrack} disabled={!tracks.length}><SkipBack className="h-4 w-4"/></Button>
              <Button size="icon" onClick={()=>setPlaying(p=>!p)} disabled={!tracks.length}>
                {playing ? <Pause className="h-5 w-5"/> : <Play className="h-5 w-5"/>}
              </Button>
              <Button size="icon" variant="secondary" onClick={nextTrack} disabled={!tracks.length}><SkipForward className="h-4 w-4"/></Button>
              <div className="ml-2 flex items-center gap-2">
                <Button size="icon" variant={shuf?"default":"secondary"} onClick={()=>setShuf(s=>!s)} title="Shuffle"><Shuffle className="h-4 w-4"/></Button>
                <Button size="icon" variant={loopMode!=="off"?"default":"secondary"} onClick={()=>setLoopMode(m=>m==="off"?"all":m==="all"?"one":"off")} title="Loop (off/all/one)"><Repeat className="h-4 w-4"/></Button>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Crossfade</span>
                <Slider value={[crossfade]} min={0} max={5} step={0.1} onValueChange={(v)=>setCrossfade(v[0])} className="w-32"/>
                <div className="w-10 text-right text-xs tabular-nums">{crossfade.toFixed(1)}s</div>
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

            {/* A/B loop */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button variant="secondary" size="sm" onClick={()=>{ setA(position); if (B!=null && B<=position) setB(null); }} title="Set loop start"><Flag className="h-4 w-4 mr-1"/>Set A</Button>
              <Button variant="secondary" size="sm" onClick={()=>{ if (A!=null && position>A) setB(position); }} title="Set loop end"><BookmarkPlus className="h-4 w-4 mr-1"/>Set B</Button>
              <Button size="sm" onClick={()=>setAbOn(v=>!v)} variant={abOn?"default":"secondary"} title="Toggle A/B loop"><RefreshCcw className="h-4 w-4 mr-1"/>{abOn?"A/B On":"A/B Off"}</Button>
              <div className="text-xs text-muted-foreground ml-auto">A: {A!=null?formatTime(A):"--"} · B: {B!=null?formatTime(B):"--"}</div>
            </div>
          </div>

          {/* Playlist (drag-reorder + rename) */}
          <div className="rounded-2xl border bg-card p-6">
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
