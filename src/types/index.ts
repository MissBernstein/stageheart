export interface Song {
  id: string;
  title: string;
  artist: string;
  summary: string;
  theme: string;
  core_feelings: string[];
  access_ideas: string[];
  visual: string;
}

export interface Vibe {
  id: string;
  label: string;
  emotions: string[];
  tips: string[];
}

export interface FeelingMap extends Song {
  // Legacy fields for backward compatibility
  emotions?: string[];
  tips?: string[];
  isVibeBasedMap?: boolean;
  vibeLabel?: string;
}