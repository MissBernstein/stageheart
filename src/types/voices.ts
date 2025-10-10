// TypeScript definitions for Stageheart Voices & Profiles features

export interface User {
  id: string;
  email: string;
  displayName: string;
}

export interface UserProfile {
  id: string;
  display_name: string;
  about?: string;
  fav_genres?: string[]; // Keep for backward compatibility
  genres_singing?: string[]; // New field for singing genres
  genres_listening?: string[]; // New field for listening genres
  favorite_artists?: string[];
  groups?: string[];
  links?: ProfileLink[];
  contact_visibility: 'public' | 'after_meet' | 'private';
  dm_enabled: boolean;
  comments_enabled: boolean;
  profile_note_to_listeners?: string;
  status: 'active' | 'suspended';
  created_at: string;
  updated_at: string;
}

export interface ProfileLink {
  type: 'website' | 'instagram' | 'tiktok' | 'email' | 'other';
  url: string;
  visibility: 'public' | 'after_meet' | 'private';
}

export interface Recording {
  id: string;
  user_id?: string; // Only present for owner's own recordings; excluded from public queries for privacy
  title: string;
  file_original_url?: string;
  file_stream_url?: string;
  filesize_bytes?: number;
  duration_sec?: number;
  format_original?: 'wav' | 'm4a' | 'mp3' | 'opus';
  format_stream?: 'mp3' | 'opus';
  loudness_lufs?: number;
  waveform_json_url?: string;
  mood_tags?: string[];
  voice_type?: string;
  language?: string;
  is_signature: boolean;
  state: 'private' | 'unlisted' | 'public';
  comments_enabled: boolean;
  plays_count: number;
  reports_count: number;
  moderation_status: 'clean' | 'pending' | 'flagged' | 'blocked';
  created_at: string;
  updated_at: string;
  
  // Relations (populated when joined)
  user_profile?: UserProfile;
}

export interface RecordingMeet {
  id: string;
  recording_id: string;
  listener_user_id: string;
  met_at: string;
}

export interface Comment {
  id: string;
  recording_id: string;
  author_user_id: string;
  body: string;
  state: 'pending' | 'published' | 'rejected';
  created_at: string;
  author?: Pick<UserProfile, 'display_name'>;
}

export interface Message {
  id: string;
  to_user_id: string;
  from_user_id: string;
  body: string;
  is_read: boolean;
  created_at: string;
  from?: Pick<UserProfile, 'display_name'>;
}

export interface RecordingReport {
  id: string;
  recording_id: string;
  reporter_user_id?: string;
  reason: string;
  created_at: string;
}

// UI State Types
export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

export interface UploadProgress {
  file: File;
  progress: number;
  status: 'idle' | 'uploading' | 'processing' | 'complete' | 'error';
  error?: string;
}

export interface PlayerState {
  currentRecording?: Recording;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
}

export interface PublicQuota {
  current: number;
  max: number;
}

// Form Types
export interface RecordingMetadata {
  title: string;
  mood_tags: string[];
  voice_type?: string;
  language?: string;
  comments_enabled: boolean;
}

export interface ProfileFormData {
  display_name: string;
  about: string;
  fav_genres: string[];
  favorite_artists: string[];
  groups: string[];
  links: ProfileLink[];
  dm_enabled: boolean;
  comments_enabled: boolean;
  profile_note_to_listeners: string;
}

// Component Props
export interface RecordingCardProps {
  recording: Recording;
  onPlay?: (recording: Recording) => void;
  onEdit?: (recording: Recording) => void;
  onToggleState?: (recording: Recording, newState: Recording['state']) => void;
  onDelete?: (recording: Recording) => void;
  onSetSignature?: (recording: Recording) => void;
}

export interface VoiceCardProps {
  recording: Pick<Recording, 'id' | 'title' | 'mood_tags' | 'duration_sec' | 'plays_count'>;
  onPlay: (recordingId: string) => void;
}

export interface ProfileSectionProps {
  profile: UserProfile;
  hasMet: boolean;
  isOwnProfile: boolean;
}

// API Response Types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  hasMore: boolean;
  nextCursor?: string;
}