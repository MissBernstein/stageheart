// Real Supabase implementation for voices/profile data access
import { supabase } from '@/integrations/supabase/client';
import { Recording, UserProfile } from '@/types/voices';

export interface ListVoicesParams {
  search?: string;
  mood?: string;
  limit?: number;
}

export async function listVoices(params: ListVoicesParams = {}): Promise<Recording[]> {
  const { search, mood, limit = 50 } = params;
  
  // Select columns excluding file URLs and user_id for security
  // Note: user_id is kept internally for profile fetching but removed from final response
  let query = supabase
    .from('recordings')
    .select('id, user_id, title, filesize_bytes, duration_sec, format_original, format_stream, loudness_lufs, mood_tags, voice_type, language, is_signature, state, comments_enabled, plays_count, reports_count, moderation_status, created_at, updated_at')
    .eq('state', 'public')
    .eq('moderation_status', 'clean')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (mood) {
    query = query.contains('mood_tags', [mood]);
  }

  const { data, error } = await query;
  
  if (error) {
    console.error('Error fetching recordings:', error);
    return [];
  }

  const recordings = data || [];

  // Fetch user profiles for all recordings
  const userIds = [...new Set(recordings.map(r => r.user_id))];
  
  // Select only columns appropriate for public listing, including contact_visibility for filtering
  const { data: profiles, error: profilesError } = await supabase
    .from('user_profiles')
    .select('id, display_name, about, fav_genres, favorite_artists, links, status, contact_visibility')
    .in('id', userIds);
    
  if (profilesError) {
    console.warn('Profile fetch restricted or failed; attempting sanitized fallback:', profilesError.message);
    // Fallback: call sanitized RPC if available (anonymous safe). We only supply ids to reduce data volume
    const { data: sanitized, error: sanitizedErr } = await (supabase as any).rpc('fetch_public_profiles', { p_ids: userIds });
    if (!sanitizedErr && Array.isArray(sanitized)) {
      const existing = (profiles as any[] | null) || [];
      for (const s of sanitized) {
        existing.push({
          id: s.id,
          display_name: s.display_name,
          about: s.about_snippet,
          fav_genres: s.genres,
          favorite_artists: s.favorite_artists_sample,
          links: [],
          status: 'active',
          contact_visibility: 'public' // Sanitized profiles are public
        });
      }
      (profiles as any) = existing;
    } else if (sanitizedErr) {
      console.warn('Sanitized profile fallback failed:', sanitizedErr.message);
    }
  }

  const profileMap = new Map((profiles || []).map(p => [p.id, p]));

  // Combine recordings with their profiles and REMOVE user_id for security
  // Also filter profile data based on contact_visibility
  let result = recordings.map(r => {
    const { user_id, ...recordingWithoutUserId } = r;
    const fullProfile = profileMap.get(user_id);
    
    let userProfile: UserProfile | undefined = undefined;
    
    if (fullProfile) {
      // For public visibility, show full profile
      if (fullProfile.contact_visibility === 'public') {
        userProfile = {
          ...fullProfile,
          links: Array.isArray(fullProfile.links) ? fullProfile.links as any[] : []
        } as UserProfile;
      } else {
        // For after_meet or private, only show basic info in listing
        // Full profile data requires opening the profile page
        userProfile = {
          id: fullProfile.id,
          display_name: fullProfile.display_name,
          status: fullProfile.status,
          contact_visibility: fullProfile.contact_visibility,
          dm_enabled: false,
          comments_enabled: false,
          links: [],
          created_at: '',
          updated_at: ''
        } as UserProfile;
      }
    }
    
    return {
      ...recordingWithoutUserId,
      user_profile: userProfile
    };
  }) as Recording[];

  // Apply search filter
  if (search) {
    const q = search.toLowerCase();
    result = result.filter(r => 
      r.title.toLowerCase().includes(q) || 
      r.user_profile?.display_name?.toLowerCase().includes(q)
    );
  }

  return result;
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  console.log('getUserProfile called with userId:', userId);
  
  const { data, error } = await supabase
    .from('user_profiles')
    .select('id, display_name, about, fav_genres, favorite_artists, links, status, profile_note_to_listeners, contact_visibility')
    .eq('id', userId)
    .eq('status', 'active')
    .maybeSingle();

  if (error) {
    console.error('Error fetching user profile (will try sanitized fallback):', error.message);
    // Attempt sanitized fallback for anonymous / restricted access
    try {
      console.log('Trying sanitized fallback for userId:', userId);
      const { data: sanitized, error: sanitizedErr } = await (supabase as any).rpc('fetch_public_profiles', { p_ids: [userId] });
      console.log('Sanitized RPC response:', { sanitized, sanitizedErr });
      
      if (sanitizedErr) {
        console.error('Sanitized fallback failed:', sanitizedErr);
        return null;
      }
      
      if (!Array.isArray(sanitized) || !sanitized.length) {
        console.log('No sanitized data found for userId:', userId);
        return null;
      }
      
      const s = sanitized[0];
      console.log('Sanitized profile data:', s);
      
      return {
        id: s.id,
        display_name: s.display_name,
        about: s.about_snippet,
        fav_genres: s.genres,
        favorite_artists: s.favorite_artists_sample,
        links: [],
        status: 'active',
        profile_note_to_listeners: '',
        contact_visibility: 'private',
        dm_enabled: false,
        comments_enabled: false,
        created_at: '',
        updated_at: ''
      } as unknown as UserProfile;
    } catch (e) {
      console.warn('Sanitized user profile fallback failed:', (e as any).message);
      return null;
    }
  }

  if (!data) return null;

  // Check if we need to filter sensitive fields based on contact_visibility
  const { data: { session } } = await supabase.auth.getSession();
  const isOwnProfile = session?.user?.id === userId;
  
  // Transform Json type to ProfileLink[]
  const profile = {
    ...data,
    links: Array.isArray(data.links) ? data.links as any[] : []
  } as unknown as UserProfile;

  // If it's the user's own profile or public visibility, return full data
  if (isOwnProfile || data.contact_visibility === 'public') {
    return profile;
  }

  // For 'private' visibility, filter out sensitive fields
  if (data.contact_visibility === 'private') {
    return {
      id: profile.id,
      display_name: profile.display_name,
      status: profile.status,
      contact_visibility: profile.contact_visibility,
      dm_enabled: false,
      comments_enabled: false,
      created_at: profile.created_at,
      updated_at: profile.updated_at
    } as UserProfile;
  }

  // For 'after_meet', check if user has met this profile owner
  if (data.contact_visibility === 'after_meet') {
    try {
      const { data: hasMet } = await supabase.rpc('has_met_user', { 
        profile_user_id: userId 
      });
      
      if (hasMet) {
        return profile; // Full access after meeting
      } else {
        // Limited access before meeting
        return {
          id: profile.id,
          display_name: profile.display_name,
          status: profile.status,
          contact_visibility: profile.contact_visibility,
          dm_enabled: false,
          comments_enabled: false,
          created_at: profile.created_at,
          updated_at: profile.updated_at
        } as UserProfile;
      }
    } catch (e) {
      console.warn('Failed to check meet status:', e);
      // Default to limited access on error
      return {
        id: profile.id,
        display_name: profile.display_name,
        status: profile.status,
        contact_visibility: profile.contact_visibility,
        dm_enabled: false,
        comments_enabled: false,
        created_at: profile.created_at,
        updated_at: profile.updated_at
      } as UserProfile;
    }
  }

  return profile;
}

export async function listRecordingsByUser(userId: string): Promise<Recording[]> {
  // For user's own recordings, include URLs; for others, exclude them
  const { data: { session } } = await supabase.auth.getSession();
  const isOwnProfile = session?.user?.id === userId;
  
  const selectFields = isOwnProfile 
    ? '*' 
    : 'id, user_id, title, filesize_bytes, duration_sec, format_original, format_stream, loudness_lufs, mood_tags, voice_type, language, is_signature, state, comments_enabled, plays_count, reports_count, moderation_status, created_at, updated_at';
  
  const { data: recordings, error } = await supabase
    .from('recordings')
    .select(selectFields as any)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching user recordings:', error);
    return [];
  }

  // Fetch user profile
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('id, display_name, about, fav_genres, favorite_artists, links, status')
    .eq('id', userId)
    .maybeSingle();
  if (profileError) {
    console.warn('Restricted from fetching profile for recordings list:', profileError.message);
  }

  const userProfile = profile ? {
    ...profile,
    links: Array.isArray(profile.links) ? profile.links as any[] : []
  } as UserProfile : undefined;

  // Combine recordings with profile
  return (recordings || []).map((r: any) => ({
    ...r,
    user_profile: userProfile
  })) as Recording[];
}

export async function incrementPlay(recordingId: string): Promise<void> {
  const { error } = await supabase.rpc('increment_recording_plays', {
    recording_uuid: recordingId
  });

  if (error) {
    console.error('Error incrementing play count:', error);
  }
}

export async function updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile | null> {
  // NOTE: The database currently does NOT yet have columns `genres_singing` / `genres_listening`.
  // Until a migration adds them, we merge both into `fav_genres` for persistence and strip the unsupported keys.
  const ALLOWED_COLUMNS = new Set([
    'id', 'display_name', 'about', 'fav_genres', 'favorite_artists', 'groups', 'links',
    'contact_visibility', 'dm_enabled', 'comments_enabled', 'profile_note_to_listeners'
  ]);

  const mergedFavGenres = (() => {
    const base = Array.isArray(updates.fav_genres) ? updates.fav_genres : [];
    const sing = (updates as any).genres_singing as string[] | undefined;
    const listen = (updates as any).genres_listening as string[] | undefined;
    if (sing || listen) {
      return Array.from(new Set([ ...base, ...(sing||[]), ...(listen||[]) ]));
    }
    return base.length ? base : undefined;
  })();

  const dbUpdates: Record<string, any> = { id: userId };
  for (const [k, v] of Object.entries(updates)) {
    if (v === undefined || v === null) continue;
    if (!ALLOWED_COLUMNS.has(k)) continue; // skip unsupported
    dbUpdates[k] = v;
  }
  if (mergedFavGenres) dbUpdates.fav_genres = mergedFavGenres;
  if (Array.isArray(updates.links)) dbUpdates.links = updates.links as any;
  if (!dbUpdates.display_name) dbUpdates.display_name = (updates as any).display_name || '';

  console.debug('[updateUserProfile] Sanitized upsert payload', dbUpdates);

  const { data, error } = await supabase
    .from('user_profiles')
    .upsert([dbUpdates] as any, { onConflict: 'id' })
    .select()
    .single();

  if (error) {
    console.error('Error updating profile (upsert):', error, dbUpdates);
    throw new Error(`Failed to update profile: ${error.message}`);
  }

  if (!data) return null;

  return {
    ...data,
    links: Array.isArray(data.links) ? data.links as any[] : []
  } as unknown as UserProfile;
}

export async function getRecordingSignedUrls(recordingId: string, expirySeconds: number = 3600): Promise<{
  file_original_url?: string;
  file_stream_url?: string;
  waveform_json_url?: string;
} | null> {
  try {
    const { data, error } = await supabase.rpc('get_recording_signed_urls', {
      p_recording_id: recordingId,
      p_expiry_seconds: expirySeconds
    });

    if (error) {
      console.error('Error getting signed URLs:', error);
      return null;
    }

    return data as any;
  } catch (e) {
    console.error('Exception getting signed URLs:', e);
    return null;
  }
}

export async function reportRecording(recordingId: string, reason: string, reporterUserId?: string): Promise<boolean> {
  const { error } = await supabase
    .from('recording_reports')
    .insert({
      recording_id: recordingId,
      reporter_user_id: reporterUserId,
      reason
    });

  if (error) {
    console.error('Error reporting recording:', error);
    return false;
  }

  return true;
}

export async function updateRecordingState(recordingId: string, state: 'public' | 'private'): Promise<boolean> {
  const { error } = await supabase
    .from('recordings')
    .update({ state })
    .eq('id', recordingId);

  if (error) {
    console.error('Error updating recording state:', error);
    return false;
  }

  return true;
}
