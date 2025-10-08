import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Mic, Upload, Loader2, Trash2, Pencil, Check, X, Star, StarOff, ArrowUp, ArrowDown, RefreshCcw, AlertCircle } from 'lucide-react';
import { Recording } from '@/types/voices';
import ToggleRow from '@/components/voices/ToggleRow';

export interface MediaPanelProps {
  recordings: Recording[];
  loadingRecordings: boolean;
  volumeDefault: number;
  setVolumeDefault: (v: number) => void;
  playAutoplay: boolean;
  setPlayAutoplay: (v: boolean) => void;
  language: string;
  setLanguage: (v: string) => void;
  updateRecordingState: (id: string, state: 'public' | 'private') => Promise<boolean>;
  toast: (opts: any) => void;
  setRecordings: React.Dispatch<React.SetStateAction<Recording[]>>;
}

import { supabase } from '@/integrations/supabase/client';

const MAX_RECORDINGS = 3;
const MAX_FILE_MB = 15;

const MediaPanel: React.FC<MediaPanelProps> = ({ recordings, loadingRecordings, volumeDefault, setVolumeDefault, playAutoplay, setPlayAutoplay, language, setLanguage, updateRecordingState, toast, setRecordings }) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null); // per-file progress
  const [batchProgress, setBatchProgress] = useState<{current:number,total:number}|null>(null);
  const [editingId, setEditingId] = useState<string|null>(null);
  const [editingTitle, setEditingTitle] = useState<string>('');
  const [signing, setSigning] = useState<Record<string, boolean>>({});
  const [deleting, setDeleting] = useState<Record<string, boolean>>({});
  const [confirmDeleteId, setConfirmDeleteId] = useState<string|null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [waveforms, setWaveforms] = useState<Record<string, number[]>>({});
  const [currentPlayId, setCurrentPlayId] = useState<string|null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement|null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [pendingUploads, setPendingUploads] = useState<{
    id: string; file: File; name: string; progress: number; status: 'uploading'|'error'|'done'; error?: string;
  }[]>([]);
  const fileInputRef = useRef<HTMLInputElement|null>(null);
  const canAdd = recordings.length < MAX_RECORDINGS;
  useEffect(()=> { (async ()=> { const { data: { user }} = await supabase.auth.getUser(); setUserId(user?.id||null); })(); }, []);

  const updatePending = (id: string, patch: Partial<{progress:number;status:'uploading'|'error'|'done';error?:string}>) => {
    setPendingUploads(prev => prev.map(p => p.id === id ? { ...p, ...patch } : p));
  };

  const retryUpload = async (pendingId: string) => {
    const item = pendingUploads.find(p => p.id === pendingId);
    if (!item || item.status !== 'error') return;
    updatePending(pendingId, { status: 'uploading', error: undefined, progress: 0 });
    await processSingleFile(item.file, pendingId, true);
  };

  const extractDuration = (file: File): Promise<number | undefined> => {
    return new Promise(resolve => {
      try {
        const url = URL.createObjectURL(file);
        const audio = new Audio();
        audio.preload = 'metadata';
        audio.onloadedmetadata = () => {
          const d = audio.duration;
          URL.revokeObjectURL(url);
          if (isFinite(d)) resolve(d); else resolve(undefined);
        };
        audio.onerror = () => { URL.revokeObjectURL(url); resolve(undefined); };
        audio.src = url;
      } catch {
        resolve(undefined);
      }
    });
  };

  const generateWaveform = async (file: File, samples = 60): Promise<number[]|undefined> => {
    try {
      const arrayBuf = await file.arrayBuffer();
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const audioBuf = await ctx.decodeAudioData(arrayBuf.slice(0));
      const channel = audioBuf.getChannelData(0);
      const block = Math.floor(channel.length / samples);
      const wf: number[] = [];
      for (let i=0;i<samples;i++) {
        let sum = 0;
        for (let j=0;j<block;j++) sum += Math.abs(channel[i*block + j] || 0);
        wf.push(Math.min(1, sum / block));
      }
      return wf;
    } catch (e) {
      console.warn('waveform gen failed', e);
      return undefined;
    }
  };

  const processSingleFile = useCallback(async (file: File, tempId: string, isRetry = false) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { updatePending(tempId, { status: 'error', error: 'Auth lost' }); return; }
    let uploaded = false;
    try {
      const cleanName = file.name.replace(/[^a-z0-9._-]+/gi,'_');
      const path = `${user.id}/${Date.now()}-${cleanName}`;
      setUploadProgress(0);
      try {
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('POST', `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/recordings/${path}`);
          xhr.setRequestHeader('Authorization', `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`);
          xhr.upload.onprogress = evt => { if (evt.lengthComputable) { const pct = Math.round((evt.loaded/evt.total)*100); setUploadProgress(pct); updatePending(tempId, { progress: pct }); } };
          xhr.onload = () => { if (xhr.status < 300) { uploaded = true; resolve(); } else reject(new Error(xhr.responseText || 'Upload failed')); };
          xhr.onerror = () => reject(new Error('Network error'));
          const fd = new FormData(); fd.append('cacheControl','3600'); fd.append('file', file); xhr.send(fd);
        });
      } catch (e) {
        console.warn('Fallback to supabase upload', e);
      }
      if (!uploaded) {
        const { error: upErr } = await supabase.storage.from('recordings').upload(path, file, { cacheControl: '3600', upsert: false });
        if (upErr) throw upErr;
      }
      const duration = await extractDuration(file);
      const waveform = await generateWaveform(file);
      const title = cleanName.replace(/\.[^.]+$/,'');
      const insertPayload: any = {
        user_id: user.id,
        title,
        file_original_url: path,
        state: 'private',
        is_signature: false,
        comments_enabled: false,
        duration_sec: duration ? Math.round(duration) : null,
        format_original: (file.type.includes('wav') ? 'wav' : file.type.includes('mpeg') || file.name.endsWith('.mp3') ? 'mp3' : file.type.includes('m4a') || file.name.endsWith('.m4a') ? 'm4a' : null)
      };
      const { data: insertData, error: insertErr } = await supabase.from('recordings').insert(insertPayload).select('*').single();
      if (insertErr) throw insertErr;
      if (insertData) {
        setRecordings(prev => [{ ...(insertData as any) }, ...prev].slice(0, MAX_RECORDINGS));
        if (waveform) {
          const wfPath = `${user.id}/waveforms/${insertData.id}.json`;
          const { error: wfErr } = await supabase.storage.from('recordings').upload(wfPath, new Blob([JSON.stringify(waveform)], { type:'application/json'}), { upsert: true });
          if (!wfErr) {
            await supabase.from('recordings').update({ waveform_json_url: wfPath }).eq('id', insertData.id);
            setWaveforms(prev => ({ ...prev, [insertData.id]: waveform }));
            setRecordings(prev => prev.map(r => r.id === insertData.id ? { ...r, waveform_json_url: wfPath } : r));
          }
        }
        updatePending(tempId, { status: 'done', progress: 100 });
        toast({ title: 'Uploaded', description: `${insertData.title} added.` });
      }
    } catch (e:any) {
      console.error('Upload error', e);
      updatePending(tempId, { status: 'error', error: e.message || 'Upload failed' });
      if (!isRetry) toast({ title: 'Upload failed', description: e.message, variant: 'error' });
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  }, [extractDuration, generateWaveform, setRecordings, toast]);

  const handleFiles = useCallback(async (fileList: FileList | null) => {
    if (!fileList || !fileList.length) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast({ title: 'Auth required', description: 'Log in to upload recordings', variant: 'error' }); return; }
    const audioFiles = Array.from(fileList).filter(f => f.type.startsWith('audio/'));
    if (!audioFiles.length) { toast({ title: 'No audio files', description: 'Please select audio files (mp3, wav, m4a, etc.)', variant: 'error' }); return; }
    const remaining = MAX_RECORDINGS - recordings.length;
    const queue = audioFiles.slice(0, remaining);
    setBatchProgress({ current: 0, total: queue.length });
    for (let i=0;i<queue.length;i++) {
      const file = queue[i];
      setBatchProgress({ current: i+1, total: queue.length });
      if (file.size > MAX_FILE_MB * 1024 * 1024) { toast({ title: 'File too large', description: `${file.name} exceeds ${MAX_FILE_MB}MB`, variant: 'error' }); continue; }
      const tempId = `${Date.now()}-${i}-${Math.random().toString(36).slice(2)}`;
      setPendingUploads(prev => [...prev, { id: tempId, file, name: file.name, progress: 0, status: 'uploading' }]);
      setUploading(true);
      await processSingleFile(file, tempId);
    }
    setBatchProgress(null);
    if (fileInputRef.current) fileInputRef.current.value='';
  }, [toast, recordings.length, setRecordings, processSingleFile]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (!canAdd || uploading) return;
    handleFiles(e.dataTransfer.files);
  };
  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); if (!dragActive) setDragActive(true); };
  const onDragLeave = (e: React.DragEvent) => { if (e.currentTarget === e.target) setDragActive(false); };

  const beginRename = (rec: Recording) => {
    setEditingId(rec.id);
    setEditingTitle(rec.title);
  };
  const cancelRename = () => { setEditingId(null); setEditingTitle(''); };
  const commitRename = async (rec: Recording) => {
    const newTitle = editingTitle.trim();
    if (!newTitle || newTitle === rec.title) { cancelRename(); return; }
    const oldTitle = rec.title;
    setRecordings(prev => prev.map(r => r.id === rec.id ? { ...r, title: newTitle } : r));
    try {
      const { error } = await supabase.from('recordings').update({ title: newTitle }).eq('id', rec.id);
      if (error) throw error;
      toast({ title: 'Renamed', description: 'Title updated.' });
    } catch (e:any) {
      setRecordings(prev => prev.map(r => r.id === rec.id ? { ...r, title: oldTitle } : r));
      toast({ title: 'Rename failed', description: e.message, variant: 'error' });
    } finally {
      cancelRename();
    }
  };

  const deleteRecording = async (rec: Recording) => {
    setDeleting(d => ({ ...d, [rec.id]: true }));
    const prevList = recordings;
    setRecordings(prev => prev.filter(r => r.id !== rec.id));
    try {
      // Delete DB row
      const { error } = await supabase.from('recordings').delete().eq('id', rec.id);
      if (error) throw error;
      // Attempt to remove file if we stored path
      if (rec.file_original_url) {
        await supabase.storage.from('recordings').remove([rec.file_original_url]);
      }
      toast({ title: 'Deleted', description: 'Recording removed.' });
    } catch (e:any) {
      setRecordings(prevList); // rollback
      toast({ title: 'Delete failed', description: e.message, variant: 'error' });
    } finally {
      setDeleting(d => ({ ...d, [rec.id]: false }));
    }
  };

  const signUrl = async (rec: Recording) => {
    setSigning(s => ({ ...s, [rec.id]: true }));
    try {
      if (!rec.file_original_url) throw new Error('No file path');
      const { data, error } = await supabase.storage.from('recordings').createSignedUrl(rec.file_original_url, 60);
      if (error) throw error;
      if (data?.signedUrl) {
        // optimistic attach
        setRecordings(prev => prev.map(r => r.id === rec.id ? { ...r, file_stream_url: data.signedUrl } : r));
        toast({ title: 'Ready', description: 'Temporary playback URL generated.' });
      }
    } catch (e:any) {
      toast({ title: 'Sign failed', description: e.message, variant: 'error' });
    } finally {
      setSigning(s => ({ ...s, [rec.id]: false }));
    }
  };

  const loadWaveformIfNeeded = useCallback(async (rec: Recording) => {
    if (!rec.waveform_json_url || waveforms[rec.id]) return;
    try {
      const { data, error } = await supabase.storage.from('recordings').download(rec.waveform_json_url);
      if (error || !data) return;
      const text = await data.text();
      const arr = JSON.parse(text);
      if (Array.isArray(arr)) setWaveforms(prev => ({ ...prev, [rec.id]: arr.slice(0, 120) }));
    } catch (e) { /* ignore */ }
  }, [waveforms]);

  useEffect(()=> {
    recordings.slice(0, MAX_RECORDINGS).forEach(r => { if (r.waveform_json_url) loadWaveformIfNeeded(r); });
  }, [recordings, loadWaveformIfNeeded]);

  useEffect(()=> {
    if (!audioRef.current) return;
    const el = audioRef.current;
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => { setIsPlaying(false); setCurrentPlayId(null); };
    el.addEventListener('play', onPlay); el.addEventListener('pause', onPause); el.addEventListener('ended', onEnded);
    return () => { el.removeEventListener('play', onPlay); el.removeEventListener('pause', onPause); el.removeEventListener('ended', onEnded); };
  }, []);

  const togglePlay = async (rec: Recording) => {
    if (currentPlayId === rec.id) {
      if (audioRef.current) {
        if (isPlaying) audioRef.current.pause(); else audioRef.current.play();
      }
      return;
    }
    if (!rec.file_stream_url) await signUrl(rec);
    await loadWaveformIfNeeded(rec);
    setCurrentPlayId(rec.id);
    setTimeout(()=> { if (audioRef.current) audioRef.current.play(); }, 50);
  };

  const setSignature = async (rec: Recording) => {
    if (!userId) return;
    // Optimistic: mark selected true, others false
    const prev = recordings;
    const prevSignatureId = prev.find(r => r.is_signature)?.id;
    setRecordings(prev => prev.map(r => ({ ...r, is_signature: r.id === rec.id })));
    try {
      // clear existing
      if (prevSignatureId && prevSignatureId !== rec.id) {
        await supabase.from('recordings').update({ is_signature: false }).eq('user_id', userId).eq('id', prevSignatureId);
      }
      const { error } = await supabase.from('recordings').update({ is_signature: true }).eq('id', rec.id);
      if (error) throw error;
      toast({ title: 'Signature set', description: 'Primary recording updated.' });
    } catch (e:any) {
      // rollback
      setRecordings(prev);
      toast({ title: 'Failed', description: e.message, variant: 'error' });
    }
  };

  const moveRecording = (id: string, dir: -1 | 1) => {
    setRecordings(prev => {
      const idx = prev.findIndex(r => r.id === id);
      if (idx < 0) return prev;
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const clone = [...prev];
      const [item] = clone.splice(idx,1);
      clone.splice(newIdx,0,item);
      return clone;
    });
  };

  return (
    <div className="space-y-10" id="settings-panel-media" role="tabpanel" aria-labelledby="settings-tab-media">
      <motion.section key="recordings" className="space-y-6" aria-labelledby="recordings-heading" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}} transition={{duration:0.25}}>
        <div className="space-y-1">
          <h3 id="recordings-heading" className="text-sm font-semibold tracking-wide text-card-foreground/70">RECORDINGS</h3>
          <p className="text-xs text-card-foreground/60">Upload up to 3 short showcase clips (mp3 / wav / m4a). Drag & drop or click the upload area below. Newly uploaded recordings start as private; toggle visibility after upload.</p>
        </div>
        {canAdd && (
          <div
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onClick={()=> !uploading && fileInputRef.current?.click()}
            className={`group relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition ${dragActive ? 'border-primary bg-primary/10' : uploading ? 'opacity-70' : 'hover:border-primary hover:bg-primary/5'} border-card-border/70`}
          >
            <input ref={fileInputRef} type="file" accept="audio/*" multiple className="hidden" onChange={e=> handleFiles(e.target.files)} />
            <div className="flex flex-col items-center gap-2">
              {uploading ? <Loader2 className="w-6 h-6 animate-spin text-primary" /> : <Upload className="w-6 h-6 text-card-foreground/60 group-hover:text-primary" />}
              <p className="text-xs text-card-foreground/70">
                {uploading ? `Uploading… ${uploadProgress ?? ''}` : dragActive ? 'Release to upload' : 'Drag & drop or click to select audio files'}
              </p>
              <p className="text-[10px] text-card-foreground/50">Max {MAX_FILE_MB}MB • Remaining slots: {MAX_RECORDINGS - recordings.length}</p>
              {batchProgress && <p className="text-[10px] text-card-foreground/50">File {batchProgress.current}/{batchProgress.total}</p>}
            </div>
          </div>
        )}
        {pendingUploads.some(p => p.status !== 'done') && (
          <div className="space-y-2">
            {pendingUploads.filter(p => p.status !== 'done').map(p => (
              <div key={p.id} className="flex items-center gap-3 rounded border border-card-border/60 px-3 py-2 text-xs bg-card/40">
                {p.status === 'uploading' && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
                {p.status === 'error' && <AlertCircle className="w-4 h-4 text-destructive" />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-medium">{p.name}</span>
                    <span className="text-[10px] opacity-60">{p.status === 'uploading' ? `${p.progress}%` : p.status === 'error' ? 'error' : ''}</span>
                  </div>
                  <div className="mt-1 h-1.5 w-full rounded bg-muted/40 overflow-hidden">
                    <div className={`h-full transition-all ${p.status==='error' ? 'bg-destructive' : 'bg-primary'}`} style={{width: `${p.status==='error'? 100 : p.progress}%`}} />
                  </div>
                  {p.error && <div className="mt-1 text-[10px] text-destructive truncate">{p.error}</div>}
                </div>
                {p.status === 'error' && (
                  <button onClick={()=> retryUpload(p.id)} className="p-1 rounded hover:bg-accent" aria-label="Retry upload"><RefreshCcw className="w-4 h-4" /></button>
                )}
              </div>
            ))}
          </div>
        )}
        {loadingRecordings ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <span className="ml-2 text-sm text-card-foreground/60">Loading recordings...</span>
          </div>
        ) : recordings.length === 0 ? (
          <div className="text-center py-8 text-card-foreground/60">
            <Mic className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm font-medium">No recordings yet</p>
            <p className="text-xs mt-1">Use the upload area above to add your first one.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {recordings.slice(0, 3).map((recording, idx) => (
              <motion.div
                key={recording.id}
                className="border border-card-border rounded-lg p-4 space-y-3"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1 pr-4 min-w-0">
                    {editingId === recording.id ? (
                      <div className="flex items-center gap-2">
                        <input autoFocus value={editingTitle} onChange={e=> setEditingTitle(e.target.value)} className="flex-1 bg-input/50 border border-input-border rounded px-2 py-1 text-sm" />
                        <button onClick={()=> commitRename(recording)} className="p-1 rounded bg-green-100 text-green-700 hover:bg-green-200" aria-label="Save title"><Check className="w-4 h-4" /></button>
                        <button onClick={cancelRename} className="p-1 rounded bg-gray-100 text-gray-600 hover:bg-gray-200" aria-label="Cancel rename"><X className="w-4 h-4" /></button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 min-w-0">
                        <h4 className="font-medium text-sm truncate" title={recording.title}>{recording.title}</h4>
                        <button onClick={()=> beginRename(recording)} className="p-1 rounded hover:bg-accent" aria-label="Rename recording"><Pencil className="w-3.5 h-3.5 text-card-foreground/60" /></button>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-xs text-card-foreground/60 min-h-[20px] flex-wrap">
                      <span>{recording.duration_sec ? `${Math.floor(recording.duration_sec / 60)}:${(recording.duration_sec % 60).toString().padStart(2, '0')}` : '—:—'}</span>
                      <span>•</span>
                      <span aria-label="waveform" className="flex gap-[2px] h-[18px] items-end">
                        {(waveforms[recording.id] || []).length ? waveforms[recording.id].map((v,i)=>(<span key={i} className={`w-[2px] ${currentPlayId===recording.id && isPlaying ? 'bg-primary' : 'bg-card-foreground/40'}`} style={{height: Math.max(2, Math.round(v*18))}} />)) : (
                          <span className="text-[10px] italic opacity-50">no wf</span>
                        )}
                      </span>
                      {recording.mood_tags && recording.mood_tags.length > 0 && (
                        <>
                          <span>•</span>
                          <span>{recording.mood_tags.slice(0, 2).join(', ')}</span>
                        </>
                      )}
                      {recording.is_signature && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-amber-200/70 text-amber-900 tracking-wide">SIGNATURE</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`px-2 py-1 rounded-full text-xs ${recording.state === 'public' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                      {recording.state === 'public' ? 'Public' : 'Private'}
                    </span>
                    <button disabled={!!signing[recording.id]} onClick={()=> togglePlay(recording)} className={`text-xs px-2 py-1 rounded bg-primary/10 hover:bg-primary/20 disabled:opacity-40 ${currentPlayId===recording.id ? 'ring-1 ring-primary' : ''}`}>{signing[recording.id] ? '...' : currentPlayId===recording.id ? (isPlaying ? 'Pause' : 'Play') : 'Play'}</button>
                    <button onClick={()=> setSignature(recording)} className="p-1 rounded hover:bg-amber-100" aria-label="Set signature">
                      {recording.is_signature ? <Star className="w-4 h-4 text-amber-500" /> : <StarOff className="w-4 h-4 text-card-foreground/40" />}
                    </button>
                    <div className="flex flex-col gap-1">
                      <button disabled={idx===0} onClick={()=> moveRecording(recording.id, -1)} className="p-1 rounded hover:bg-accent disabled:opacity-30" aria-label="Move up"><ArrowUp className="w-3.5 h-3.5" /></button>
                      <button disabled={idx===recordings.length-1} onClick={()=> moveRecording(recording.id, 1)} className="p-1 rounded hover:bg-accent disabled:opacity-30" aria-label="Move down"><ArrowDown className="w-3.5 h-3.5" /></button>
                    </div>
                    {confirmDeleteId === recording.id ? (
                      <div className="flex items-center gap-1">
                        <button disabled={!!deleting[recording.id]} onClick={()=> deleteRecording(recording)} className="px-2 py-1 text-xs rounded bg-destructive text-white hover:bg-destructive/90">{deleting[recording.id] ? '...' : 'Del'}</button>
                        <button onClick={()=> setConfirmDeleteId(null)} className="px-2 py-1 text-xs rounded bg-gray-200 hover:bg-gray-300">Cancel</button>
                      </div>
                    ) : (
                      <button disabled={!!deleting[recording.id]} onClick={()=> setConfirmDeleteId(recording.id)} className="p-1 rounded hover:bg-destructive/10 text-destructive" aria-label="Delete recording">
                        {deleting[recording.id] ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </button>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <ToggleRow
                    label="Show on profile"
                    description="Visible to visitors on your profile page"
                    value={true}
                    onChange={() => {}}
                  />
                  <ToggleRow
                    label="Include in Discover Voices"
                    description="Allow others to find this recording in the discover section"
                    value={recording.state === 'public'}
                    onChange={async (enabled) => {
                      const newState = enabled ? 'public' : 'private';
                      setRecordings(prev => prev.map(r => r.id === recording.id ? { ...r, state: newState } : r));
                      const success = await updateRecordingState(recording.id, newState);
                      if (!success) {
                        setRecordings(prev => prev.map(r => r.id === recording.id ? { ...r, state: recording.state } : r));
                        toast({ title: 'Error', description: 'Failed to update recording visibility', variant: 'error' });
                      } else {
                        toast({ title: 'Updated', description: `Recording is now ${enabled ? 'public' : 'private'}` });
                      }
                    }}
                  />
                </div>
              </motion.div>
            ))}
            {recordings.length >= MAX_RECORDINGS && (
              <div className="text-xs text-card-foreground/60 text-center py-2">Maximum of 3 recordings allowed</div>
            )}
          </div>
        )}
      </motion.section>
  <audio ref={audioRef} className="hidden" src={currentPlayId ? recordings.find(r=> r.id===currentPlayId)?.file_stream_url || undefined : undefined} />
  <motion.section key="playback-sub" className="space-y-6" aria-labelledby="playback-heading" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}} transition={{duration:0.25}}>
        <div className="space-y-1">
          <h3 id="playback-heading" className="text-sm font-semibold tracking-wide text-card-foreground/70">PLAYBACK & EXPERIENCE</h3>
          <p className="text-xs text-card-foreground/60">Default listening preferences.</p>
        </div>
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-wide text-card-foreground/60">Default Volume ({Math.round(volumeDefault*100)}%)</label>
            <input type="range" min={0} max={1} step={0.01} value={volumeDefault} onChange={e=> setVolumeDefault(parseFloat(e.target.value))} className="w-full" />
          </div>
          <ToggleRow label="Autoplay next recording" description="Automatically continue to the next item." value={playAutoplay} onChange={setPlayAutoplay} />
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-wide text-card-foreground/60">Interface Language</label>
            <select value={language} onChange={e=> setLanguage(e.target.value)} className="w-full bg-input/50 border border-input-border rounded-md px-2 py-2 text-sm">
              <option value="en">English</option>
              <option value="de">Deutsch</option>
              <option value="es">Español</option>
            </select>
          </div>
        </div>
      </motion.section>
    </div>
  );
};

export default MediaPanel;
