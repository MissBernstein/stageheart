/**
 * Tests for Discovered Voices Sync Logic
 */

import { describe, it, expect } from 'vitest';
import { mergeDiscovered } from '@/lib/discoveredVoicesSync';
import { DiscoveredVoiceMeta, DiscoveredVoiceRow } from '@/types/discoveredVoices';

describe('Discovered Voices Sync', () => {
  const userId = 'user-123';

  describe('mergeDiscovered', () => {
    it('should keep MIN first_discovered_at when local is earlier', () => {
      const local: DiscoveredVoiceMeta[] = [
        {
          id: 'voice-1',
          display_name: 'Singer A',
          first_discovered_at: '2024-01-01T00:00:00Z',
          last_opened_at: '2024-01-05T00:00:00Z',
        },
      ];

      const remote: DiscoveredVoiceRow[] = [
        {
          user_id: userId,
          voice_user_id: 'voice-1',
          first_discovered_at: '2024-01-03T00:00:00Z',
          last_opened_at: '2024-01-04T00:00:00Z',
        },
      ];

      const { merged } = mergeDiscovered(local, remote);

      expect(merged[0].first_discovered_at).toBe('2024-01-01T00:00:00Z');
    });

    it('should keep MIN first_discovered_at when remote is earlier', () => {
      const local: DiscoveredVoiceMeta[] = [
        {
          id: 'voice-1',
          display_name: 'Singer A',
          first_discovered_at: '2024-01-05T00:00:00Z',
          last_opened_at: '2024-01-10T00:00:00Z',
        },
      ];

      const remote: DiscoveredVoiceRow[] = [
        {
          user_id: userId,
          voice_user_id: 'voice-1',
          first_discovered_at: '2024-01-01T00:00:00Z',
          last_opened_at: '2024-01-08T00:00:00Z',
        },
      ];

      const { merged } = mergeDiscovered(local, remote);

      expect(merged[0].first_discovered_at).toBe('2024-01-01T00:00:00Z');
    });

    it('should keep MAX last_opened_at when local is newer', () => {
      const local: DiscoveredVoiceMeta[] = [
        {
          id: 'voice-1',
          display_name: 'Singer A',
          first_discovered_at: '2024-01-01T00:00:00Z',
          last_opened_at: '2024-01-10T00:00:00Z',
        },
      ];

      const remote: DiscoveredVoiceRow[] = [
        {
          user_id: userId,
          voice_user_id: 'voice-1',
          first_discovered_at: '2024-01-01T00:00:00Z',
          last_opened_at: '2024-01-05T00:00:00Z',
        },
      ];

      const { merged } = mergeDiscovered(local, remote);

      expect(merged[0].last_opened_at).toBe('2024-01-10T00:00:00Z');
    });

    it('should keep MAX last_opened_at when remote is newer', () => {
      const local: DiscoveredVoiceMeta[] = [
        {
          id: 'voice-1',
          display_name: 'Singer A',
          first_discovered_at: '2024-01-01T00:00:00Z',
          last_opened_at: '2024-01-05T00:00:00Z',
        },
      ];

      const remote: DiscoveredVoiceRow[] = [
        {
          user_id: userId,
          voice_user_id: 'voice-1',
          first_discovered_at: '2024-01-01T00:00:00Z',
          last_opened_at: '2024-01-15T00:00:00Z',
        },
      ];

      const { merged } = mergeDiscovered(local, remote);

      expect(merged[0].last_opened_at).toBe('2024-01-15T00:00:00Z');
    });

    it('should adopt remote-only rows', () => {
      const local: DiscoveredVoiceMeta[] = [
        {
          id: 'voice-1',
          display_name: 'Singer A',
          first_discovered_at: '2024-01-01T00:00:00Z',
          last_opened_at: '2024-01-05T00:00:00Z',
        },
      ];

      const remote: DiscoveredVoiceRow[] = [
        {
          user_id: userId,
          voice_user_id: 'voice-1',
          first_discovered_at: '2024-01-01T00:00:00Z',
          last_opened_at: '2024-01-05T00:00:00Z',
        },
        {
          user_id: userId,
          voice_user_id: 'voice-2',
          first_discovered_at: '2024-01-10T00:00:00Z',
          last_opened_at: '2024-01-12T00:00:00Z',
        },
      ];

      const { merged } = mergeDiscovered(local, remote);

      expect(merged.length).toBe(2);
      expect(merged.find(m => m.id === 'voice-2')).toBeDefined();
      expect(merged.find(m => m.id === 'voice-2')?.synced).toBe(true);
    });

    it('should queue local-only rows for upsert', () => {
      const local: DiscoveredVoiceMeta[] = [
        {
          id: 'voice-1',
          display_name: 'Singer A',
          first_discovered_at: '2024-01-01T00:00:00Z',
          last_opened_at: '2024-01-05T00:00:00Z',
        },
        {
          id: 'voice-2',
          display_name: 'Singer B',
          first_discovered_at: '2024-01-10T00:00:00Z',
          last_opened_at: '2024-01-12T00:00:00Z',
        },
      ];

      const remote: DiscoveredVoiceRow[] = [
        {
          user_id: userId,
          voice_user_id: 'voice-1',
          first_discovered_at: '2024-01-01T00:00:00Z',
          last_opened_at: '2024-01-05T00:00:00Z',
        },
      ];

      const { merged, upserts } = mergeDiscovered(local, remote);

      expect(merged.length).toBe(2);
      expect(upserts.length).toBe(1);
      expect(upserts[0].voice_user_id).toBe('voice-2');
      expect(merged.find(m => m.id === 'voice-2')?.synced).toBe(false);
    });

    it('should de-duplicate local entries by id', () => {
      const local: DiscoveredVoiceMeta[] = [
        {
          id: 'voice-1',
          display_name: 'Singer A',
          first_discovered_at: '2024-01-01T00:00:00Z',
          last_opened_at: '2024-01-05T00:00:00Z',
        },
        {
          id: 'voice-1',
          display_name: 'Singer A Duplicate',
          first_discovered_at: '2024-01-02T00:00:00Z',
          last_opened_at: '2024-01-06T00:00:00Z',
        },
      ];

      const remote: DiscoveredVoiceRow[] = [];

      const { merged } = mergeDiscovered(local, remote);

      expect(merged.length).toBe(1);
      expect(merged[0].id).toBe('voice-1');
    });

    it('should sort merged results by last_opened_at DESC', () => {
      const local: DiscoveredVoiceMeta[] = [
        {
          id: 'voice-1',
          display_name: 'Singer A',
          first_discovered_at: '2024-01-01T00:00:00Z',
          last_opened_at: '2024-01-05T00:00:00Z',
        },
        {
          id: 'voice-2',
          display_name: 'Singer B',
          first_discovered_at: '2024-01-02T00:00:00Z',
          last_opened_at: '2024-01-10T00:00:00Z',
        },
        {
          id: 'voice-3',
          display_name: 'Singer C',
          first_discovered_at: '2024-01-03T00:00:00Z',
          last_opened_at: '2024-01-08T00:00:00Z',
        },
      ];

      const remote: DiscoveredVoiceRow[] = [];

      const { merged } = mergeDiscovered(local, remote);

      expect(merged[0].id).toBe('voice-2'); // Most recent
      expect(merged[1].id).toBe('voice-3');
      expect(merged[2].id).toBe('voice-1'); // Oldest
    });

    it('should queue upsert when merged differs from remote', () => {
      const local: DiscoveredVoiceMeta[] = [
        {
          id: 'voice-1',
          display_name: 'Singer A',
          first_discovered_at: '2024-01-01T00:00:00Z',
          last_opened_at: '2024-01-10T00:00:00Z',
        },
      ];

      const remote: DiscoveredVoiceRow[] = [
        {
          user_id: userId,
          voice_user_id: 'voice-1',
          first_discovered_at: '2024-01-02T00:00:00Z',
          last_opened_at: '2024-01-05T00:00:00Z',
        },
      ];

      const { upserts } = mergeDiscovered(local, remote);

      expect(upserts.length).toBe(1);
      expect(upserts[0].first_discovered_at).toBe('2024-01-01T00:00:00Z');
      expect(upserts[0].last_opened_at).toBe('2024-01-10T00:00:00Z');
    });

    it('should not queue upsert when local and remote match', () => {
      const local: DiscoveredVoiceMeta[] = [
        {
          id: 'voice-1',
          display_name: 'Singer A',
          first_discovered_at: '2024-01-01T00:00:00Z',
          last_opened_at: '2024-01-05T00:00:00Z',
        },
      ];

      const remote: DiscoveredVoiceRow[] = [
        {
          user_id: userId,
          voice_user_id: 'voice-1',
          first_discovered_at: '2024-01-01T00:00:00Z',
          last_opened_at: '2024-01-05T00:00:00Z',
        },
      ];

      const { upserts } = mergeDiscovered(local, remote);

      expect(upserts.length).toBe(0);
    });
  });
});
