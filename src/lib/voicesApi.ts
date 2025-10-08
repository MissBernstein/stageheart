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
  
  let query = supabase
    .from('recordings')
    .select('*')
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
  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('*')
    .in('id', userIds);

  const profileMap = new Map((profiles || []).map(p => [p.id, p]));

  // Combine recordings with their profiles
  let result = recordings.map(r => ({
    ...r,
    user_profile: profileMap.get(r.user_id) ? {
      ...profileMap.get(r.user_id)!,
      links: Array.isArray(profileMap.get(r.user_id)?.links) 
        ? profileMap.get(r.user_id)!.links as any[]
        : []
    } as UserProfile : undefined
  })) as Recording[];

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
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .eq('status', 'active')
    .maybeSingle();

  if (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }

  if (!data) return null;

  // Transform Json type to ProfileLink[]
  return {
    ...data,
    links: Array.isArray(data.links) ? data.links as any[] : []
  } as unknown as UserProfile;
}

export async function listRecordingsByUser(userId: string): Promise<Recording[]> {
  const { data: recordings, error } = await supabase
    .from('recordings')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching user recordings:', error);
    return [];
  }

  // Fetch user profile
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  const userProfile = profile ? {
    ...profile,
    links: Array.isArray(profile.links) ? profile.links as any[] : []
  } as UserProfile : undefined;

  // Combine recordings with profile
  return (recordings || []).map(r => ({
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
  // Prepare updates (filter out undefined to avoid overwriting with null)
  const dbUpdates: Record<string, any> = {};
  for (const [k, v] of Object.entries(updates)) {
    if (v !== undefined) dbUpdates[k] = v;
  }
  if (Array.isArray(updates.links)) {
    dbUpdates.links = updates.links as any; // JSON column
  }

  // Always ensure id present for upsert
  dbUpdates.id = userId;
  if (!dbUpdates.display_name) {
    // Preserve existing display name if present in DB (will fetch after), else empty string
    dbUpdates.display_name = (updates as any).display_name || '';
  }

  console.debug('[updateUserProfile] Upserting profile', dbUpdates);

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
