export interface Song {
  id: string;
  slug?: string; // canonical slug for translation key mapping
  title: string;
  artist: string;
  summary: string;
  theme: string;
  theme_detail?: string;
  core_feelings: string[];
  access_ideas: string[];
  visual: string;
  // Optional metadata (remote songs)
  created_at?: string; // ISO timestamp (remote only)
  isRemote?: boolean;
  isNew?: boolean; // computed client-side (e.g., created within last X days)
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

export interface Category {
  id: string;
  name: string;
  createdAt: number;
  isPreset?: boolean;
}

export interface CategorySong {
  categoryId: string;
  songId: string;
}
