# Profiles & Voices API Documentation

## Overview
Complete backend implementation for Stageheart's Profiles & Voices feature. Privacy-first design with anonymous discovery and "Meet the Voice" mechanic.

## Database Schema

### 1. User Profiles (`user_profiles`)
Enhanced user profiles with granular privacy controls.

```typescript
interface UserProfile {
  id: UUID;
  display_name: string;
  about?: string;
  fav_genres?: string[];
  favorite_artists?: string[];
  groups?: string[];
  links?: Array<{
    type: 'website' | 'instagram' | 'tiktok' | 'email' | 'other';
    url: string;
    visibility: 'public' | 'after_meet' | 'private';
  }>;
  contact_visibility: 'public' | 'after_meet' | 'private';
  dm_enabled: boolean;
  comments_enabled: boolean;
  profile_note_to_listeners?: string;
  status: 'active' | 'suspended';
  created_at: timestamp;
  updated_at: timestamp;
}
```

**RLS Policies:**
- Users can CRUD their own profiles
- Public can view active profiles (field visibility enforced in app layer)

**API Examples:**
```typescript
// Get current user's profile
const { data: profile } = await supabase
  .from('user_profiles')
  .select('*')
  .eq('id', userId)
  .single();

// Update profile
await supabase
  .from('user_profiles')
  .update({
    about: 'Singer-songwriter',
    fav_genres: ['Jazz', 'Soul'],
    dm_enabled: true
  })
  .eq('id', userId);

// Get public profile (respect visibility in app)
const { data: publicProfile } = await supabase
  .from('user_profiles')
  .select('id, display_name, about')
  .eq('id', targetUserId)
  .single();
```

---

### 2. Recordings (`recordings`)
Voice recordings with rich metadata and privacy controls.

```typescript
interface Recording {
  id: UUID;
  user_id: UUID;
  title: string;
  file_original_url?: string;
  file_stream_url?: string;
  filesize_bytes?: number; // Max 50MB
  duration_sec?: number;
  format_original?: 'wav' | 'm4a' | 'mp3' | 'opus';
  format_stream?: 'mp3' | 'opus';
  loudness_lufs?: number;
  waveform_json_url?: string;
  mood_tags?: string[];
  voice_type?: string;
  language?: string;
  is_signature: boolean; // Only one per user
  state: 'private' | 'unlisted' | 'public';
  comments_enabled: boolean;
  plays_count: number;
  reports_count: number;
  moderation_status: 'clean' | 'pending' | 'flagged' | 'blocked';
  created_at: timestamp;
  updated_at: timestamp;
}
```

**Constraints:**
- Max 3 public recordings per user (enforced by trigger)
- Only one signature recording per user
- File size ≤ 50MB (CHECK constraint)

**RLS Policies:**
- Users can CRUD their own recordings
- Public can view public + clean recordings

**API Examples:**
```typescript
// Upload recording (use Storage first, then create record)
const file = event.target.files[0];
const filePath = `${userId}/${Date.now()}-${file.name}`;

// Upload to storage
const { data: uploadData, error: uploadError } = await supabase.storage
  .from('recordings')
  .upload(filePath, file);

// Create recording record
const { data: recording } = await supabase
  .from('recordings')
  .insert({
    user_id: userId,
    title: 'My Performance',
    file_original_url: filePath,
    filesize_bytes: file.size,
    format_original: 'mp3',
    state: 'private',
    mood_tags: ['Energetic', 'Hopeful']
  })
  .select()
  .single();

// Get user's recordings
const { data: myRecordings } = await supabase
  .from('recordings')
  .select('*')
  .eq('user_id', userId)
  .order('created_at', { ascending: false });

// Get public recordings (discovery feed)
const { data: publicRecordings } = await supabase
  .from('recordings')
  .select(`
    id,
    title,
    mood_tags,
    voice_type,
    plays_count,
    created_at
  `)
  .eq('state', 'public')
  .eq('moderation_status', 'clean')
  .order('created_at', { ascending: false })
  .limit(50);

// Make recording public (respects 3 recording limit)
const { error } = await supabase
  .from('recordings')
  .update({ state: 'public' })
  .eq('id', recordingId);
// Will throw error if user already has 3 public recordings

// Increment play count (use function for accuracy)
await supabase.rpc('increment_recording_plays', {
  recording_uuid: recordingId
});
```

---

### 3. Recording Meets (`recording_meets`)
Tracks when listeners "meet the voice" to unlock after-meet profile fields.

```typescript
interface RecordingMeet {
  id: UUID;
  recording_id: UUID;
  listener_user_id: UUID;
  met_at: timestamp;
}
```

**RLS Policies:**
- Users can view their own meets
- Users can create meet records
- Recording owners can see who met their voice

**API Examples:**
```typescript
// User clicks "Meet the Voice"
const { data: meet } = await supabase
  .from('recording_meets')
  .insert({
    recording_id: recordingId,
    listener_user_id: userId
  })
  .select()
  .single();

// Check if user has met this artist
const { data: hasMet } = await supabase
  .from('recording_meets')
  .select('id')
  .eq('recording_id', recordingId)
  .eq('listener_user_id', userId)
  .maybeSingle();

// Get all users who met my voice
const { data: meets } = await supabase
  .from('recording_meets')
  .select(`
    met_at,
    listener:user_profiles(display_name)
  `)
  .in('recording_id', myRecordingIds);
```

---

### 4. Comments (`comments`)
Moderated comments on recordings.

```typescript
interface Comment {
  id: UUID;
  recording_id: UUID;
  author_user_id: UUID;
  body: string;
  state: 'pending' | 'published' | 'rejected';
  created_at: timestamp;
}
```

**RLS Policies:**
- Users can view their own comments
- Users can comment on public recordings with comments enabled
- Recording owners can view/moderate all comments
- Public can view published comments

**API Examples:**
```typescript
// Submit comment (defaults to pending)
const { data: comment } = await supabase
  .from('comments')
  .insert({
    recording_id: recordingId,
    author_user_id: userId,
    body: 'Beautiful performance!'
  })
  .select()
  .single();

// Get published comments for a recording
const { data: comments } = await supabase
  .from('comments')
  .select(`
    id,
    body,
    created_at,
    author:user_profiles(display_name)
  `)
  .eq('recording_id', recordingId)
  .eq('state', 'published')
  .order('created_at', { ascending: false });

// Approve comment (recording owner only)
await supabase
  .from('comments')
  .update({ state: 'published' })
  .eq('id', commentId);
```

---

### 5. Messages (`messages`)
Direct messaging system.

```typescript
interface Message {
  id: UUID;
  to_user_id: UUID;
  from_user_id: UUID;
  body: string;
  is_read: boolean;
  created_at: timestamp;
}
```

**RLS Policies:**
- Users can view sent/received messages
- Users can only send to users with DMs enabled
- Users can mark received messages as read

**API Examples:**
```typescript
// Send message (only if recipient has dm_enabled: true)
const { data: message } = await supabase
  .from('messages')
  .insert({
    to_user_id: recipientId,
    from_user_id: userId,
    body: 'Hi! Loved your recording.'
  })
  .select()
  .single();

// Get inbox
const { data: inbox } = await supabase
  .from('messages')
  .select(`
    id,
    body,
    is_read,
    created_at,
    from:user_profiles!from_user_id(display_name)
  `)
  .eq('to_user_id', userId)
  .order('created_at', { ascending: false });

// Mark as read
await supabase
  .from('messages')
  .update({ is_read: true })
  .eq('id', messageId)
  .eq('to_user_id', userId);
```

---

### 6. Recording Reports (`recording_reports`)
Content moderation system.

```typescript
interface RecordingReport {
  id: UUID;
  recording_id: UUID;
  reporter_user_id?: UUID;
  reason: string;
  created_at: timestamp;
}
```

**RLS Policies:**
- Anyone can submit reports
- Users can view their own reports

**API Examples:**
```typescript
// Report recording
await supabase
  .from('recording_reports')
  .insert({
    recording_id: recordingId,
    reporter_user_id: userId, // Optional for anonymous reports
    reason: 'Inappropriate content'
  });
```

---

## Storage: Audio Files

**Bucket:** `recordings` (private)

**Structure:** `{userId}/{timestamp}-{filename}`

**RLS Policies:**
- Users can upload to their own folder
- Users can view/delete their own files
- Public can view files for public, clean recordings

**API Examples:**
```typescript
// Upload audio file
const { data, error } = await supabase.storage
  .from('recordings')
  .upload(`${userId}/1234567890-song.mp3`, file, {
    contentType: 'audio/mpeg'
  });

// Get signed URL for private file
const { data: signedUrl } = await supabase.storage
  .from('recordings')
  .createSignedUrl(filePath, 3600); // 1 hour

// Get public URL for public recording
const { data: publicUrl } = supabase.storage
  .from('recordings')
  .getPublicUrl(filePath);

// Delete file
await supabase.storage
  .from('recordings')
  .remove([filePath]);
```

---

## Key Features

### 1. Privacy Controls
- All profile fields support visibility levels: `public`, `after_meet`, `private`
- App layer must enforce field filtering based on meet status
- DMs and comments opt-in by default

### 2. Discovery Flow
```typescript
// 1. Get anonymous recordings
const { data: recordings } = await supabase
  .from('recordings')
  .select('id, title, mood_tags, voice_type')
  .eq('state', 'public')
  .eq('moderation_status', 'clean');

// 2. User clicks "Meet the Voice"
await supabase.from('recording_meets').insert({
  recording_id,
  listener_user_id: currentUserId
});

// 3. Unlock after-meet profile fields
const { data: profile } = await supabase
  .from('user_profiles')
  .select('*')
  .eq('id', artistId)
  .single();

// Filter fields by visibility in app layer
const visibleProfile = filterProfileFields(profile, hasMet);
```

### 3. Validation Rules
✅ Max 3 public recordings per user (database trigger)
✅ Only 1 signature recording per user (unique index)
✅ File size ≤ 50MB (CHECK constraint)
✅ Comments default to pending (moderation)
✅ DMs require recipient opt-in (RLS policy)

---

## Security Considerations

1. **File Upload Validation**
   - Check file size client-side before upload
   - Validate audio formats
   - Scan for malicious content

2. **Content Moderation**
   - All comments start as `pending`
   - Recording owners approve/reject
   - Report system for flagging content
   - Admin tools needed for bulk moderation

3. **Privacy Enforcement**
   - Field visibility must be enforced in app layer
   - Check `recording_meets` before showing after-meet fields
   - Respect user's `dm_enabled` and `comments_enabled` flags

4. **Rate Limiting**
   - Implement rate limits on uploads, comments, messages
   - Consider Supabase Edge Functions with rate limiting

---

## Implementation Checklist

- [x] Database schema created
- [x] RLS policies configured
- [x] Storage bucket created
- [x] Validation triggers added
- [ ] Client-side components for:
  - [ ] Profile editor
  - [ ] Recording upload
  - [ ] Discovery feed
  - [ ] "Meet the Voice" interaction
  - [ ] Comment moderation
  - [ ] DM interface
- [ ] Admin dashboard for:
  - [ ] Content moderation
  - [ ] User management
  - [ ] Reports review

---

## Next Steps

1. **Create Profile Management UI**
   - Profile editor with visibility toggles
   - Link management interface

2. **Build Recording Upload Flow**
   - File picker with validation
   - Metadata form (title, mood tags, etc.)
   - Privacy state selector

3. **Implement Discovery Feed**
   - Grid of anonymous recordings
   - Filter by mood/voice type
   - "Meet the Voice" button

4. **Add Moderation Tools**
   - Comment approval interface
   - Report review dashboard
   - Bulk actions for admins

5. **Consider Additional Features**
   - Audio waveform generation
   - Playback analytics
   - Follow/notification system
   - Playlist/collection feature
