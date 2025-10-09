/**
 * Discovered Voices Sync Logic
 * Handles merging local and remote discovered voices with conflict resolution
 */

import { supabase } from '@/integrations/supabase/client';
import { DiscoveredVoiceMeta, DiscoveredVoiceRow, SyncResult } from '@/types/discoveredVoices';

const DISCOVERED_LS_KEY = 'stageheart_discovered_voice_ids_v1';
const DISCOVERED_LAST_SYNC_KEY = 'stageheart_discovered_voice_last_sync_v1';

/**
 * Load discovered voices from localStorage
 */
export function loadLocalDiscovered(): DiscoveredVoiceMeta[] {
  try {
    const raw = localStorage.getItem(DISCOVERED_LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    
    // Convert old numeric timestamps to ISO strings if needed
    return parsed
      .filter(p => p && p.id && p.display_name)
      .map(p => ({
        ...p,
        first_discovered_at: typeof p.first_discovered_at === 'number' 
          ? new Date(p.first_discovered_at).toISOString()
          : p.first_discovered_at,
        last_opened_at: typeof p.last_opened_at === 'number'
          ? new Date(p.last_opened_at).toISOString()
          : p.last_opened_at,
      }));
  } catch {
    return [];
  }
}

/**
 * Save discovered voices to localStorage
 */
export function saveLocalDiscovered(items: DiscoveredVoiceMeta[]): void {
  try {
    localStorage.setItem(DISCOVERED_LS_KEY, JSON.stringify(items));
  } catch (error) {
    console.error('Failed to save discovered voices to localStorage:', error);
  }
}

/**
 * Get last sync timestamp
 */
export function getLastSyncTime(): number {
  try {
    return parseInt(localStorage.getItem(DISCOVERED_LAST_SYNC_KEY) || '0', 10);
  } catch {
    return 0;
  }
}

/**
 * Set last sync timestamp
 */
export function setLastSyncTime(timestamp: number): void {
  try {
    localStorage.setItem(DISCOVERED_LAST_SYNC_KEY, String(timestamp));
  } catch (error) {
    console.error('Failed to save last sync time:', error);
  }
}

/**
 * Merge local and remote discovered voices with conflict resolution
 * Rules:
 * - first_discovered_at: MIN(local, remote)
 * - last_opened_at: MAX(local, remote)
 * - New records (missing remotely) are queued for upsert
 * - Remote-only records are adopted locally
 */
export function mergeDiscovered(
  localItems: DiscoveredVoiceMeta[],
  remoteData: DiscoveredVoiceRow[]
): {
  merged: DiscoveredVoiceMeta[];
  upserts: DiscoveredVoiceRow[];
} {
  const remoteMap = new Map(
    remoteData.map(r => [r.voice_user_id, r])
  );
  
  const merged: DiscoveredVoiceMeta[] = [];
  const upsertsMap = new Map<string, DiscoveredVoiceRow>();

  // De-duplicate local entries by id (shouldn't happen but be safe)
  const localMap = new Map<string, DiscoveredVoiceMeta>();
  for (const item of localItems) {
    if (!localMap.has(item.id)) {
      localMap.set(item.id, item);
    }
  }

  // Process local items
  for (const [voiceId, local] of localMap.entries()) {
    const remote = remoteMap.get(voiceId);
    
    if (remote) {
      // Both exist - merge with conflict resolution
      const localFirstDate = new Date(local.first_discovered_at);
      const remoteFirstDate = new Date(remote.first_discovered_at);
      const localLastDate = new Date(local.last_opened_at);
      const remoteLastDate = new Date(remote.last_opened_at);

      const first_discovered_at = localFirstDate < remoteFirstDate
        ? local.first_discovered_at
        : remote.first_discovered_at;
      
      const last_opened_at = localLastDate > remoteLastDate
        ? local.last_opened_at
        : remote.last_opened_at;

      merged.push({
        id: voiceId,
        display_name: local.display_name,
        first_discovered_at,
        last_opened_at,
        synced: true,
      });

      // If merged differs from remote, queue for upsert
      if (
        remote.first_discovered_at !== first_discovered_at ||
        remote.last_opened_at !== last_opened_at
      ) {
        upsertsMap.set(voiceId, {
          user_id: remote.user_id,
          voice_user_id: voiceId,
          first_discovered_at,
          last_opened_at,
        });
      }

      remoteMap.delete(voiceId);
    } else {
      // Local only - queue for insert
      merged.push({
        ...local,
        synced: false,
      });
      
      // Will be upserted with user_id filled in by caller
      upsertsMap.set(voiceId, {
        user_id: '', // Filled by caller
        voice_user_id: voiceId,
        first_discovered_at: local.first_discovered_at,
        last_opened_at: local.last_opened_at,
      });
    }
  }

  // Adopt remaining remote-only records
  for (const [voiceId, remote] of remoteMap.entries()) {
    merged.push({
      id: voiceId,
      display_name: localItems.find(l => l.id === voiceId)?.display_name || '(Unknown)',
      first_discovered_at: remote.first_discovered_at,
      last_opened_at: remote.last_opened_at,
      synced: true,
    });
  }

  // Sort by last_opened_at (most recent first)
  merged.sort((a, b) => 
    new Date(b.last_opened_at).getTime() - new Date(a.last_opened_at).getTime()
  );

  return {
    merged,
    upserts: Array.from(upsertsMap.values()),
  };
}

/**
 * Sync discovered voices with backend
 * @param localItems Current local discovered voices
 * @param userId Current authenticated user ID
 * @returns Sync result with merged list
 */
export async function syncDiscoveredVoices(
  localItems: DiscoveredVoiceMeta[],
  userId: string
): Promise<SyncResult> {
  try {
    // Check if offline
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return {
        success: false,
        merged: localItems,
        error: 'Offline - sync will retry later',
      };
    }

    // Fetch remote data
    const { data: remoteData, error: fetchError } = await supabase
      .from('discovered_voices')
      .select('user_id, voice_user_id, first_discovered_at, last_opened_at')
      .eq('user_id', userId);

    if (fetchError) {
      console.error('Sync fetch error:', fetchError);
      return {
        success: false,
        merged: localItems,
        error: fetchError.message,
      };
    }

    // Merge local and remote
    const { merged, upserts } = mergeDiscovered(localItems, remoteData || []);

    // Perform upserts if needed
    if (upserts.length > 0) {
      // Fill in user_id for new records
      const upsertsWithUserId = upserts.map(u => ({
        ...u,
        user_id: userId,
      }));

      const { error: upsertError } = await supabase
        .from('discovered_voices')
        .upsert(upsertsWithUserId, {
          onConflict: 'user_id,voice_user_id',
        });

      if (upsertError) {
        console.error('Sync upsert error:', upsertError);
        return {
          success: false,
          merged: localItems,
          error: upsertError.message,
        };
      }

      // Mark all as synced
      merged.forEach(m => {
        m.synced = true;
        m.dirty = false;
      });
    }

    // Update last sync time
    setLastSyncTime(Date.now());

    // Save merged result to localStorage
    saveLocalDiscovered(merged);

    return {
      success: true,
      merged,
    };
  } catch (error) {
    console.error('Sync error:', error);
    return {
      success: false,
      merged: localItems,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
