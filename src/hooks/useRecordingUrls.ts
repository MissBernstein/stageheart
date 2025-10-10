import { useState, useEffect, useCallback } from 'react';
import { getRecordingSignedUrls } from '@/lib/voicesApi';

interface RecordingUrls {
  file_original_url?: string;
  file_stream_url?: string;
  waveform_json_url?: string;
}

interface UseRecordingUrlsResult {
  urls: RecordingUrls | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch signed URLs for a recording's files
 * URLs are fetched on-demand and expire after the specified duration
 */
export function useRecordingUrls(
  recordingId: string | null | undefined,
  expirySeconds: number = 3600
): UseRecordingUrlsResult {
  const [urls, setUrls] = useState<RecordingUrls | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUrls = useCallback(async () => {
    if (!recordingId) {
      setUrls(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await getRecordingSignedUrls(recordingId, expirySeconds);
      if (result) {
        setUrls(result);
      } else {
        setError('Failed to fetch signed URLs');
        setUrls(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
      setUrls(null);
    } finally {
      setLoading(false);
    }
  }, [recordingId, expirySeconds]);

  useEffect(() => {
    fetchUrls();
  }, [fetchUrls]);

  return {
    urls,
    loading,
    error,
    refetch: fetchUrls
  };
}
