import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ModalShell } from './ModalShell';
import { X, Save, Shield, Bell, UserCog, SlidersHorizontal, Volume2, Trash2, AlertTriangle, CheckCircle2, ScrollText } from 'lucide-react';
import { TERMS_VERSION, PRIVACY_VERSION, getTermsAcceptance, getPrivacyAcceptance, recordTermsAcceptance, recordPrivacyAcceptance, needsTermsReacceptance, needsPrivacyReacceptance } from '@/lib/legal';
import messagesIcon from '@/assets/messagesicon.png';
import settingsIcon from '@/assets/settingsicon.png';
import { Button } from '@/components/ui/button';
import { AnimatedButton } from '@/ui/AnimatedButton';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';

interface SettingsModalProps { onClose: () => void; returnFocusRef?: React.RefObject<HTMLElement>; }

type TabKey = 'profile' | 'privacy' | 'notifications' | 'playback' | 'account' | 'legal';

const LS_KEY = 'stageheart_user_settings_v1';
const PERSONA_SUGGESTIONS = [
  'Warm & Reflective','Upbeat Storyteller','Calm Instructor','Energetic Host','Soft & Intimate','Bold Narrator'
] as const;

interface PersistedSettings {
  displayName: string;
  bio: string;
  personaTags: string[];
  voiceAvatarSeed: string;
  dmEnabled: boolean;
  meetRequireRecording: boolean;
  notifyNewMessages: boolean;
  notifyFavorites: boolean;
  volumeDefault: number;
  playAutoplay: boolean;
  language: string;
}

const defaultSettings: PersistedSettings = {
  displayName: 'Your Name',
  bio: 'Short intro or description about your voice and interests.',
  personaTags: ['Warm & Reflective'],
  voiceAvatarSeed: 'seed-default',
  dmEnabled: true,
  meetRequireRecording: true,
  notifyNewMessages: true,
  notifyFavorites: false,
  volumeDefault: 0.8,
  playAutoplay: true,
  language: 'en'
};

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose, returnFocusRef }) => {
  const { toast } = useToast();
  const [tab, setTab] = useState<TabKey>('profile');
  const [displayName, setDisplayName] = useState(defaultSettings.displayName);
  const [bio, setBio] = useState(defaultSettings.bio);
  const [personaTags, setPersonaTags] = useState<string[]>(defaultSettings.personaTags);
  const [voiceAvatarSeed, setVoiceAvatarSeed] = useState(defaultSettings.voiceAvatarSeed);
  const [dmEnabled, setDmEnabled] = useState(defaultSettings.dmEnabled);
  const [meetRequireRecording, setMeetRequireRecording] = useState(defaultSettings.meetRequireRecording);
  const [notifyNewMessages, setNotifyNewMessages] = useState(defaultSettings.notifyNewMessages);
  const [notifyFavorites, setNotifyFavorites] = useState(defaultSettings.notifyFavorites);
  const [volumeDefault, setVolumeDefault] = useState(defaultSettings.volumeDefault);
  const [playAutoplay, setPlayAutoplay] = useState(defaultSettings.playAutoplay);
  const [language, setLanguage] = useState(defaultSettings.language);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const liveRegionRef = useRef<HTMLDivElement | null>(null);
  const [errors, setErrors] = useState<{ displayName?: string; bio?: string }>({});

  // Hydrate from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const parsed: PersistedSettings = { ...defaultSettings, ...(JSON.parse(raw)||{}) };
        setDisplayName(parsed.displayName);
        setBio(parsed.bio);
  setPersonaTags(parsed.personaTags);
  setVoiceAvatarSeed(parsed.voiceAvatarSeed || defaultSettings.voiceAvatarSeed);
        setDmEnabled(parsed.dmEnabled);
        setMeetRequireRecording(parsed.meetRequireRecording);
        setNotifyNewMessages(parsed.notifyNewMessages);
        setNotifyFavorites(parsed.notifyFavorites);
        setVolumeDefault(parsed.volumeDefault);
        setPlayAutoplay(parsed.playAutoplay);
        setLanguage(parsed.language);
      }
    } catch {/* ignore */}
  }, []);

  // Validation
  useEffect(() => {
    const next: typeof errors = {};
    if (!displayName.trim()) next.displayName = 'Display name is required.';
    if (bio.length > 500) next.bio = 'Bio must be under 500 characters.';
    setErrors(next);
  }, [displayName, bio]);

  const currentSettings: PersistedSettings = useMemo(() => ({
    displayName, bio, personaTags, voiceAvatarSeed, dmEnabled, meetRequireRecording, notifyNewMessages, notifyFavorites, volumeDefault, playAutoplay, language
  }), [displayName, bio, personaTags, voiceAvatarSeed, dmEnabled, meetRequireRecording, notifyNewMessages, notifyFavorites, volumeDefault, playAutoplay, language]);

  const isDirty = useMemo(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return true; // first save
      const stored: PersistedSettings = { ...defaultSettings, ...(JSON.parse(raw)||{}) };
      return JSON.stringify(stored) !== JSON.stringify(currentSettings);
    } catch { return true; }
  }, [currentSettings]);

  const save = async () => {
    if (Object.keys(errors).length) {
      toast({ title:'Cannot save', description: Object.values(errors).join(' '), variant: 'destructive' as any });
      liveRegionRef.current && (liveRegionRef.current.textContent = 'Save failed due to validation errors');
      return; // prevent save
    }
    setSaving(true);
    await new Promise(r => setTimeout(r, 250));
    try { localStorage.setItem(LS_KEY, JSON.stringify(currentSettings)); } catch {/* ignore */}
    setSaving(false);
    setJustSaved(true);
    toast({ title: 'Settings saved', description: 'Your preferences have been updated.' });
    liveRegionRef.current && (liveRegionRef.current.textContent = 'Settings saved');
    setTimeout(()=> setJustSaved(false), 2500);
  };

  const dangerDelete = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    setShowDeleteConfirm(false);
    toast({ title: 'Account deleted (mock)', description: 'Implement backend deletion flow.' });
    liveRegionRef.current && (liveRegionRef.current.textContent = 'Account deletion requested');
  };

  const TabButton: React.FC<{ k: TabKey; icon: React.ReactNode; label: string; }>=({ k, icon, label }) => (
    <motion.button
      whileHover={{ y: -2, scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      onClick={()=> setTab(k)}
      className={`relative w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition border overflow-hidden ${tab===k ? 'bg-primary/70 text-primary-foreground border-primary shadow-sm' : 'bg-input/40 border-input-border text-card-foreground/60 hover:text-card-foreground'}`}
    >
      {tab===k && <motion.span layoutId="settingsTabGlow" className="absolute inset-0 bg-primary/30" style={{ mixBlendMode: 'overlay' }} initial={false} transition={{ duration: 0.3 }} />}
      <span className="relative z-10 flex items-center gap-2">{icon}<span>{label}</span></span>
    </motion.button>
  );

  return (
  <ModalShell titleId="settings-title" onClose={onClose} className="max-w-5xl flex flex-col h-[82vh]" contentClassName="flex flex-col h-full" returnFocusRef={returnFocusRef}>
      <div className="p-6 border-b border-card-border flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h2 id="settings-title" className="text-2xl font-semibold flex items-center gap-3">
            <img src={settingsIcon} alt="Settings" className="w-10 h-10 object-contain" />
            <span>Settings</span>
          </h2>
          <p className="text-xs text-card-foreground/60">Profile • Privacy • Notifications • Playback • Account</p>
        </div>
        <div className="flex items-center gap-2">
          <AnimatedButton size="sm" variant="outline" onClick={save} disabled={saving || !isDirty || Object.keys(errors).length>0} className="h-8 text-[11px] flex items-center gap-1">
            {saving ? 'Saving…' : (<><Save className="w-3 h-3" /> {isDirty ? 'Save' : 'Saved'}</> )}
          </AnimatedButton>
          <AnimatedButton variant="ghost" size="icon" onClick={onClose} className="h-10 w-10"><X /><span className="sr-only">Close settings</span></AnimatedButton>
        </div>
        <div className="absolute bottom-2 right-6 text-[10px] text-card-foreground/50 flex items-center gap-3">
          <a href="/terms" className="underline underline-offset-2 hover:text-card-foreground/80">Terms</a>
          <a href="/privacy" className="underline underline-offset-2 hover:text-card-foreground/80">Privacy</a>
        </div>
      </div>
      <div ref={liveRegionRef} aria-live="polite" className="sr-only" />
      <div className="flex flex-1 min-h-0">
        {/* Left nav */}
        <div className="w-48 border-r border-card-border/60 p-4 flex flex-col gap-2 overflow-y-auto">
          <TabButton k="profile" icon={<UserCog className="w-4 h-4" />} label="Profile" />
          <TabButton k="privacy" icon={<Shield className="w-4 h-4" />} label="Privacy" />
            <TabButton k="notifications" icon={<Bell className="w-4 h-4" />} label="Notifications" />
          <TabButton k="playback" icon={<Volume2 className="w-4 h-4" />} label="Playback" />
          <TabButton k="legal" icon={<ScrollText className="w-4 h-4" />} label="Legal" />
          <TabButton k="account" icon={<SlidersHorizontal className="w-4 h-4" />} label="Account" />
        </div>
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-10 relative">
          <AnimatePresence mode="wait" initial={false}>
          {tab === 'profile' && (
            <motion.section key="profile" className="space-y-6" aria-labelledby="profile-heading" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}} transition={{duration:0.25}}>
              <div className="space-y-1">
                <h3 id="profile-heading" className="text-sm font-semibold tracking-wide text-card-foreground/70">PROFILE</h3>
                <p className="text-xs text-card-foreground/60">Control what listeners see about you.</p>
              </div>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-medium uppercase tracking-wide text-card-foreground/60 flex items-center justify-between">Voice Avatar</label>
                  <div className="flex items-center gap-4">
                    <ProceduralAvatar seed={voiceAvatarSeed} className="w-20 h-20" />
                    <div className="flex flex-col gap-2">
                      <Button size="sm" variant="secondary" className="h-7 text-[11px]" onClick={()=> setVoiceAvatarSeed('seed-' + Math.random().toString(36).slice(2,10))}>Regenerate</Button>
                      <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={()=> setVoiceAvatarSeed(defaultSettings.voiceAvatarSeed)}>Reset</Button>
                    </div>
                  </div>
                  <p className="text-[10px] text-card-foreground/60 leading-snug">Abstract waveform inspired snippet—keeps focus on the sound, not appearance.</p>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium uppercase tracking-wide text-card-foreground/60 flex items-center justify-between">Display Name {errors.displayName && <span className="text-destructive text-[10px] font-normal">{errors.displayName}</span>}</label>
                  <Input value={displayName} onChange={e=> setDisplayName(e.target.value)} placeholder="Your name" aria-invalid={!!errors.displayName} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-medium uppercase tracking-wide text-card-foreground/60">Persona Tags</label>
                  <div className="flex flex-wrap gap-2">
                    <AnimatePresence>
                      {personaTags.map(tag => (
                        <motion.button
                          key={tag}
                          onClick={()=> setPersonaTags(prev => prev.filter(t => t!==tag))}
                          className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] flex items-center gap-1 hover:bg-primary/30"
                          initial={{opacity:0,scale:0.85}}
                          animate={{opacity:1,scale:1}}
                          exit={{opacity:0,scale:0.8}}
                          transition={{duration:0.18}}
                        >
                          {tag} <span aria-hidden>×</span>
                          <span className="sr-only">Remove {tag}</span>
                        </motion.button>
                      ))}
                    </AnimatePresence>
                    <AnimatePresence>
                      {PERSONA_SUGGESTIONS.filter(s => !personaTags.includes(s)).slice(0,3).map(s => (
                        <motion.button
                          key={s}
                          onClick={()=> setPersonaTags(prev => [...prev, s])}
                          className="px-2 py-0.5 rounded-full bg-input/50 text-[10px] text-card-foreground/70 hover:text-card-foreground hover:bg-input/60"
                          whileHover={{y:-2,scale:1.05}}
                          whileTap={{scale:0.95}}
                          initial={{opacity:0,y:4}}
                          animate={{opacity:1,y:0}}
                          exit={{opacity:0,y:-4}}
                          transition={{duration:0.2}}
                        >+ {s}</motion.button>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
                <div className="md:col-span-3 space-y-2">
                  <label className="text-xs font-medium uppercase tracking-wide text-card-foreground/60 flex items-center justify-between">Bio {errors.bio && <span className="text-destructive text-[10px] font-normal">{errors.bio}</span>}</label>
                  <Textarea value={bio} onChange={e=> setBio(e.target.value)} rows={4} maxLength={500} placeholder="Share your story, style, influences… (max 500 chars)" className="resize-y" aria-invalid={!!errors.bio} />
                  <p className="text-[10px] text-card-foreground/50 text-right">{bio.length}/500</p>
                </div>
              </div>
            </motion.section>
          )}
          {tab === 'privacy' && (
            <motion.section key="privacy" className="space-y-6" aria-labelledby="privacy-heading" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}} transition={{duration:0.25}}>
              <div className="space-y-1">
                <h3 id="privacy-heading" className="text-sm font-semibold tracking-wide text-card-foreground/70">PRIVACY & CONTACT</h3>
                <p className="text-xs text-card-foreground/60">Tune how people can reach you or request a meet.</p>
              </div>
              <div className="space-y-4">
                <ToggleRow
                  label="Enable direct messages"
                  description="Allow other listeners to DM you." value={dmEnabled} onChange={setDmEnabled}
                />
                <ToggleRow
                  label="Require at least one recording before meet requests"
                  description="Helps reduce spam meet requests." value={meetRequireRecording} onChange={setMeetRequireRecording}
                />
              </div>
            </motion.section>
          )}
          {tab === 'notifications' && (
            <motion.section key="notif" className="space-y-6" aria-labelledby="notif-heading" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}} transition={{duration:0.25}}>
              <div className="space-y-1">
                <h3 id="notif-heading" className="text-sm font-semibold tracking-wide text-card-foreground/70">NOTIFICATIONS</h3>
                <p className="text-xs text-card-foreground/60">Choose which events trigger notifications.</p>
              </div>
              <div className="space-y-4">
                <ToggleRow label="New messages" description="Notify me when I receive a new message" value={notifyNewMessages} onChange={setNotifyNewMessages} />
                <ToggleRow label="Favorites activity" description="Notify me when someone favorites my recording" value={notifyFavorites} onChange={setNotifyFavorites} />
              </div>
            </motion.section>
          )}
          {tab === 'playback' && (
            <motion.section key="playback" className="space-y-6" aria-labelledby="playback-heading" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}} transition={{duration:0.25}}>
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
          )}
          {tab === 'account' && (
            <motion.section key="account" className="space-y-6" aria-labelledby="account-heading" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}} transition={{duration:0.25}}>
              <div className="space-y-1">
                <h3 id="account-heading" className="text-sm font-semibold tracking-wide text-card-foreground/70">ACCOUNT & DANGER ZONE</h3>
                <p className="text-xs text-card-foreground/60">Manage your account lifecycle.</p>
              </div>
              <div className="space-y-4">
                <p className="text-xs text-card-foreground/60">More sections (email change, password, export data) will appear here once backend endpoints exist.</p>
                <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/5 space-y-3">
                  <p className="text-xs font-semibold text-destructive tracking-wide">DANGER ZONE</p>
                  <p className="text-xs text-card-foreground/70">Delete your account and all associated recordings & messages. This action cannot be undone.</p>
                  <Button size="sm" variant="destructive" className="h-8 text-[11px] flex items-center gap-1" onClick={dangerDelete}><Trash2 className="w-3 h-3" /> Delete Account</Button>
                </div>
                {showDeleteConfirm && (
                  <div className="p-4 rounded-xl border border-destructive bg-destructive/10 space-y-3 animate-in fade-in slide-in-from-bottom-2">
                    <p className="text-xs font-semibold text-destructive flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Confirm Deletion</p>
                    <p className="text-[11px] text-card-foreground/70">Type <strong>DELETE</strong> below and click confirm to proceed. This cannot be undone.</p>
                    <DeleteConfirm onConfirm={confirmDelete} onCancel={()=> setShowDeleteConfirm(false)} />
                  </div>
                )}
              </div>
            </motion.section>
          )}
          {tab === 'legal' && (
            <motion.section key="legal" className="space-y-6" aria-labelledby="legal-heading" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}} transition={{duration:0.25}}>
              <div className="space-y-1">
                <h3 id="legal-heading" className="text-sm font-semibold tracking-wide text-card-foreground/70">LEGAL CONSENTS</h3>
                <p className="text-xs text-card-foreground/60">Review or manage your current acceptance status.</p>
              </div>
              <LegalConsentPanel />
            </motion.section>
          )}
          </AnimatePresence>
        </div>
      </div>
    </ModalShell>
  );
};

interface ToggleRowProps { label: string; description?: string; value: boolean; onChange: (v:boolean)=> void; }
const ToggleRow: React.FC<ToggleRowProps> = ({ label, description, value, onChange }) => (
  <label className="flex items-start gap-3 cursor-pointer select-none group">
    <div className="pt-0.5 space-y-1">
      <p className="text-xs font-medium text-card-foreground leading-tight">{label}</p>
      {description && <p className="text-[10px] text-card-foreground/60 max-w-sm leading-snug">{description}</p>}
    </div>
    <div className="ml-auto pt-0.5">
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={()=> onChange(!value)}
        className={`h-5 w-9 rounded-full relative transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 ${value ? 'bg-primary' : 'bg-input-border'}`}
      >
        <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-card shadow transition-transform ${value ? 'translate-x-4' : ''}`} />
        <span className="sr-only">Toggle {label}</span>
      </button>
    </div>
  </label>
);

// Delete confirmation component
const DeleteConfirm: React.FC<{ onConfirm: () => void; onCancel: () => void; }> = ({ onConfirm, onCancel }) => {
  const [text, setText] = useState('');
  const disabled = text !== 'DELETE';
  return (
    <div className="space-y-2">
      <input
        value={text}
        onChange={e=> setText(e.target.value.toUpperCase())}
        placeholder="Type DELETE to confirm"
        className="w-full text-[11px] px-2 py-1.5 rounded-md bg-input/50 border border-input-border focus:outline-none focus:ring-1 focus:ring-destructive/60"
      />
      <div className="flex gap-2 justify-end">
        <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={onCancel}>Cancel</Button>
        <Button size="sm" variant="destructive" disabled={disabled} className="h-7 text-[11px]" onClick={onConfirm}>Confirm</Button>
      </div>
    </div>
  );
};

// Procedural avatar (abstract waveform) — deterministic from seed
const ProceduralAvatar: React.FC<{ seed: string; className?: string; }> = ({ seed, className }) => {
  const hash = Array.from(seed).reduce((a,c)=> (a*33 + c.charCodeAt(0))>>>0, 5381);
  const bars = Array.from({ length: 12 }, (_,i) => ((hash >> (i*2)) & 0x3F) / 63); // values 0..1
  const hueA = hash % 360;
  const hueB = (hash * 7) % 360;
  const gradA = `hsl(${hueA} 75% 55%)`;
  const gradB = `hsl(${hueB} 65% 45%)`;
  return (
    <div className={`relative rounded-2xl p-2 flex items-center justify-center overflow-hidden ring-1 ring-white/10 shadow-inner ${className||''}`}
      style={{ background: `linear-gradient(135deg, ${gradA}, ${gradB})` }}
      aria-label="Procedural voice avatar">
      <svg viewBox="0 0 60 60" className="w-full h-full opacity-90 mix-blend-screen">
        {bars.map((b,i)=> {
          const h = b*46 + 6;
          return <rect key={i} x={4+i*4} y={58-h} width={3} height={h} rx={1.5} fill="white" opacity={0.4 + b*0.5} />;
        })}
        <circle cx={30} cy={30} r={18} stroke="white" strokeWidth={1} opacity={0.18} fill="none" />
        <circle cx={30} cy={30} r={9} stroke="white" strokeWidth={0.8} opacity={0.22} fill="none" />
      </svg>
    </div>
  );
};

// Legal consent panel component
const LegalConsentPanel: React.FC = () => {
  const [termsRec, setTermsRec] = React.useState(getTermsAcceptance());
  const [privacyRec, setPrivacyRec] = React.useState(getPrivacyAcceptance());
  const [needsTerms, setNeedsTerms] = React.useState(needsTermsReacceptance());
  const [needsPrivacy, setNeedsPrivacy] = React.useState(needsPrivacyReacceptance());

  const acceptAll = () => {
    if (needsTerms) recordTermsAcceptance(TERMS_VERSION);
    if (needsPrivacy) recordPrivacyAcceptance(PRIVACY_VERSION);
    refresh();
  };
  const revokeAll = () => {
    try { localStorage.removeItem('stageheart_terms_acceptance_v1'); } catch {}
    try { localStorage.removeItem('stageheart_privacy_acceptance_v1'); } catch {}
    refresh();
  };
  const refresh = () => {
    setTermsRec(getTermsAcceptance());
    setPrivacyRec(getPrivacyAcceptance());
    setNeedsTerms(needsTermsReacceptance());
    setNeedsPrivacy(needsPrivacyReacceptance());
  };

  const row = (label: string, version: string, rec: any, needs: boolean) => (
    <div className="flex flex-col gap-1 rounded-xl border border-card-border/60 bg-input/30 p-4">
      <div className="flex items-center gap-2">
        <p className="text-xs font-medium text-card-foreground/80">{label}</p>
        {needs && <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600">Needs acceptance</span>}
        {!needs && rec && <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Accepted</span>}
      </div>
      <p className="text-[10px] text-card-foreground/60">Current version: <span className="font-mono">{version}</span></p>
      <p className="text-[10px] text-card-foreground/60">Accepted at: {rec?.acceptedAt ? new Date(rec.acceptedAt).toLocaleString() : '—'}</p>
    </div>
  );

  return (
    <div className="space-y-4">
      {row('Terms of Use', TERMS_VERSION, termsRec, needsTerms)}
      {row('Privacy Policy', PRIVACY_VERSION, privacyRec, needsPrivacy)}
      <div className="flex flex-wrap gap-3 pt-2">
        <button onClick={acceptAll} disabled={!needsTerms && !needsPrivacy} className="text-xs px-4 py-1.5 rounded-full bg-primary text-primary-foreground disabled:opacity-50">Accept Current</button>
        <button onClick={revokeAll} className="text-xs px-4 py-1.5 rounded-full bg-destructive/80 text-destructive-foreground hover:bg-destructive">Revoke</button>
        <button onClick={refresh} className="text-xs px-4 py-1.5 rounded-full bg-input/60 text-card-foreground hover:bg-input/70">Refresh</button>
      </div>
      <p className="text-[10px] text-card-foreground/50 leading-snug">Revoking clears local acceptance locally; you may be prompted again. Server sync is attempted automatically upon acceptance (silent).</p>
    </div>
  );
};
