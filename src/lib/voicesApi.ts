// @keep - Mockable voices/profile data access layer (no Supabase required yet)
// KEEP: integration-pending - When Supabase is available, swap internals while keeping function signatures stable.
import { Recording, UserProfile } from '@/types/voices';

// In-memory mock DB (can be mutated for optimistic UI demos)
const mockProfiles: Record<string, UserProfile> = {};
const mockRecordings: Recording[] = [];

function seed() {
  if (Object.keys(mockProfiles).length > 0) return; // already seeded
  const now = new Date().toISOString();
  const profile: UserProfile = {
    id: 'user1',
    display_name: 'Sarah M.',
    about: 'Voice artist exploring texture + emotional storytelling.',
    fav_genres: ['indie','folk'],
    favorite_artists: ['Joni Mitchell'],
    groups: ['Open Mic Circle'],
    links: [{ type:'website', url:'https://example.com', visibility:'public' }],
    contact_visibility: 'after_meet',
    dm_enabled: true,
    comments_enabled: true,
    profile_note_to_listeners: 'Thanks for listening – reach out after you complete a full listen! 💛',
    status: 'active',
    created_at: now,
    updated_at: now
  };
  mockProfiles[profile.id] = profile;
  const recs: Recording[] = [
    { id:'r1', user_id: profile.id, title:'Morning Reflection', duration_sec:182, mood_tags:['calm','contemplative'], voice_type:'soft', language:'en', is_signature:true, state:'public', comments_enabled:true, plays_count:42, reports_count:0, moderation_status:'clean', created_at:now, updated_at:now, user_profile: profile },
    { id:'r2', user_id: profile.id, title:'Evening Whisper', duration_sec:143, mood_tags:['warm','intimate'], voice_type:'medium', language:'en', is_signature:false, state:'public', comments_enabled:true, plays_count:12, reports_count:0, moderation_status:'clean', created_at:now, updated_at:now, user_profile: profile },
    { id:'r3', user_id: profile.id, title:'Golden Hour Harmony', duration_sec:201, mood_tags:['hopeful','bright'], voice_type:'medium', language:'en', is_signature:false, state:'public', comments_enabled:true, plays_count:5, reports_count:0, moderation_status:'clean', created_at:now, updated_at:now, user_profile: profile }
  ];
  mockRecordings.push(...recs);
}
seed();

export interface ListVoicesParams {
  search?: string;
  mood?: string;
  limit?: number;
}

export async function listVoices(params: ListVoicesParams = {}): Promise<Recording[]> {
  await delay(120);
  const { search, mood, limit = 50 } = params;
  let recs = mockRecordings.slice();
  if (search) {
    const q = search.toLowerCase();
    recs = recs.filter(r => r.title.toLowerCase().includes(q) || r.user_profile?.display_name?.toLowerCase().includes(q));
  }
  if (mood) {
    recs = recs.filter(r => r.mood_tags?.includes(mood));
  }
  return recs.slice(0, limit);
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  await delay(100);
  if (userId === 'me') return mockProfiles['user1']; // alias for demo
  return mockProfiles[userId] || null;
}

export async function listRecordingsByUser(userId: string): Promise<Recording[]> {
  await delay(140);
  return mockRecordings.filter(r => r.user_id === (userId === 'me' ? 'user1' : userId));
}

export async function incrementPlay(recordingId: string) {
  const rec = mockRecordings.find(r => r.id === recordingId);
  if (rec) rec.plays_count += 1;
}

// Utility delay
function delay(ms: number) { return new Promise(res => setTimeout(res, ms)); }

// For tests
export function __resetMocks() {
  Object.keys(mockProfiles).forEach(k => delete mockProfiles[k]);
  mockRecordings.splice(0, mockRecordings.length);
  seed();
}
