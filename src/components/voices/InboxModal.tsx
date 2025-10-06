import React, { useEffect, useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { usePrefersReducedMotion } from '@/ui/usePrefersReducedMotion';
import { ModalShell } from './ModalShell';
import { X, Mail, Bell, Search, HeartHandshake, Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AnimatedButton } from '@/ui/AnimatedButton';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useUnreadMessagesStore } from '@/hooks/useUnreadMessages';
import messagesIcon from '@/assets/messagesicon.png';
// Using relative import to satisfy TS resolution in some environments; alias '@/lib/messagesApi' equivalent
import { listMessages, markAllMessagesRead, markMessageRead, markMessagesRead, MessageRecord } from '../../lib/messagesApi';

type InboxItem = MessageRecord;

interface InboxModalProps { onClose: () => void; returnFocusRef?: React.RefObject<HTMLElement>; }

export const InboxModal: React.FC<InboxModalProps> = ({ onClose, returnFocusRef }) => {
  const prefersReducedMotion = usePrefersReducedMotion();
  const { toast } = useToast();
  const [items, setItems] = useState<InboxItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const { unread, setUnread, markAllRead } = useUnreadMessagesStore();
  const [filter, setFilter] = useState<'all'|'dm'|'meet'|'comment'|'system'>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    listMessages().then(data => { if (active) setItems(data); }).finally(()=> active && setLoading(false));
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', key);
    return () => { active = false; window.removeEventListener('keydown', key); document.body.style.overflow = prev; };
  }, [onClose]);

  // Sync unread store on initial data load
  useEffect(() => {
    if (!loading && items.length) {
      const count = items.filter(i => i.unread).length;
      setUnread(count);
    }
  }, [loading, items, setUnread]);

  const filtered = useMemo(() => {
    let list = items;
    if (filter !== 'all') list = list.filter(i => i.type === filter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(i => i.body.toLowerCase().includes(q) || i.subject?.toLowerCase().includes(q) || i.from?.toLowerCase().includes(q));
    }
    return [...list].sort((a,b) => {
      if (a.unread !== b.unread) return a.unread ? -1 : 1;
      return b.created_at.localeCompare(a.created_at);
    });
  }, [items, filter, search]);

  const active = filtered.find(i => i.id === activeId) || filtered[0];

  useEffect(() => {
    if (!activeId && filtered.length) setActiveId(filtered[0].id);
  }, [filtered, activeId]);

  const markRead = async (id: string) => {
    const wasUnread = items.find(m => m.id === id)?.unread;
    setItems(prev => prev.map(m => m.id === id ? { ...m, unread:false } : m));
    if (wasUnread) setUnread(p => Math.max(0, p - 1));
    markMessageRead(id).catch(()=>{});
  };

  const markSelectedRead = async () => {
    if (selected.size === 0) return;
    const ids = Array.from(selected);
    const dec = items.filter(m => ids.includes(m.id) && m.unread).length;
    if (!dec) return;
    setItems(prev => prev.map(m => ids.includes(m.id) ? { ...m, unread:false } : m));
    setUnread(p => Math.max(0, p - dec));
    setSelected(new Set());
    markMessagesRead(ids).catch(()=>{});
  };

  const handleSend = () => {
    if (!draft.trim()) return;
    toast({ title: 'Message sent', description: 'Your reply has been added.' });
    setDraft('');
  };

  // Motion variants for coordinated list animation
  const listVariants = useMemo(() => ({
    hidden: {},
    show: {
      transition: prefersReducedMotion ? {} : { staggerChildren: 0.045, delayChildren: 0.02 }
    }
  }), [prefersReducedMotion]);

  const itemVariants: Variants = useMemo(() => ({
    hidden: prefersReducedMotion ? {} : { opacity: 0, y: 6 },
    show: prefersReducedMotion ? {} : { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 320, damping: 30, mass: 0.6 } },
    exit: prefersReducedMotion ? {} : { opacity: 0, y: -4, transition: { duration: 0.16 } }
  }), [prefersReducedMotion]);

  return (
    <ModalShell titleId="inbox-title" onClose={onClose} className="max-w-6xl flex flex-col h-[80vh]" contentClassName="flex flex-col h-full" returnFocusRef={returnFocusRef}>
      <div className="p-6 border-b border-card-border flex items-start justify-between gap-4">
              <div className="space-y-1">
                <h2 id="inbox-title" className="text-2xl font-semibold flex items-center gap-2"><img src={messagesIcon} alt="Messages" className="w-8 h-8 rounded-xl" /> Messages</h2>
                <p className="text-xs text-card-foreground/60">Direct messages • meet requests • comments • system updates</p>
              </div>
              <div className="flex items-center gap-2">
                <AnimatedButton size="sm" variant={selectMode? 'secondary':'outline'} className="h-8 text-[11px]" onClick={()=> { if (selectMode) { setSelectMode(false); setSelected(new Set()); } else { setSelectMode(true); } }}>
                  {selectMode ? 'Cancel Select' : 'Select'}
                </AnimatedButton>
                {selectMode && selected.size > 0 && (
                  <AnimatedButton size="sm" variant="secondary" className="h-8 text-[11px]" onClick={async ()=> { await markSelectedRead(); toast({ title: 'Updated', description: 'Selected messages marked read.' }); }}>Mark selected read</AnimatedButton>
                )}
                <AnimatedButton size="sm" variant="outline" className="h-8 text-[11px]" onClick={async ()=> { setItems(prev => prev.map(m => ({...m, unread:false }))); markAllRead(); await markAllMessagesRead().catch(()=>{}); }}>Mark all read</AnimatedButton>
                <AnimatedButton variant="ghost" size="icon" onClick={onClose} className="h-10 w-10"><X /><span className="sr-only">Close inbox</span></AnimatedButton>
              </div>
            </div>
            <div className="flex flex-col md:flex-row flex-1 min-h-0">
              {/* Left Pane */}
              <div className="md:w-72 border-b md:border-b-0 md:border-r border-card-border/60 flex flex-col min-h-0">
                <div className="p-3 flex gap-2 overflow-x-auto">
                  {(['all','dm','meet','comment','system'] as const).map(f => (
                    <motion.button
                      key={f}
                      onClick={()=> setFilter(f)}
                      whileHover={!prefersReducedMotion ? { y:-2, scale:1.05 } : undefined}
                      whileTap={!prefersReducedMotion ? { scale:0.95 } : undefined}
                      className={`px-3 py-1 rounded-full text-xs border transition whitespace-nowrap relative overflow-hidden ${filter===f?'bg-primary/70 border-primary text-primary-foreground shadow-sm':'bg-input/40 border-input-border text-card-foreground/60 hover:text-card-foreground'}`}
                    >
                      {filter===f && !prefersReducedMotion && (
                        <motion.span layoutId="inboxFilterActive" className="absolute inset-0 bg-primary/25" style={{mixBlendMode:'overlay'}} initial={false} transition={{ duration:0.3 }} />
                      )}
                      <span className="relative z-10">{f==='dm'?'direct':f}</span>
                    </motion.button>
                  ))}
                </div>
                <div className="px-3 pb-2 relative">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-card-foreground/40" />
                  <Input value={search} onChange={e=> setSearch(e.target.value)} placeholder="Search" className="pl-8 h-8 text-xs bg-input/50" />
                </div>
                <div className="flex-1 overflow-y-auto custom-scroll pr-1">
                  {loading && (
                    <div className="p-3 space-y-3">
                      {Array.from({length:5}).map((_,i)=>(<div key={i} className="h-14 rounded-lg bg-input/30 border border-card-border/40 animate-pulse" />))}
                    </div>
                  )}
                  <AnimatePresence initial={false} mode="sync">
                  {!loading && (
                    <motion.div
                      key={filter + '::' + search + '::container'}
                      variants={listVariants}
                      initial="hidden"
                      animate="show"
                      exit="hidden"
                      role="list"
                    >
                      {filtered.map(item => (
                        <motion.button
                          key={item.id}
                          layout
                          variants={itemVariants}
                          exit="exit"
                          onClick={() => { setActiveId(item.id); markRead(item.id); }}
                          className={`relative w-full text-left ${selectMode ? 'pl-6' : 'pl-4'} pr-4 py-3 border-b border-card-border/40 hover:bg-card/60 transition focus:outline-none ${activeId===item.id?'bg-card/70':''}`}
                        >
                          <AnimatePresence initial={false}>
                          {selectMode && (
                            <motion.div
                              key="checkbox"
                              className="absolute left-1 top-3"
                              initial={!prefersReducedMotion ? { scale:0.6, opacity:0 } : false}
                              animate={!prefersReducedMotion ? { scale:1, opacity:1 } : {}}
                              exit={!prefersReducedMotion ? { scale:0.6, opacity:0 } : {}}
                              transition={{ type:'spring', stiffness:320, damping:22 }}
                            >
                              <input type="checkbox" aria-label="Select message" className="h-3.5 w-3.5 rounded border-card-border/60 text-primary focus:ring-primary" onClick={e=> e.stopPropagation()} checked={selected.has(item.id)} onChange={e=> setSelected(prev => { const next = new Set(prev); if (e.target.checked) next.add(item.id); else next.delete(item.id); return next; })} />
                            </motion.div>
                          )}
                          </AnimatePresence>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-card-foreground truncate">{item.subject || 'No subject'}</p>
                          <p className="text-[10px] text-card-foreground/60 truncate">{item.from || 'System'} • {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute:'2-digit' })}</p>
                        </div>
                        {item.unread && (
                          <motion.span
                            layoutId={`unread-${item.id}`}
                            className="w-2 h-2 rounded-full bg-accent shrink-0 mt-1"
                            initial={!prefersReducedMotion ? { scale:0.5, opacity:0 } : false}
                            animate={!prefersReducedMotion ? { scale:1, opacity:1 } : {}}
                            exit={!prefersReducedMotion ? { scale:0.4, opacity:0 } : {}}
                            transition={{ type:'spring', stiffness:260, damping:20 }}
                          />
                        )}
                      </div>
                          <p className="text-[11px] text-card-foreground/50 line-clamp-2 mt-1">{item.body}</p>
                        </motion.button>
                      ))}
                    </motion.div>
                  )}
                  </AnimatePresence>
                  {!loading && filtered.length===0 && (
                    <div className="p-6 text-center text-xs text-card-foreground/50">No messages</div>
                  )}
                </div>
              </div>
              {/* Right Pane */}
              <div className="flex-1 flex flex-col min-h-0">
                {active ? (
                  <motion.div
                    key={active.id}
                    className="flex-1 overflow-y-auto p-6 space-y-6"
                    initial={!prefersReducedMotion ? { opacity:0, y:8 } : false}
                    animate={!prefersReducedMotion ? { opacity:1, y:0 } : {}}
                    exit={!prefersReducedMotion ? { opacity:0, y:-6 } : {}}
                    transition={{ duration:0.3 }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1 min-w-0">
                        <h3 className="font-semibold text-card-foreground leading-tight text-sm truncate">{active.subject}</h3>
                        <p className="text-[11px] text-card-foreground/60">{active.from || 'System'} • {new Date(active.created_at).toLocaleString([], { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' })}</p>
                      </div>
                      <div className="flex gap-2">
                        {active.unread && <AnimatedButton size="sm" variant="outline" onClick={()=> markRead(active.id)} className="h-7 px-2 text-[11px]">Mark read</AnimatedButton>}
                        <AnimatedButton size="sm" variant="outline" className="h-7 px-2 text-[11px]">Meet</AnimatedButton>
                      </div>
                    </div>
                    <motion.div
                      className="text-sm text-card-foreground/80 leading-relaxed whitespace-pre-wrap bg-input/30 p-4 rounded-xl border border-card-border/60"
                      initial={!prefersReducedMotion ? { opacity:0, y:6 } : false}
                      animate={!prefersReducedMotion ? { opacity:1, y:0 } : {}}
                      transition={{ duration:0.35 }}
                    >
                      {active.body.repeat(2)}
                    </motion.div>
                    {/* Thread / replies placeholder */}
                    <div className="space-y-3">
                      <p className="text-[11px] text-card-foreground/50 uppercase tracking-wide">Recent Replies (mock)</p>
                      <div className="space-y-2 text-xs">
                        <div className="p-2 rounded-lg bg-card/60 border border-card-border/50"><span className="font-medium">You:</span> Thanks! Will listen soon.</div>
                        <div className="p-2 rounded-lg bg-card/60 border border-card-border/50"><span className="font-medium">{active.from||'System'}:</span> Let me know what you think.</div>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-xs text-card-foreground/50">No message selected.</div>
                )}
                {/* Composer */}
                <div className="border-t border-card-border/60 p-4 flex items-start gap-3">
                  <div className="flex-1 relative">
                    <textarea value={draft} onChange={e=> setDraft(e.target.value)} placeholder="Write a reply…" rows={2} className="w-full resize-none bg-input/50 rounded-xl p-3 text-sm border border-input-border focus:outline-none focus:ring-1 focus:ring-primary/60" />
                    <div className="absolute bottom-2 right-2 flex gap-2">
                      <AnimatedButton size="sm" variant="secondary" disabled={!draft.trim()} onClick={handleSend} className="h-7 px-3 text-[11px] flex items-center gap-1"><Send className="w-3 h-3" /> Send</AnimatedButton>
                    </div>
                  </div>
                </div>
              </div>
            </div>
    </ModalShell>
  );
};
