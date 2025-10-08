import React from 'react';
import { motion } from 'framer-motion';
import { Mic } from 'lucide-react';
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

const MediaPanel: React.FC<MediaPanelProps> = ({ recordings, loadingRecordings, volumeDefault, setVolumeDefault, playAutoplay, setPlayAutoplay, language, setLanguage, updateRecordingState, toast, setRecordings }) => {
  return (
    <div className="space-y-10" id="settings-panel-media" role="tabpanel" aria-labelledby="settings-tab-media">
      <motion.section key="recordings" className="space-y-6" aria-labelledby="recordings-heading" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}} transition={{duration:0.25}}>
        <div className="space-y-1">
          <h3 id="recordings-heading" className="text-sm font-semibold tracking-wide text-card-foreground/70">RECORDINGS</h3>
          <p className="text-xs text-card-foreground/60">Manage visibility for up to 3 recordings. Toggle whether they appear only on your profile or in Discover Voices.</p>
        </div>
        {loadingRecordings ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <span className="ml-2 text-sm text-card-foreground/60">Loading recordings...</span>
          </div>
        ) : recordings.length === 0 ? (
          <div className="text-center py-8 text-card-foreground/60">
            <Mic className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No recordings yet</p>
            <p className="text-xs mt-1">Upload your first recording to get started</p>
          </div>
        ) : (
          <div className="space-y-4">
            {recordings.slice(0, 3).map((recording) => (
              <motion.div
                key={recording.id}
                className="border border-card-border rounded-lg p-4 space-y-3"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h4 className="font-medium text-sm">{recording.title}</h4>
                    <div className="flex items-center gap-2 text-xs text-card-foreground/60">
                      <span>{recording.duration_sec ? `${Math.floor(recording.duration_sec / 60)}:${(recording.duration_sec % 60).toString().padStart(2, '0')}` : 'Unknown duration'}</span>
                      {recording.mood_tags && recording.mood_tags.length > 0 && (
                        <>
                          <span>•</span>
                          <span>{recording.mood_tags.slice(0, 2).join(', ')}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs ${recording.state === 'public' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                      {recording.state === 'public' ? 'Public' : 'Private'}
                    </span>
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
            {recordings.length >= 3 && (
              <div className="text-xs text-card-foreground/60 text-center py-2">Maximum of 3 recordings allowed</div>
            )}
          </div>
        )}
      </motion.section>
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
