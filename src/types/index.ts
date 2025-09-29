export interface Song {
  id: string;
  title: string;
  artist: string;
  emotions: string[];
  tips: string[];
}

export interface Vibe {
  id: string;
  label: string;
  emotions: string[];
  tips: string[];
}

export interface FeelingMap extends Song {
  isVibeBasedMap?: boolean;
  vibeLabel?: string;
}