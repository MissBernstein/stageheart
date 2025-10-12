import React, { useEffect, useMemo, useRef, useState, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ModalShell } from './ModalShell';
import { X, Save, Shield, UserCog, Trash2, AlertTriangle, CheckCircle2, ScrollText, Mic, Check } from 'lucide-react';
import { TERMS_VERSION, PRIVACY_VERSION, getTermsAcceptance, getPrivacyAcceptance, recordTermsAcceptance, recordPrivacyAcceptance, needsTermsReacceptance, needsPrivacyReacceptance } from '@/lib/legal';
import messagesIcon from '@/assets/messagesicon.png';
import settingsIcon from '@/assets/settingsicon.png';
import { Button } from '@/components/ui/button';
import { AnimatedButton } from '@/ui/AnimatedButton';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { ProceduralAvatar } from '@/components/ui/ProceduralAvatar';
import { Recording } from '@/types/voices';
import { listRecordingsByUser, updateRecordingState } from '@/lib/voicesApi';
import ToggleRow from './ToggleRow';
const MediaPanel = React.lazy(() => import('./settingsPanels/MediaPanel'));
const LegalAccountPanel = React.lazy(() => import('./settingsPanels/LegalAccountPanel'));

interface SettingsModalProps { onClose: () => void; returnFocusRef?: React.RefObject<HTMLElement>; }

type TabKey = 'profile' | 'media' | 'privacyNotifications' | 'legalAccount';
const LAST_TAB_KEY = 'stageheart_settings_last_tab_v1';

const LS_KEY = 'stageheart_user_settings_v1';
const LS_HASH_KEY = 'stageheart_user_settings_hash_v1';
const LS_VERSION_KEY = 'stageheart_user_settings_version_v1';

// Lightweight stable stringify (sort keys) to avoid depending on insertion order
function stableStringify(obj: any): string {
  if (obj === null || typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) return '[' + obj.map(stableStringify).join(',') + ']';
  return '{' + Object.keys(obj).sort().map(k => JSON.stringify(k) + ':' + stableStringify(obj[k])).join(',') + '}';
}

// Simple fast hash (FNV-1a 32-bit) returning hex
function hashString(str: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h >>> 0) * 0x01000193; // FNV prime
  }
  return ('0000000' + (h >>> 0).toString(16)).slice(-8);
}
const MUSIC_GENRES = [
  'Pop', 'Rock', 'Jazz', 'Classical', 'R&B', 'Country', 'Folk', 'Blues', 'Hip-Hop', 'Electronic', 
  'Indie', 'Alternative', 'Soul', 'Funk', 'Reggae', 'Metal', 'Punk', 'Gospel', 'Musical Theatre', 'Opera'
] as const;

interface PersistedSettings {
  displayName: string;
  bio: string;
  genresSinging: string[];
  genresListening: string[];
  website: string;
  instagram: string;
  tiktok: string;
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
  genresSinging: ['Pop'],
  genresListening: ['Pop', 'Rock'],
  website: '',
  instagram: '',
  tiktok: '',
  voiceAvatarSeed: 'seed-default',
  dmEnabled: true,
  meetRequireRecording: true,
  notifyNewMessages: true,
  notifyFavorites: false,
  volumeDefault: 0.8,
  playAutoplay: true,
  language: 'en'
};

// Genre tags section component
interface GenreTagsSectionProps {
  label: string;
  genres: string[];
  setGenres: (genres: string[]) => void;
}

const GenreTagsSection: React.FC<GenreTagsSectionProps> = ({ label, genres, setGenres }) => {
  const [customGenre, setCustomGenre] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  const addCustomGenre = () => {
    if (customGenre.trim() && !genres.includes(customGenre.trim())) {
      setGenres([...genres, customGenre.trim()]);
      setCustomGenre('');
      setShowCustomInput(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      addCustomGenre();
    } else if (e.key === 'Escape') {
      setCustomGenre('');
      setShowCustomInput(false);
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium uppercase tracking-wide text-card-foreground/60">{label}</label>
      <div className="flex flex-wrap gap-2">
        <AnimatePresence>
          {genres.map(genre => (
            <motion.button
              key={genre}
              onClick={() => setGenres(genres.filter(g => g !== genre))}
              className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] flex items-center gap-1 hover:bg-primary/30"
              initial={{opacity:0,scale:0.85}}
              animate={{opacity:1,scale:1}}
              exit={{opacity:0,scale:0.8}}
              transition={{duration:0.18}}
            >
              {genre} <span aria-hidden>×</span>
              <span className="sr-only">Remove {genre}</span>
            </motion.button>
          ))}
        </AnimatePresence>
        
        {/* Available genre suggestions */}
        <AnimatePresence>
          {MUSIC_GENRES.filter(g => !genres.includes(g)).slice(0,3).map(genre => (
            <motion.button
              key={genre}
              onClick={() => setGenres([...genres, genre])}
              className="px-2 py-0.5 rounded-full bg-input/50 text-[10px] text-card-foreground/70 hover:text-card-foreground hover:bg-input/60"
              whileHover={{y:-2,scale:1.05}}
              whileTap={{scale:0.95}}
              initial={{opacity:0,y:4}}
              animate={{opacity:1,y:0}}
              exit={{opacity:0,y:-4}}
              transition={{duration:0.2}}
            >+ {genre}</motion.button>
          ))}
        </AnimatePresence>

        {/* Add custom button */}
        {!showCustomInput ? (
          <motion.button
            onClick={() => setShowCustomInput(true)}
            className="px-2 py-0.5 rounded-full bg-accent/20 text-accent text-[10px] hover:bg-accent/30"
            whileHover={{y:-2,scale:1.05}}
            whileTap={{scale:0.95}}
          >+ Add Custom</motion.button>
        ) : (
          <motion.div
            className="flex items-center gap-1"
            initial={{opacity:0,scale:0.85}}
            animate={{opacity:1,scale:1}}
            exit={{opacity:0,scale:0.8}}
          >
            <Input
              value={customGenre}
              onChange={(e) => setCustomGenre(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Custom genre"
              className="h-6 text-[10px] w-24"
              autoFocus
            />
            <button
              onClick={addCustomGenre}
              className="text-[10px] text-primary hover:text-primary/80"
            >✓</button>
            <button
              onClick={() => {setShowCustomInput(false); setCustomGenre('');}}
              className="text-[10px] text-muted-foreground hover:text-foreground"
            >×</button>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose, returnFocusRef }) => {
  const { toast } = useToast();
  const [tab, setTab] = useState<TabKey>(() => {
    try {
      const saved = localStorage.getItem(LAST_TAB_KEY) as TabKey | null;
      if (saved && ['profile','media','privacyNotifications','legalAccount'].includes(saved)) return saved;
    } catch {}
    return 'profile';
  });
  const [displayName, setDisplayName] = useState(defaultSettings.displayName);
  const [bio, setBio] = useState(defaultSettings.bio);
  const [genresSinging, setGenresSinging] = useState<string[]>(defaultSettings.genresSinging);
  const [genresListening, setGenresListening] = useState<string[]>(defaultSettings.genresListening);
  const [website, setWebsite] = useState(defaultSettings.website);
  const [instagram, setInstagram] = useState(defaultSettings.instagram);
  const [tiktok, setTiktok] = useState(defaultSettings.tiktok);
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
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loadingRecordings, setLoadingRecordings] = useState(false);
  const liveRegionRef = useRef<HTMLDivElement | null>(null);
  const [errors, setErrors] = useState<{ displayName?: string; bio?: string }>({});

  // Hydrate from localStorage and Supabase profile
  useEffect(() => {
    const loadSettings = async () => {
      // First load from localStorage
      try {
        const raw = localStorage.getItem(LS_KEY);
        if (raw) {
          const parsed: PersistedSettings = { ...defaultSettings, ...(JSON.parse(raw)||{}) };
          setDisplayName(parsed.displayName);
          setBio(parsed.bio);
          // Handle migration from old personaTags to new genre fields
          setGenresSinging(parsed.genresSinging || (parsed as any).personaTags || defaultSettings.genresSinging);
          setGenresListening(parsed.genresListening || defaultSettings.genresListening);
          setWebsite(parsed.website ?? defaultSettings.website);
          setInstagram(parsed.instagram ?? defaultSettings.instagram);
          setTiktok(parsed.tiktok ?? defaultSettings.tiktok);
          setVoiceAvatarSeed(parsed.voiceAvatarSeed || defaultSettings.voiceAvatarSeed);
          setDmEnabled(parsed.dmEnabled);
          setMeetRequireRecording(parsed.meetRequireRecording);
          setNotifyNewMessages(parsed.notifyNewMessages);
          setNotifyFavorites(parsed.notifyFavorites);
          setVolumeDefault(parsed.volumeDefault);
          setPlayAutoplay(parsed.playAutoplay);
          setLanguage(parsed.language);
        }
      } catch {/* ignore localStorage errors */}
      
      // Then sync with Supabase profile data (takes precedence for profile fields)
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { getUserProfile } = await import('@/lib/voicesApi');
          const profile = await getUserProfile(user.id);
          if (profile) {
            setDisplayName(profile.display_name || defaultSettings.displayName);
            setBio(profile.about || defaultSettings.bio);
            // Ensure boolean values have proper defaults (not null)
            setDmEnabled(profile.dm_enabled ?? defaultSettings.dmEnabled);
            
            console.log('[SettingsModal] Loaded profile dm_enabled:', profile.dm_enabled);
            
            // Load social links from profile
            if (profile.links) {
              const websiteLink = profile.links.find(link => link.type === 'website');
              const instagramLink = profile.links.find(link => link.type === 'instagram');
              const tiktokLink = profile.links.find(link => link.type === 'tiktok');
              
              setWebsite(websiteLink?.url || defaultSettings.website);
              setInstagram(instagramLink?.url || defaultSettings.instagram);
              setTiktok(tiktokLink?.url || defaultSettings.tiktok);
            }
            
            // Load genres from profile - use separate fields if available, fallback to combined
            if (profile.genres_singing || profile.genres_listening) {
              setGenresSinging(profile.genres_singing || []);
              setGenresListening(profile.genres_listening || []);
            } else if (profile.fav_genres && profile.fav_genres.length > 0) {
              // Fallback: split combined genres evenly for backward compatibility
              const halfPoint = Math.ceil(profile.fav_genres.length / 2);
              setGenresSinging(profile.fav_genres.slice(0, halfPoint));
              setGenresListening(profile.fav_genres.slice(halfPoint));
            }
          }
        }
      } catch (error) {
        console.error('Error loading profile data:', error);
      }

      // Load user recordings
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setLoadingRecordings(true);
          const userRecordings = await listRecordingsByUser(user.id);
          setRecordings(userRecordings);
          setLoadingRecordings(false);
        }
      } catch (error) {
        console.error('Error loading recordings:', error);
        setLoadingRecordings(false);
      }
    };
    
    loadSettings();
  }, []);

  // Validation
  useEffect(() => {
    const next: typeof errors = {};
    if (!displayName.trim()) next.displayName = 'Display name is required.';
    if (bio.length > 500) next.bio = 'Bio must be under 500 characters.';
    setErrors(next);
  }, [displayName, bio]);

  const currentSettings: PersistedSettings = useMemo(() => ({
    displayName, bio, genresSinging, genresListening, website, instagram, tiktok, voiceAvatarSeed, dmEnabled, meetRequireRecording, notifyNewMessages, notifyFavorites, volumeDefault, playAutoplay, language
  }), [displayName, bio, genresSinging, genresListening, website, instagram, tiktok, voiceAvatarSeed, dmEnabled, meetRequireRecording, notifyNewMessages, notifyFavorites, volumeDefault, playAutoplay, language]);

  const [isDirtyExplicit, setIsDirtyExplicit] = useState(false);
  const [currentHash, setCurrentHash] = useState('');
  const debounceRef = useRef<number | null>(null);
  useEffect(() => {
    // Debounce hash computation to reduce churn while user types
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      try {
        const raw = localStorage.getItem(LS_KEY);
        const base: PersistedSettings | null = raw ? { ...defaultSettings, ...(JSON.parse(raw)||{}) } : null;
        const serialized = stableStringify(currentSettings);
        const newHash = hashString(serialized);
        setCurrentHash(newHash);
        const storedHash = localStorage.getItem(LS_HASH_KEY);
        if (!base || !storedHash) {
          setIsDirtyExplicit(true);
        } else {
          setIsDirtyExplicit(storedHash !== newHash);
        }
      } catch {
        setIsDirtyExplicit(true);
      }
    }, 160); // 160ms debounce
    return () => { if (debounceRef.current) window.clearTimeout(debounceRef.current); };
  }, [currentSettings]);
  const isDirty = isDirtyExplicit;

  // Section-level dirty flags (simple heuristic grouping fields)
  const dirtyMap = useMemo(() => {
    const base: Record<TabKey, boolean> = { profile:false, media:false, privacyNotifications:false, legalAccount:false };
    const raw = (() => { try { return localStorage.getItem(LS_KEY); } catch { return null; } })();
    if (!raw) return { profile:true, media:true, privacyNotifications:true, legalAccount:false }; // first open
    try {
      const stored: PersistedSettings = { ...defaultSettings, ...(JSON.parse(raw)||{}) };
      base.profile = stored.displayName !== displayName || stored.bio !== bio || stored.genresListening.join() !== genresListening.join() || stored.genresSinging.join() !== genresSinging.join() || stored.website !== website || stored.instagram !== instagram || stored.tiktok !== tiktok || stored.voiceAvatarSeed !== voiceAvatarSeed;
      base.media = stored.volumeDefault !== volumeDefault || stored.playAutoplay !== playAutoplay || stored.language !== language; // recordings state changes not persisted locally now
      base.privacyNotifications = stored.dmEnabled !== dmEnabled || stored.meetRequireRecording !== meetRequireRecording || stored.notifyFavorites !== notifyFavorites || stored.notifyNewMessages !== notifyNewMessages;
      // legalAccount currently has no locally persisted editable fields
    } catch {}
    return base;
  }, [displayName,bio,genresListening,genresSinging,website,instagram,tiktok,voiceAvatarSeed,volumeDefault,playAutoplay,language,dmEnabled,meetRequireRecording,notifyFavorites,notifyNewMessages]);

  const save = async () => {
    if (Object.keys(errors).length) {
  toast({ title:'Cannot save', description: Object.values(errors).join(' '), variant: 'error' });
      liveRegionRef.current && (liveRegionRef.current.textContent = 'Save failed due to validation errors');
      return;
    }
    setSaving(true);

    try {
      // Validate links before saving
      const links: any[] = [];
      if (website.trim()) {
        const websiteUrl = website.trim().startsWith('http') ? website.trim() : `https://${website.trim()}`;
        try {
          new URL(websiteUrl); // Ensure valid URL
          links.push({ type: 'website', url: websiteUrl, visibility: 'public' });
        } catch {
          throw new Error('Invalid website URL');
        }
      }
      if (instagram.trim()) {
        const instagramUrl = instagram.trim().startsWith('http') ? instagram.trim() : `https://instagram.com/${instagram.trim().replace('@', '')}`;
        try {
          new URL(instagramUrl);
          links.push({ type: 'instagram', url: instagramUrl, visibility: 'public' });
        } catch {
          throw new Error('Invalid Instagram URL');
        }
      }
      if (tiktok.trim()) {
        const tiktokUrl = tiktok.trim().startsWith('http') ? tiktok.trim() : `https://tiktok.com/@${tiktok.trim().replace('@', '')}`;
        try {
          new URL(tiktokUrl);
          links.push({ type: 'tiktok', url: tiktokUrl, visibility: 'public' });
        } catch {
          throw new Error('Invalid TikTok URL');
        }
      }

  // Save snapshot + meta (hash + version) before remote sync
  const serialized = stableStringify(currentSettings);
  const newHash = hashString(serialized);
  localStorage.setItem(LS_KEY, JSON.stringify(currentSettings));
  localStorage.setItem(LS_HASH_KEY, newHash);
  const prevVersion = parseInt(localStorage.getItem(LS_VERSION_KEY) || '0', 10) || 0;
  localStorage.setItem(LS_VERSION_KEY, String(prevVersion + 1));

      // Sync profile data to Supabase
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { updateUserProfile } = await import('@/lib/voicesApi');
        
        console.log('[SettingsModal] Saving dm_enabled:', dmEnabled);
        
        const profileUpdates = {
          display_name: displayName,
          about: bio,
          dm_enabled: dmEnabled, // Ensure boolean is explicitly set
          comments_enabled: true,
          // DB currently only has fav_genres – merge both sets for persistence
          fav_genres: [...new Set([...genresSinging, ...genresListening])],
          links: links
        } as any; // cast to allow extra local props suppressed in API layer
        
        const updatedProfile = await updateUserProfile(user.id, profileUpdates);
        console.log('[SettingsModal] Profile saved, dm_enabled in response:', updatedProfile?.dm_enabled);
      }

      // Re-sync meta after remote (in case we want to reflect any silent normalization later)
      try {
        const serialized2 = stableStringify(currentSettings);
        const hash2 = hashString(serialized2);
        localStorage.setItem(LS_KEY, JSON.stringify(currentSettings));
        localStorage.setItem(LS_HASH_KEY, hash2);
      } catch {}
  setSaving(false);
  setJustSaved(true);
  setIsDirtyExplicit(false);
      toast({ title: 'Settings saved', description: 'Your preferences have been updated.' });
      liveRegionRef.current && (liveRegionRef.current.textContent = 'Settings saved');
      setTimeout(() => setJustSaved(false), 2500);

      // Notify other components
      window.dispatchEvent(new CustomEvent('voiceAvatarUpdated'));
      window.dispatchEvent(new CustomEvent('profileUpdated'));
    } catch (err) {
      setSaving(false);
  toast({ title: 'Error saving', description: (err as any).message || 'Failed to sync settings', variant: 'error' });
      liveRegionRef.current && (liveRegionRef.current.textContent = 'Save failed');
    }
  };

  const dangerDelete = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    setShowDeleteConfirm(false);
    toast({ title: 'Account deleted (mock)', description: 'Implement backend deletion flow.' });
    liveRegionRef.current && (liveRegionRef.current.textContent = 'Account deletion requested');
  };

  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = useMemo(() => ([
    { key: 'profile', label: 'Profile', icon: <UserCog className="w-4 h-4" /> },
    { key: 'media', label: 'Recordings & Playback', icon: <Mic className="w-4 h-4" /> },
    { key: 'privacyNotifications', label: 'Privacy & Notifications', icon: <Shield className="w-4 h-4" /> },
    { key: 'legalAccount', label: 'Legal & Account', icon: <ScrollText className="w-4 h-4" /> },
  ]), []);

  const focusTab = (k: TabKey) => {
    setTab(k);
    try { localStorage.setItem(LAST_TAB_KEY, k); } catch {}
    // Move focus to new tab button after change for SR users
    requestAnimationFrame(() => {
      const el = document.getElementById(`settings-tab-${k}`);
      el?.focus();
    });
  };

  const onTabListKeyDown = (e: React.KeyboardEvent) => {
    const order = tabs.map(t => t.key);
    const currentIdx = order.indexOf(tab);
    if (currentIdx === -1) return;
    if (['ArrowRight','ArrowDown'].includes(e.key)) {
      e.preventDefault();
      const next = order[(currentIdx + 1) % order.length];
      focusTab(next);
    } else if (['ArrowLeft','ArrowUp'].includes(e.key)) {
      e.preventDefault();
      const prev = order[(currentIdx - 1 + order.length) % order.length];
      focusTab(prev);
    } else if (e.key === 'Home') { e.preventDefault(); focusTab(order[0]); }
    else if (e.key === 'End') { e.preventDefault(); focusTab(order[order.length-1]); }
  };

  const TabButton: React.FC<{ k: TabKey; icon: React.ReactNode; label: string; }>=({ k, icon, label }) => (
    <motion.button
      whileHover={{ y: -2, scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      onClick={()=> focusTab(k)}
      id={`settings-tab-${k}`}
      role="tab"
      aria-selected={tab===k}
      aria-controls={`settings-panel-${k}`}
      tabIndex={tab===k ? 0 : -1}
      className={`relative w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium transition border overflow-hidden ${tab===k ? 'bg-primary/70 text-primary-foreground border-primary shadow-sm' : 'bg-input/40 border-input-border text-card-foreground/60 hover:text-card-foreground'}`}
    >
      {tab===k && <motion.span layoutId="settingsTabGlow" className="absolute inset-0 bg-primary/30" style={{ mixBlendMode: 'overlay' }} initial={false} transition={{ duration: 0.3 }} />}
      <span className="relative z-10 flex items-center gap-2 min-w-0">{icon}<span className="truncate">{label}</span></span>
    </motion.button>
  );

  const handleClose = () => {
    if (isDirty && !justSaved && !saving) {
      const confirmLeave = window.confirm('You have unsaved changes. Close without saving?');
      if (!confirmLeave) return;
    }
    onClose();
  };

  // beforeunload guard
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty && !justSaved && !saving) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty, justSaved, saving]);

  return (
  <ModalShell titleId="settings-title" onClose={onClose} className="max-w-5xl flex flex-col max-h-[80dvh]" contentClassName="flex flex-col h-full" returnFocusRef={returnFocusRef}>
  <div className="p-4 md:p-6 border-b border-card-border relative bg-gradient-to-b from-background/60 to-background/20">
        {/* Mobile: Stack vertically, Desktop: Side by side */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 md:gap-4">
          <div className="space-y-1 flex-1 min-w-0">
            <h2 id="settings-title" className="text-lg md:text-[24px] font-semibold flex items-center gap-2 md:gap-3" style={{ fontFamily: '"Love Ya Like A Sister"' }}>
              <img src={settingsIcon} alt="Settings" className="w-10 h-10 md:w-14 md:h-14 object-contain" />
              <span>Settings</span>
            </h2>
            <p className="text-[10px] md:text-xs text-card-foreground/60 hidden md:block">Profile • Recordings • Privacy • Notifications • Playback • Account</p>
            <div className="flex items-center gap-3 pt-1 text-[10px] text-card-foreground/50">
              <a href="/terms" className="underline underline-offset-2 hover:text-card-foreground/80">Terms</a>
              <a href="/privacy" className="underline underline-offset-2 hover:text-card-foreground/80">Privacy</a>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
            <div className="relative flex items-center">
              <AnimatedButton size="sm" variant="outline" onClick={save} disabled={saving || !isDirty || Object.keys(errors).length>0} className="h-7 md:h-8 text-[10px] md:text-[11px] flex items-center gap-1 px-2 md:pr-3 relative">
                {saving ? 'Saving…' : (
                  justSaved ? (<><Check className="w-3 h-3 text-emerald-400" /> <span className="hidden md:inline">Saved</span></>) : (<><Save className="w-3 h-3" /> <span className="hidden md:inline">{isDirty ? 'Save' : 'Saved'}</span></>)
                )}
                {isDirty && !saving && !justSaved && <span className="ml-1 px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-600 text-[9px] font-semibold tracking-wide">!</span>}
              </AnimatedButton>
              {/* Success pulse */}
              {justSaved && (
                <motion.span
                  aria-hidden
                  className="absolute -right-2 -top-1 h-3 w-3 rounded-full bg-emerald-400 shadow-[0_0_0_4px_rgba(16,185,129,0.3)]"
                  initial={{ scale:0, opacity:0 }}
                  animate={{ scale:1, opacity:1 }}
                  exit={{ scale:0.4, opacity:0 }}
                  transition={{ duration:0.35, ease:[0.22,0.72,0.28,0.99] }}
                />
              )}
            </div>
            <AnimatedButton variant="ghost" size="icon" onClick={handleClose} className="h-8 w-8 md:h-10 md:w-10"><X className="w-4 h-4 md:w-5 md:h-5" /><span className="sr-only">Close settings</span></AnimatedButton>
          </div>
        </div>
      </div>
      <div ref={liveRegionRef} aria-live="polite" className="sr-only" />
      
      {/* Mobile horizontal tabs - visible only on mobile */}
      <div className="md:hidden border-b border-card-border/60 bg-card/30 backdrop-blur-sm">
        <div className="overflow-x-auto scrollbar-hide">
          <div className="flex gap-2 p-3 min-w-min" role="tablist" aria-orientation="horizontal">
            {tabs.map(t => (
              <button
                key={t.key}
                role="tab"
                aria-selected={tab === t.key}
                aria-controls={`settings-panel-${t.key}`}
                id={`settings-tab-mobile-${t.key}`}
                onClick={() => { setTab(t.key); try { localStorage.setItem(LAST_TAB_KEY, t.key); } catch {} }}
                className={`relative flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap flex-shrink-0 min-w-fit ${
                  tab === t.key 
                    ? 'bg-primary text-primary-foreground shadow-sm' 
                    : 'bg-card/60 text-card-foreground/70 hover:text-card-foreground hover:bg-card'
                }`}
              >
                <span className="shrink-0">{t.icon}</span>
                <span>{t.label}</span>
                {dirtyMap[t.key] && (
                  <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-amber-500 border border-background" aria-hidden title="Unsaved changes" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Left nav - hidden on mobile, visible on desktop */}
        <div className="hidden md:flex md:w-48 border-r border-card-border/60 p-4 flex-col gap-2 overflow-y-auto" role="tablist" aria-orientation="vertical" onKeyDown={onTabListKeyDown}>
          {tabs.map(t => (
            <div key={t.key} className="relative">
              <TabButton k={t.key} icon={t.icon} label={t.label} />
              {dirtyMap[t.key] && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-amber-500 border border-card shadow-[0_0_0_2px_rgba(245,158,11,0.25)]" aria-hidden title="Unsaved changes" />}
            </div>
          ))}
        </div>
        {/* Content - full width on mobile, flex-1 on desktop */}
  <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 md:space-y-8 relative">
          <AnimatePresence mode="wait" initial={false}>
          {tab === 'profile' && (
            <motion.section key="profile" id="settings-panel-profile" role="tabpanel" aria-labelledby="settings-tab-profile" className="space-y-4 md:space-y-6" aria-describedby="profile-heading" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}} transition={{duration:0.25}}>
              <div className="space-y-2 pb-2 border-b border-card-border/30">
                <h3 id="profile-heading" className="text-base md:text-[18px] font-semibold text-card-foreground" style={{ fontFamily: '"Love Ya Like A Sister"' }}>Profile</h3>
                <p className="text-xs md:text-sm text-card-foreground/70">Control what listeners see about you.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
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
                <div className="space-y-2 col-span-1 md:col-span-1">
                  <label className="text-xs font-medium uppercase tracking-wide text-card-foreground/60 flex items-center justify-between">Display Name {errors.displayName && <span className="text-destructive text-[10px] font-normal">{errors.displayName}</span>}</label>
                  <Input value={displayName} onChange={e=> setDisplayName(e.target.value)} placeholder="Your name" aria-invalid={!!errors.displayName} />
                </div>
                <div className="space-y-2 col-span-1 md:col-span-2">
                  <GenreTagsSection 
                    label="Genres I love singing"
                    genres={genresSinging}
                    setGenres={setGenresSinging}
                  />
                </div>
                <div className="space-y-2 col-span-1 md:col-span-1">
                  <GenreTagsSection 
                    label="Genres I love listening to"
                    genres={genresListening}
                    setGenres={setGenresListening}
                  />
                </div>
                <div className="col-span-1 md:col-span-3 space-y-2">
                  <label className="text-xs font-medium uppercase tracking-wide text-card-foreground/60 flex items-center justify-between">Bio {errors.bio && <span className="text-destructive text-[10px] font-normal">{errors.bio}</span>}</label>
                  <Textarea value={bio} onChange={e=> setBio(e.target.value)} rows={4} maxLength={500} placeholder="Share your story, style, influences… (max 500 chars)" className="resize-y" aria-invalid={!!errors.bio} />
                  <p className="text-[10px] text-card-foreground/50 text-right">{bio.length}/500</p>
                </div>
                
                {/* Website and Social Links */}
                <div className="col-span-1 md:col-span-3 space-y-4">
                  <h4 className="text-xs font-medium uppercase tracking-wide text-card-foreground/60">Website & Socials <span className="text-[10px] font-normal text-card-foreground/40">(Optional)</span></h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-card-foreground/60">Website</label>
                      <Input 
                        value={website} 
                        onChange={e => setWebsite(e.target.value)} 
                        placeholder="https://yourwebsite.com" 
                        className="text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-card-foreground/60">Instagram</label>
                      <Input 
                        value={instagram} 
                        onChange={e => setInstagram(e.target.value)} 
                        placeholder="@username or full URL" 
                        className="text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-card-foreground/60">TikTok</label>
                      <Input 
                        value={tiktok} 
                        onChange={e => setTiktok(e.target.value)} 
                        placeholder="@username or full URL" 
                        className="text-sm"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-card-foreground/50">These will appear on your public profile when filled out</p>
                </div>
              </div>
            </motion.section>
          )}
          {tab === 'media' && (
            <Suspense fallback={<div className="text-xs text-card-foreground/60">Loading media settings…</div>}>
              <MediaPanel
                recordings={recordings}
                loadingRecordings={loadingRecordings}
                volumeDefault={volumeDefault}
                setVolumeDefault={setVolumeDefault}
                playAutoplay={playAutoplay}
                setPlayAutoplay={setPlayAutoplay}
                language={language}
                setLanguage={setLanguage}
                updateRecordingState={updateRecordingState}
                toast={toast}
                setRecordings={setRecordings}
              />
            </Suspense>
          )}
          {tab === 'privacyNotifications' && (
            <div key="privacy-wrapper" id="settings-panel-privacyNotifications" role="tabpanel" aria-labelledby="settings-tab-privacyNotifications" className="space-y-6 md:space-y-10">
            <motion.section key="privacy" className="space-y-4 md:space-y-6" aria-labelledby="privacy-heading" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}} transition={{duration:0.25}}>
              <div className="space-y-2 pb-2 border-b border-card-border/30">
                <h3 id="privacy-heading" className="text-base md:text-[18px] font-semibold text-card-foreground" style={{ fontFamily: '"Love Ya Like A Sister"' }}>Privacy & Contact</h3>
                <p className="text-xs md:text-sm text-card-foreground/70">Tune how people can reach you or request a meet.</p>
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
            <motion.section key="notif-sub" className="space-y-4 md:space-y-6" aria-labelledby="notif-heading" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}} transition={{duration:0.25}}>
              <div className="space-y-2 pb-2 border-b border-card-border/30">
                <h3 id="notif-heading" className="text-base md:text-[18px] font-semibold text-card-foreground" style={{ fontFamily: '"Love Ya Like A Sister"' }}>Notifications</h3>
                <p className="text-xs md:text-sm text-card-foreground/70">Choose which events trigger notifications.</p>
              </div>
              <div className="space-y-4">
                <ToggleRow label="New messages" description="Notify me when I receive a new message" value={notifyNewMessages} onChange={setNotifyNewMessages} />
                <ToggleRow label="Favorites activity" description="Notify me when someone favorites my recording" value={notifyFavorites} onChange={setNotifyFavorites} />
              </div>
            </motion.section>
            </div>
          )}
          {tab === 'legalAccount' && (
            <Suspense fallback={<div className="text-xs text-card-foreground/60">Loading legal & account…</div>}>
              <LegalAccountPanel
                dangerDelete={dangerDelete}
                showDeleteConfirm={showDeleteConfirm}
                confirmDelete={confirmDelete}
                cancelDelete={()=> setShowDeleteConfirm(false)}
              />
            </Suspense>
          )}
          </AnimatePresence>
        </div>
      </div>
    </ModalShell>
  );
};


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
