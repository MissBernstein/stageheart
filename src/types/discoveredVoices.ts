/**
 * Types for Discovered Voices feature with backend sync
 */

/**
 * Database row shape for discovered_voices table
 */
export interface DiscoveredVoiceRow {
  user_id: string;
  voice_user_id: string;
  first_discovered_at: string; // ISO timestamp
  last_opened_at: string; // ISO timestamp
}

/**
 * Client-side metadata with sync status
 */
export interface DiscoveredVoiceMeta {
  id: string; // voice_user_id (UUID of the voice/profile)
  display_name: string;
  first_discovered_at: string; // ISO timestamp
  last_opened_at: string; // ISO timestamp
  synced?: boolean; // true if synced with backend
  dirty?: boolean; // true if local changes not yet synced
}

/**
 * Sync result payload
 */
export interface SyncResult {
  success: boolean;
  merged: DiscoveredVoiceMeta[];
  error?: string;
}
