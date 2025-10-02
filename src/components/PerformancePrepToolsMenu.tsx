import { useState, useEffect, useRef } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { AnimatedButton } from '@/ui/AnimatedButton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Trash2, Mic, Music, Volume2, Zap, List } from 'lucide-react';
import { Song } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import prepIcon from '@/assets/prepicon.png';
import { ChipToggle } from '@/ui/ChipToggle';
import { AnimatedCard } from '@/ui/AnimatedCard';
import { AnimatedListItem } from '@/ui/AnimatedListItem';
import { motion, AnimatePresence } from 'framer-motion';
import { MotionIfOkay } from '@/ui/MotionIfOkay';
import { fadeInUp, motionDur, motionEase } from '@/ui/motion';
import { usePrefersReducedMotion } from '@/ui/usePrefersReducedMotion';
import { useNavigate } from 'react-router-dom';
import {
  generateWarmupPlan,
  WARMUP_VIBE_OPTIONS,
  WARMUP_VIBE_LABELS,
  WarmupVibe,
  VoiceType,
  Technique,
  WarmupRequest,
  WarmupPlan,
  TECHNIQUE_LABELS,
} from '@/lib/warmupGenerator';
import {
  buildSetlist,
  SetlistRequest,
  SetlistResponse,
  SetlistSource,
  SetlistItem,
  getStoredSetlistSource,
  storeSetlistSource,
} from '@/lib/setlistBuilder';
import { WarmupCriteriaPreview } from '@/components/WarmupCriteriaPreview';
import PitchDetectorCard, { MetronomeCard } from '@/components/PitchDetector';
import { Input } from '@/components/ui/input';

// Import the full original PerformancePrepTools functionality
import { PerformancePrepTools as OriginalPrepTools } from './PerformancePrepTools';

type ToolCategory = 'menu' | 'warmup' | 'setlist' | 'pitch' | 'metronome' | 'backing';

interface ToolCategoryCard {
  id: ToolCategory;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const TOOL_CATEGORIES: ToolCategoryCard[] = [
  {
    id: 'warmup',
    title: 'Warm Up',
    description: 'AI-generated warm-up routines with vibe selection, voice types, and techniques',
    icon: Zap,
    color: 'bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-yellow-500/30'
  },
  {
    id: 'setlist',
    title: 'Set List Builder',
    description: 'Build cohesive setlists based on emotional arcs and song transitions',
    icon: List,
    color: 'bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border-blue-500/30'
  },
  {
    id: 'pitch',
    title: 'Pitch Detector',
    description: 'Real-time pitch detection and tuning assistance for vocal training',
    icon: Mic,
    color: 'bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-green-500/30'
  },
  {
    id: 'metronome',
    title: 'Metronome',
    description: 'Visual and audio metronome with customizable tempo and beat patterns',
    icon: Clock,
    color: 'bg-gradient-to-br from-purple-500/20 to-violet-500/20 border-purple-500/30'
  },
  {
    id: 'backing',
    title: 'Backing Tracks',
    description: 'Practice with backing tracks and accompaniment (coming soon)',
    icon: Music,
    color: 'bg-gradient-to-br from-pink-500/20 to-rose-500/20 border-pink-500/30'
  }
];

interface PerformancePrepToolsProps {
  currentSong?: Song;
  onClose: () => void;
  songs: Song[];
}

export const PerformancePrepTools = ({ currentSong, onClose, songs }: PerformancePrepToolsProps) => {
  const [currentTool, setCurrentTool] = useState<ToolCategory>('menu');
  const prefersReducedMotion = usePrefersReducedMotion();
  const navigate = useNavigate();

  // For the original functionality, we'll render it in a separate container
  // when user selects warmup or setlist
  if (currentTool === 'warmup' || currentTool === 'setlist') {
    return (
      <OriginalPrepTools
        currentSong={currentSong}
        onClose={() => setCurrentTool('menu')}
        songs={songs}
        initialTool={currentTool}
      />
    );
  }

  return (
    <MotionIfOkay>
      <motion.div
        initial={prefersReducedMotion ? false : fadeInUp.initial}
        animate={prefersReducedMotion ? undefined : fadeInUp.animate}
        exit={prefersReducedMotion ? undefined : fadeInUp.exit}
        className="fixed inset-0 bg-background z-50 overflow-y-auto min-h-screen w-full"
      >
        <div className="container mx-auto px-4 py-8">
          <Card className="max-w-4xl mx-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      navigate('/');
                    }}
                    className="flex items-center gap-2 group"
                  >
                    <img
                      src={prepIcon}
                      alt="Performance prep icon"
                      className="w-12 h-12 transition-transform duration-200 group-hover:scale-105"
                    />
                    <span>Performance Prep Tools</span>
                  </button>
                </CardTitle>
                <AnimatedButton
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="h-10 w-10 text-lg text-card-foreground/60 hover:text-card-foreground"
                >
                  <span aria-hidden>×</span>
                  <span className="sr-only">Close performance prep tools</span>
                </AnimatedButton>
              </div>
              {currentSong && (
                <p className="text-sm text-card-foreground/70">
                  Preparing for "{currentSong.title}" by {currentSong.artist}
                </p>
              )}
            </CardHeader>

            <CardContent>
              {currentTool === 'menu' ? (
                <div className="space-y-6">
                  <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold mb-2">Performance Prep Tools</h2>
                    <p className="text-muted-foreground">
                      Choose a tool to enhance your performance preparation
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {TOOL_CATEGORIES.map((category) => {
                      const Icon = category.icon;
                      const isComingSoon = category.id === 'backing';
                      
                      return (
                        <motion.div
                          key={category.id}
                          initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ 
                            duration: motionDur.base / 1000, 
                            ease: motionEase.standard,
                            delay: TOOL_CATEGORIES.indexOf(category) * 0.1
                          }}
                          whileHover={prefersReducedMotion ? {} : { y: -4, scale: 1.02 }}
                          className="cursor-pointer"
                          onClick={() => !isComingSoon && setCurrentTool(category.id)}
                        >
                          <Card className={`${category.color} border-2 h-full transition-all duration-200 ${isComingSoon ? 'opacity-60 cursor-not-allowed' : 'hover:shadow-lg'}`}>
                            <CardContent className="p-6">
                              <div className="flex items-start gap-4">
                                <div className="flex-shrink-0">
                                  <Icon className="w-8 h-8 text-foreground" />
                                </div>
                                <div className="flex-1">
                                  <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                                    {category.title}
                                    {isComingSoon && (
                                      <Badge variant="secondary" className="text-xs">
                                        Coming Soon
                                      </Badge>
                                    )}
                                  </h3>
                                  <p className="text-sm text-muted-foreground">
                                    {category.description}
                                  </p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center gap-4 pb-4 border-b">
                    <AnimatedButton
                      variant="ghost"
                      onClick={() => setCurrentTool('menu')}
                      className="flex items-center gap-2"
                    >
                      ← Back to Tools
                    </AnimatedButton>
                    <div className="flex items-center gap-2">
                      {(() => {
                        const category = TOOL_CATEGORIES.find(c => c.id === currentTool);
                        if (category) {
                          const Icon = category.icon;
                          return (
                            <>
                              <Icon className="w-5 h-5" />
                              <h2 className="text-xl font-semibold">{category.title}</h2>
                            </>
                          );
                        }
                        return null;
                      })()} 
                    </div>
                  </div>
                  
                  {currentTool === 'pitch' && (
                    <motion.div
                      initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: motionDur.base / 1000, ease: motionEase.standard }}
                    >
                      <PitchDetectorCard className="border bg-card/95" defaultRange="voice" defaultA4={440} />
                    </motion.div>
                  )}
                  
                  {currentTool === 'metronome' && (
                    <motion.div
                      initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: motionDur.base / 1000, ease: motionEase.standard }}
                    >
                      <MetronomeCard className="border bg-card/95" />
                    </motion.div>
                  )}
                  
                  {currentTool === 'backing' && (
                    <div className="text-center py-12">
                      <Music className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-xl font-semibold mb-2">Backing Tracks</h3>
                      <p className="text-muted-foreground">
                        Backing tracks functionality is coming soon! Practice with accompaniment tracks and adjust tempo.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </MotionIfOkay>
  );
};