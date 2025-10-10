import React, { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePrefersReducedMotion } from '@/ui/usePrefersReducedMotion';
import { ModalShell } from './ModalShell';
import { X, Share2, Link as LinkIcon, Globe2, Loader2, Heart, Mic, Send } from 'lucide-react';
import headphonesIcon from '@/assets/headphonesicon.png';
import messagesIcon from '@/assets/messagesicon.png';
import { incrementPlay } from '@/lib/voicesApi';
import { useVoiceFavorites } from '@/hooks/useVoiceFavorites';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { AnimatedButton } from '@/ui/AnimatedButton';
import { Recording, UserProfile } from '@/types/voices';
import { getUserProfile, listRecordingsByUser } from '@/lib/voicesApi';
import { usePlayer } from '@/hooks/usePlayer';
import { ProceduralAvatar } from '@/components/ui/ProceduralAvatar';
import { useVoiceAvatar } from '@/hooks/useVoiceAvatar';
import { supabase } from '@/integrations/supabase/client';
import { Textarea } from '@/components/ui/textarea';
import { sendMessage } from '@/lib/messagesApi';

interface UserProfileModalProps {
  userId: string;
  onClose: () => void;
  returnFocusRef?: React.RefObject<HTMLElement>;
  // Preload optional: if you pass a recording list we won't fetch again
  initialRecordings?: Recording[];
}


export const UserProfileModal: React.FC<UserProfileModalProps> = ({ userId, onClose, initialRecordings, returnFocusRef }) => {
  console.log('UserProfileModal opened with userId:', userId);
  
  const prefersReducedMotion = usePrefersReducedMotion();
  const { loadRecording, currentRecording, isPlaying, play, pause } = usePlayer();
  const { isFavorite, toggleFavorite } = useVoiceFavorites();
  const { toast } = useToast();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [recordings, setRecordings] = useState<Recording[]>(initialRecordings || []);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingRecs, setLoadingRecs] = useState(!initialRecordings);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const voiceAvatarSeed = useVoiceAvatar();
  // search removed (profile will have <=3 recordings)

  const [showMessageComposer, setShowMessageComposer] = useState(false);
  const [messageDraft, setMessageDraft] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const messageTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const isOwnProfile = currentUserId === userId;
  const canMessage = Boolean(profile?.dm_enabled) && !isOwnProfile;

  const resetComposer = useCallback(() => {
    setMessageDraft('');
    setShowMessageComposer(false);
  }, []);

  const handleMessageClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (loadingProfile) {
      toast({
        title: 'Hang tight',
        description: 'We’re still loading this profile. Try again in a second.',
      });
      return;
    }

    if (!profile) {
      toast({
        title: 'Profile unavailable',
        description: 'We couldn’t load this performer’s details. Please try again later.',
        variant: 'destructive',
      });
      return;
    }

    if (isOwnProfile) {
      toast({
        title: 'Can’t message yourself',
        description: 'Switch profiles to reach out to another performer.',
        variant: 'destructive',
      });
      return;
    }

    if (!profile?.dm_enabled) {
      toast({
        title: 'Messaging disabled',
        description: `${profile?.display_name || 'This performer'} has DMs turned off right now.`,
      });
      return;
    }

    if (showMessageComposer) {
      resetComposer();
    } else {
      setShowMessageComposer(true);
    }
  }, [isOwnProfile, loadingProfile, profile, resetComposer, showMessageComposer, toast]);

  const handleSendMessage = useCallback(async () => {
    const body = messageDraft.trim();
    if (!body) {
      toast({
        title: 'Add a message first',
        description: 'Write a quick note before hitting send.',
      });
      return;
    }

    if (!profile?.dm_enabled) {
      toast({
        title: 'Messaging disabled',
        description: `${profile?.display_name || 'This performer'} is not accepting DMs right now.`,
      });
      resetComposer();
      return;
    }

    setSendingMessage(true);
    const result = await sendMessage(userId, body);
    setSendingMessage(false);

    if (!result.success) {
      toast({
        title: 'Message not sent',
        description: result.error || 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Message sent',
      description: `Your note to ${profile?.display_name || 'this performer'} is on the way.`,
    });
    resetComposer();
  }, [messageDraft, profile, resetComposer, toast, userId]);

  useEffect(() => {
    if (!showMessageComposer) return;
    const id = requestAnimationFrame(() => {
      messageTextareaRef.current?.focus();
    });
    return () => cancelAnimationFrame(id);
  }, [showMessageComposer]);

  // Optimize useEffect dependencies and cleanup
  useEffect(() => {
    const activeRef = { current: true };
    console.log('UserProfileModal useEffect triggered for userId:', userId);

    // Prevent extension errors from bubbling up
    const handleError = (event: ErrorEvent) => {
      if (
        event.error?.message?.includes('extension') ||
        event.filename?.includes('extension') ||
        event.message?.includes('sendMessageToTab')
      ) {
        event.preventDefault();
        event.stopPropagation();
        return false;
      }
    };

    window.addEventListener('error', handleError);

    // Get current user ID (only once)
    if (!currentUserId) {
      (async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (activeRef.current && user) {
          console.log('Current user ID:', user.id, 'Viewing profile for:', userId);
          setCurrentUserId(user.id);
        }
      })();
    }
    
    // Load profile data (only if not already loaded or userId changed)
    if (!profile || profile.id !== userId) {
      (async () => {
        setLoadingProfile(true);
        console.log('Starting profile load for userId:', userId);
        const p = await getUserProfile(userId);
        console.log('Profile load result:', p);
        if (activeRef.current) {
          setProfile(p);
          setLoadingProfile(false);
        }
      })();
    }
    
    // Load recordings (only if not provided and not already loaded)
    if (!initialRecordings && recordings.length === 0) {
      (async () => {
        setLoadingRecs(true);
        const recs = await listRecordingsByUser(userId);
        if (activeRef.current) {
          setRecordings(recs);
          setLoadingRecs(false);
        }
      })();
    }
    
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    
    // Listen for profile updates from settings modal
    const onProfileUpdated = async () => {
      console.log('Profile updated event received');
      if (activeRef.current) {
        const updatedProfile = await getUserProfile(userId);
        console.log('Updated profile data:', updatedProfile);
        setProfile(updatedProfile);
      }
    };
    
    window.addEventListener('keydown', onKey);
    window.addEventListener('profileUpdated', onProfileUpdated);
    return () => { 
      activeRef.current = false;
      window.removeEventListener('keydown', onKey); 
      window.removeEventListener('profileUpdated', onProfileUpdated);
      window.removeEventListener('error', handleError);
    };
  }, [userId, onClose]); // Removed initialRecordings from deps to prevent re-runs

  const filtered = recordings; // no search filtering needed

  return (
  <ModalShell titleId="user-profile-title" onClose={onClose} className="max-w-5xl max-h-[80dvh] flex flex-col" contentClassName="flex-1 overflow-y-auto" returnFocusRef={returnFocusRef}>
      <div className="p-6 border-b border-card-border flex items-start justify-between gap-6">
              <div className="flex items-start gap-5">
                <motion.div layoutId={`avatar-${userId}`}
                  initial={!prefersReducedMotion ? { opacity:0, scale:0.85, y:8 } : false}
                  animate={!prefersReducedMotion ? { opacity:1, scale:1, y:0 } : {}}
                  transition={{ duration:0.35, ease:[0.22,0.72,0.28,0.99] }}
                >
                  {currentUserId === userId ? (
                    <ProceduralAvatar seed={voiceAvatarSeed} className="w-20 h-20" />
                  ) : (
                    <ProceduralAvatar seed={userId} className="w-20 h-20" />
                  )}
                </motion.div>
                <div className="space-y-2">
                  <motion.h2 id="user-profile-title" className="text-[24px] font-semibold leading-tight" style={{ fontFamily: '"Love Ya Like A Sister"' }}
                    initial={!prefersReducedMotion ? { opacity:0, y:6 } : false}
                    animate={!prefersReducedMotion ? { opacity:1, y:0 } : {}}
                    transition={{ duration:0.3, delay:0.05 }}
                  >{profile?.display_name || 'Loading…'}</motion.h2>
                  {profile?.about && (
                    <motion.p className="text-sm text-card-foreground/70 max-w-prose"
                      initial={!prefersReducedMotion ? { opacity:0, y:6 } : false}
                      animate={!prefersReducedMotion ? { opacity:1, y:0 } : {}}
                      transition={{ duration:0.35, delay:0.1 }}
                    >{profile.about}</motion.p>
                  )}
                  <motion.div className="flex flex-wrap gap-2 pt-1"
                    initial={!prefersReducedMotion ? { opacity:0 } : false}
                    animate={!prefersReducedMotion ? { opacity:1 } : {}}
                    transition={{ duration:0.4, delay:0.15 }}
                  >
                    <AnimatePresence>
                      {/* Singing genres with microphone icon */}
                      {profile?.genres_singing?.slice(0,3).map(g => (
                        <motion.span key={`singing-${g}`} className="text-[10px] uppercase tracking-wide px-2 py-1 rounded-full bg-primary/20 text-primary flex items-center gap-1"
                          initial={{ opacity:0, y:4, scale:0.9 }} animate={{ opacity:1, y:0, scale:1 }} exit={{ opacity:0, scale:0.9 }} transition={{ duration:0.18 }}
                        >
                          <Mic className="w-2.5 h-2.5" />
                          {g}
                        </motion.span>
                      ))}
                      {/* Listening genres with headphones icon */}
                      {profile?.genres_listening?.slice(0,3).map(g => (
                        <motion.span key={`listening-${g}`} className="text-[10px] uppercase tracking-wide px-2 py-1 rounded-full bg-accent/20 text-accent flex items-center gap-1"
                          initial={{ opacity:0, y:4, scale:0.9 }} animate={{ opacity:1, y:0, scale:1 }} exit={{ opacity:0, scale:0.9 }} transition={{ duration:0.18, delay:0.02 }}
                        >
                          <img src={headphonesIcon} alt="" className="w-2.5 h-2.5 object-contain" />
                          {g}
                        </motion.span>
                      ))}
                      {/* Fallback to combined genres for backward compatibility */}
                      {(!profile?.genres_singing?.length && !profile?.genres_listening?.length) && 
                        profile?.fav_genres?.slice(0,4).map(g => (
                          <motion.span key={g} className="text-[10px] uppercase tracking-wide px-2 py-1 rounded-full bg-input/40 text-card-foreground/70"
                            initial={{ opacity:0, y:4, scale:0.9 }} animate={{ opacity:1, y:0, scale:1 }} exit={{ opacity:0, scale:0.9 }} transition={{ duration:0.18 }}
                          >{g}</motion.span>
                        ))
                      }
                      {/* Favorite artists */}
                      {profile?.favorite_artists?.slice(0,2).map(a => (
                        <motion.span key={a} className="text-[10px] px-2 py-1 rounded-full bg-input/40 text-card-foreground/70"
                          initial={{ opacity:0, y:4, scale:0.9 }} animate={{ opacity:1, y:0, scale:1 }} exit={{ opacity:0, scale:0.9 }} transition={{ duration:0.18, delay:0.04 }}
                        >{a}</motion.span>
                      ))}
                    </AnimatePresence>
                  </motion.div>
                </div>
              </div>
              <div className="flex gap-2">
                <AnimatedButton variant="ghost" size="icon" onClick={onClose} className="h-9 w-9"><X className="w-4 h-4" /><span className="sr-only">Close</span></AnimatedButton>
              </div>
  </div>
  <div className="p-6 space-y-10">
              {/* Contact & Links */}
              <motion.section className="space-y-3"
                initial={!prefersReducedMotion ? { opacity:0, y:12 } : false}
                animate={!prefersReducedMotion ? { opacity:1, y:0 } : {}}
                transition={{ duration:0.4, ease:[0.22,0.72,0.28,0.99] }}
              >
                <h3 className="text-[18px] font-semibold tracking-wide text-card-foreground/70" style={{ fontFamily: '"Love Ya Like A Sister"' }}>CONNECT</h3>
                <div className="flex flex-wrap gap-3">
                  <AnimatedButton 
                    variant="outline" 
                    size="sm" 
                    className="gap-2"
                    onClick={handleMessageClick}
                    disabled={!canMessage || loadingProfile || sendingMessage || !profile}
                    aria-disabled={!canMessage || loadingProfile || !profile}
                  >
                    <img src={messagesIcon} alt="Message" className="w-4 h-4" />
                    Message
                  </AnimatedButton>
                  <AnimatedButton variant="outline" size="sm" className="gap-2"><Share2 className="w-4 h-4" />Share</AnimatedButton>
                </div>
                {!loadingProfile && !isOwnProfile && profile && !profile.dm_enabled && (
                  <p className="text-[11px] text-card-foreground/60">
                    {profile.display_name || 'This performer'} has DMs turned off for now.
                  </p>
                )}
                <AnimatePresence>
                  {showMessageComposer && canMessage && (
                    <motion.div
                      key="message-composer"
                      className="w-full max-w-md rounded-2xl border border-card-border/60 bg-card/70 p-4 shadow-sm space-y-3"
                      initial={!prefersReducedMotion ? { opacity: 0, y: 12 } : false}
                      animate={!prefersReducedMotion ? { opacity: 1, y: 0 } : {}}
                      exit={!prefersReducedMotion ? { opacity: 0, y: -8 } : {}}
                      transition={{ duration: 0.25 }}
                    >
                      <Textarea
                        ref={messageTextareaRef}
                        value={messageDraft}
                        onChange={event => setMessageDraft(event.target.value)}
                        placeholder={`Say hi to ${profile?.display_name || 'this performer'}...`}
                        maxLength={500}
                        disabled={sendingMessage}
                        className="min-h-[120px] resize-none bg-input/40 border-card-border/60 text-sm text-card-foreground/80 placeholder:text-card-foreground/50 focus-visible:ring-primary/40"
                      />
                      <div className="flex items-center justify-between text-[11px] text-card-foreground/50">
                        <span>{messageDraft.length}/500</span>
                        <div className="flex items-center gap-2">
                          <AnimatedButton
                            size="sm"
                            variant="ghost"
                            onClick={resetComposer}
                            className="px-3"
                            disabled={sendingMessage}
                          >
                            Cancel
                          </AnimatedButton>
                          <AnimatedButton
                            size="sm"
                            variant="secondary"
                            onClick={handleSendMessage}
                            className="px-4 gap-2"
                            disabled={sendingMessage}
                          >
                            {sendingMessage ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Send className="w-4 h-4" />
                            )}
                            Send
                          </AnimatedButton>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                {profile?.profile_note_to_listeners && (
                  <p className="text-xs text-card-foreground/60 max-w-prose leading-relaxed bg-input/30 rounded-xl p-3">{profile.profile_note_to_listeners}</p>
                )}
                {profile?.links && profile.links.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {profile.links.map(l => (
                      <motion.a key={l.url} href={l.url} target="_blank" rel="noreferrer" className="text-xs inline-flex items-center gap-1 px-2 py-1 rounded-full bg-input/40 hover:bg-input/50 transition text-card-foreground/70"
                        whileHover={!prefersReducedMotion ? { y:-2, scale:1.05 } : undefined}
                        whileTap={!prefersReducedMotion ? { scale:0.96 } : undefined}
                      >
                        {l.type === 'website' && <Globe2 className="w-3 h-3" />}
                        {l.type === 'instagram' && <span className="text-xs font-bold">IG</span>}
                        {l.type === 'tiktok' && <span className="text-xs font-bold">TT</span>}
                        {!['website', 'instagram', 'tiktok'].includes(l.type) && <LinkIcon className="w-3 h-3" />}
                        <span className="truncate max-w-[120px]">
                          {l.type === 'instagram' ? `@${l.url.split('/').pop()}` :
                           l.type === 'tiktok' ? `@${l.url.split('/').pop()?.replace('@', '')}` :
                           (() => {
                             try {
                               return new URL(l.url).hostname.replace('www.','');
                             } catch {
                               return l.url.length > 20 ? l.url.substring(0, 20) + '...' : l.url;
                             }
                           })()}
                        </span>
                      </motion.a>
                    ))}
                  </div>
                )}
              </motion.section>

              {/* Recordings */}
              <motion.section className="space-y-4" initial={!prefersReducedMotion ? { opacity:0, y:16 } : false} animate={!prefersReducedMotion ? { opacity:1, y:0 } : {}} transition={{ duration:0.45 }}>
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <h3 className="text-[18px] font-semibold tracking-wide text-card-foreground/70" style={{ fontFamily: '"Love Ya Like A Sister"' }}>RECORDINGS ({filtered.length})</h3>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {loadingRecs && (
                    <div className="col-span-full flex items-center gap-2 text-sm text-card-foreground/60"><Loader2 className="w-4 h-4 animate-spin" /> Loading recordings…</div>
                  )}
                  {!loadingRecs && filtered.map(r => (
                    <motion.div key={r.id} className="p-4 pt-6 rounded-xl border border-card-border/60 bg-card/70 backdrop-blur-sm hover:bg-card/80 transition group relative"
                      initial={!prefersReducedMotion ? { opacity:0, y:8, scale:0.98 } : false}
                      animate={!prefersReducedMotion ? { opacity:1, y:0, scale:1 } : {}}
                      transition={{ duration:0.35 }}
                    >
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
                        <AnimatedButton size="icon" variant="ghost" onClick={() => { if (currentRecording?.id === r.id && isPlaying) { pause(); } else { loadRecording(r); play(); incrementPlay(r.id); r.plays_count += 1; } }} className="h-8 w-8">
                          {currentRecording?.id === r.id && isPlaying ? (
                            <PauseIcon />
                          ) : (
                            <PlayIcon />
                          )}
                          <span className="sr-only">{currentRecording?.id === r.id && isPlaying ? 'Pause' : 'Play'}</span>
                        </AnimatedButton>
                      </div>
                      {r.mood_tags && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {r.mood_tags.slice(0,5).map(tag => (
                            <span key={tag} className="px-2 py-0.5 rounded-full bg-input/40 text-[10px] text-card-foreground/70">{tag}</span>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  ))}
                  {!loadingRecs && filtered.length === 0 && (
                    <div className="col-span-full text-center text-xs text-card-foreground/60 py-8">No recordings match your search.</div>
                  )}
                </div>
              </motion.section>
      </div>
    </ModalShell>
  );
};

const PlayIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor"><path d="M6 4l14 8-14 8z" /></svg>
);
const PauseIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
);
