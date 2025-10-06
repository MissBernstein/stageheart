import React, { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { fadeInUp } from '@/ui/motion';
import { MotionIfOkay } from '@/ui/MotionIfOkay';
import { usePrefersReducedMotion } from '@/ui/usePrefersReducedMotion';
import { X, Share2, Mail, MessageCircle, Link as LinkIcon, Globe2, Loader2, Heart } from 'lucide-react';
import { incrementPlay } from '@/lib/voicesApi';
import { useVoiceFavorites } from '@/hooks/useVoiceFavorites';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Recording, UserProfile } from '@/types/voices';
import { getUserProfile, listRecordingsByUser } from '@/lib/voicesApi';
import { usePlayer } from '@/hooks/usePlayer';
// (search removed)

interface UserProfileModalProps {
  userId: string;
  onClose: () => void;
  // Preload optional: if you pass a recording list we won't fetch again
  initialRecordings?: Recording[];
}


export const UserProfileModal: React.FC<UserProfileModalProps> = ({ userId, onClose, initialRecordings }) => {
  const prefersReducedMotion = usePrefersReducedMotion();
  const { loadRecording, currentRecording, isPlaying, play, pause } = usePlayer();
  const { isFavorite, toggleFavorite } = useVoiceFavorites();
  const { toast } = useToast();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [recordings, setRecordings] = useState<Recording[]>(initialRecordings || []);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingRecs, setLoadingRecs] = useState(!initialRecordings);
  // search removed (profile will have <=3 recordings)

  useEffect(() => {
    let active = true;
    (async () => {
      setLoadingProfile(true);
  const p = await getUserProfile(userId);
      if (active) { setProfile(p); setLoadingProfile(false); }
    })();
    if (!initialRecordings) {
      (async () => {
        setLoadingRecs(true);
  const recs = await listRecordingsByUser(userId);
        if (active) { setRecordings(recs); setLoadingRecs(false); }
      })();
    }
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { active = false; window.removeEventListener('keydown', onKey); document.body.style.overflow = prevOverflow; };
  }, [userId, onClose, initialRecordings]);

  const filtered = recordings; // no search filtering needed

  return createPortal(
    <MotionIfOkay>
      <motion.div
        initial={prefersReducedMotion ? false : fadeInUp.initial}
        animate={prefersReducedMotion ? undefined : fadeInUp.animate}
        exit={prefersReducedMotion ? undefined : fadeInUp.exit}
        className="fixed inset-0 z-[999] bg-background/95 backdrop-blur-sm overflow-y-auto"
        role="dialog" aria-modal="true" aria-labelledby="user-profile-title"
      >
        <div className="container mx-auto px-4 py-10">
          <div className="bg-card/95 rounded-3xl shadow-card border border-card-border/70 max-w-5xl mx-auto">
            <div className="p-6 border-b border-card-border flex items-start justify-between gap-6">
              <div className="flex items-start gap-5">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/40 to-accent/40 flex items-center justify-center text-3xl font-semibold text-card-foreground">
                  {profile?.display_name?.charAt(0) || '?' }
                </div>
                <div className="space-y-2">
                  <h2 id="user-profile-title" className="text-2xl font-semibold leading-tight">{profile?.display_name || 'Loading…'}</h2>
                  {profile?.about && <p className="text-sm text-card-foreground/70 max-w-prose">{profile.about}</p>}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {profile?.fav_genres?.slice(0,4).map(g => <span key={g} className="text-[10px] uppercase tracking-wide px-2 py-1 rounded-full bg-input/40 text-card-foreground/70">{g}</span>)}
                    {profile?.favorite_artists?.slice(0,2).map(a => <span key={a} className="text-[10px] px-2 py-1 rounded-full bg-input/40 text-card-foreground/70">{a}</span>)}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="icon" onClick={onClose} className="h-9 w-9"><X className="w-4 h-4" /><span className="sr-only">Close</span></Button>
              </div>
            </div>
            <div className="p-6 space-y-10">
              {/* Contact & Links */}
              <section className="space-y-3">
                <h3 className="text-sm font-semibold tracking-wide text-card-foreground/70">CONNECT</h3>
                <div className="flex flex-wrap gap-3">
                  <Button variant="outline" size="sm" className="gap-2"><MessageCircle className="w-4 h-4" />Message</Button>
                  <Button variant="outline" size="sm" className="gap-2"><Mail className="w-4 h-4" />Email</Button>
                  <Button variant="outline" size="sm" className="gap-2"><Share2 className="w-4 h-4" />Share</Button>
                </div>
                {profile?.profile_note_to_listeners && (
                  <p className="text-xs text-card-foreground/60 max-w-prose leading-relaxed bg-input/30 rounded-xl p-3">{profile.profile_note_to_listeners}</p>
                )}
                {profile?.links && profile.links.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {profile.links.map(l => (
                      <a key={l.url} href={l.url} target="_blank" rel="noreferrer" className="text-xs inline-flex items-center gap-1 px-2 py-1 rounded-full bg-input/40 hover:bg-input/50 transition text-card-foreground/70">
                        {l.type === 'website' && <Globe2 className="w-3 h-3" />}
                        {l.type !== 'website' && <LinkIcon className="w-3 h-3" />}
                        <span className="truncate max-w-[120px]">{new URL(l.url).hostname.replace('www.','')}</span>
                      </a>
                    ))}
                  </div>
                )}
              </section>

              {/* Recordings */}
              <section className="space-y-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <h3 className="text-sm font-semibold tracking-wide text-card-foreground/70">RECORDINGS ({filtered.length})</h3>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {loadingRecs && (
                    <div className="col-span-full flex items-center gap-2 text-sm text-card-foreground/60"><Loader2 className="w-4 h-4 animate-spin" /> Loading recordings…</div>
                  )}
                  {!loadingRecs && filtered.map(r => (
                    <div key={r.id} className="p-4 pt-6 rounded-xl border border-card-border/60 bg-card/70 backdrop-blur-sm hover:bg-card/80 transition group relative">
                      <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition">
                        <button onClick={()=> toggleFavorite(r.id)} className="h-7 w-7 inline-flex items-center justify-center rounded-full hover:bg-input/40">
                          <Heart className={`w-3.5 h-3.5 ${isFavorite(r.id)?'fill-accent text-accent':''}`} />
                          <span className="sr-only">{isFavorite(r.id)?'Unfavorite':'Favorite'}</span>
                        </button>
                        <button onClick={()=> { navigator.clipboard?.writeText(window.location.origin + '/app/voice/' + r.id); toast({ title:'Link copied', description:'Voice link copied.' }); }} className="h-7 w-7 inline-flex items-center justify-center rounded-full hover:bg-input/40">
                          <Share2 className="w-3.5 h-3.5" />
                          <span className="sr-only">Share</span>
                        </button>
                      </div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <h4 className="font-semibold text-card-foreground text-sm leading-tight truncate">{r.title}</h4>
                          <p className="text-[10px] text-card-foreground/60">{Math.round((r.duration_sec||0)/60)} min • {r.plays_count} plays</p>
                        </div>
                        <Button size="icon" variant="ghost" onClick={() => { if (currentRecording?.id === r.id && isPlaying) { pause(); } else { loadRecording(r); play(); incrementPlay(r.id); r.plays_count += 1; } }} className="h-8 w-8">
                          {currentRecording?.id === r.id && isPlaying ? (
                            <PauseIcon />
                          ) : (
                            <PlayIcon />
                          )}
                          <span className="sr-only">{currentRecording?.id === r.id && isPlaying ? 'Pause' : 'Play'}</span>
                        </Button>
                      </div>
                      {r.mood_tags && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {r.mood_tags.slice(0,5).map(tag => (
                            <span key={tag} className="px-2 py-0.5 rounded-full bg-input/40 text-[10px] text-card-foreground/70">{tag}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  {!loadingRecs && filtered.length === 0 && (
                    <div className="col-span-full text-center text-xs text-card-foreground/60 py-8">No recordings match your search.</div>
                  )}
                </div>
              </section>
            </div>
          </div>
        </div>
      </motion.div>
    </MotionIfOkay>,
    document.body
  );
};

const PlayIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor"><path d="M6 4l14 8-14 8z" /></svg>
);
const PauseIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
);
