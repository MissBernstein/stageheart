# Connect Frontend Mock APIs to Existing Supabase Backend

## Context
I have a **Stageheart** app where:
- ✅ **Backend exists**: Supabase database schema, RLS policies, edge functions all implemented
- ✅ **Frontend UI complete**: React components working perfectly with mock data
- ❌ **Connection missing**: Mock APIs need to be replaced with real Supabase queries

I need to **replace mock implementations** with real database calls for:

1. **Voice Profiles** - Connect to existing `user_profiles` and `recordings` tables
2. **Discover Voices** - Query real recordings with joins to user profiles  
3. **Settings** - Persist user preferences to database instead of localStorage
4. **Messages** - Use real `messages` table instead of mock data

## Current State

### ✅ Backend Already Exists
The Supabase database is **already implemented** with these tables:
- `user_profiles` - User profile data with display_name, about, fav_genres, links, etc.
- `recordings` - Voice recordings with metadata, file URLs, mood_tags, etc.  
- `messages` - Direct messages between users
- `recording_meets` - Track when users "meet" through voice recordings
- `recording_comments` - Comments on recordings
- `recording_reports` - Content moderation reports

### ❌ Frontend Using Mock APIs
The frontend has these files that need **mock-to-real conversion**:

### Frontend Mock APIs (Need Real Implementation)
These files contain mock data that need to be replaced with Supabase calls:

**1. Voice Profiles & Discovery (`src/lib/voicesApi.ts`)**
```typescript
// Functions that need real Supabase implementation:
- listVoices(params: {search?, mood?, limit?}) -> Recording[]
- getProfile(userId: string) -> UserProfile  
- updateProfile(userId: string, data: Partial<UserProfile>) -> UserProfile
- incrementPlay(recordingId: string) -> void
- reportRecording(recordingId: string, reason: string) -> void
```

**2. Messages (`src/lib/messagesApi.ts`)**
```typescript
// Functions that need real Supabase implementation:
- listMessages() -> MessageRecord[]
- markMessageRead(id: string) -> {success: boolean}
- markMessagesRead(ids: string[]) -> {success: boolean} 
- markAllMessagesRead() -> {success: boolean}
- sendReply(parentId: string, body: string) -> {success: boolean, id: string}
```

**3. Settings (stored in localStorage, should sync to user_profiles)**
```typescript
// Settings that should sync with user_profiles table:
- displayName -> display_name
- bio -> about  
- dmEnabled -> dm_enabled
- personaTags -> could be stored in a new column or JSON field
- contact preferences -> contact_visibility
```

## Specific Integration Tasks

### Task 1: Voice Profiles Integration
**Replace** `src/lib/voicesApi.ts` functions with real Supabase calls:

```typescript
// IMPLEMENT THESE WITH SUPABASE:

export async function listVoices(params: ListVoicesParams = {}): Promise<Recording[]> {
  // Query recordings table with joins to user_profiles
  // Filter by: search (title, user display_name), mood_tags, state='public'
  // Include user_profile data in response
  // Order by created_at desc
  // Limit results
}

export async function getProfile(userId: string): Promise<UserProfile | null> {
  // Query user_profiles table by id
  // Include associated recordings where state='public'
}

export async function updateProfile(userId: string, data: Partial<UserProfile>): Promise<UserProfile> {
  // Update user_profiles table
  // Return updated profile
}

export async function incrementPlay(recordingId: string): Promise<void> {
  // Use existing increment_recording_plays function
  // OR update recordings.plays_count += 1
}
```

### Task 2: Messages Integration  
**Replace** `src/lib/messagesApi.ts` functions with real Supabase calls:

```typescript
// IMPLEMENT THESE WITH SUPABASE:

export async function listMessages(): Promise<MessageRecord[]> {
  // Query messages table where to_user_id = current_user_id
  // Join with user_profiles to get sender display_name
  // Order by created_at desc
  // Map to MessageRecord interface
}

export async function markMessageRead(id: string) {
  // Update messages set is_read = true where id = $1
}

export async function sendMessage(toUserId: string, body: string, type: MessageType = 'dm') {
  // Insert into messages table
  // Set from_user_id = current_user_id, to_user_id, body, type
}
```

### Task 3: Settings Profile Sync
**Extend** settings functionality to sync with `user_profiles` table:

```typescript
// IN SettingsModal.tsx - replace localStorage with Supabase:

const saveSettings = async (settings: PersistedSettings) => {
  // Update user_profiles table:
  // display_name = settings.displayName
  // about = settings.bio  
  // dm_enabled = settings.dmEnabled
  // Add persona_tags column to store settings.personaTags as JSON
  
  // Keep some settings in localStorage (playback preferences)
  // But sync profile data to database
}
```

### Task 4: Authentication Integration
**Connect** with existing auth system:

```typescript
// Ensure auth context provides current user ID for all API calls
// Check that RLS (Row Level Security) is enabled on tables
// User should only see their own messages, can update own profile, etc.
```

## Key Requirements

### Data Mapping
- Frontend `Recording` interface → `recordings` table + joined `user_profiles`
- Frontend `UserProfile` interface → `user_profiles` table  
- Frontend `MessageRecord` interface → `messages` table + joined sender profile

### Security (RLS Policies Needed)
- Users can only read their own messages
- Users can only update their own profile
- Public recordings visible to all
- Private recordings only to owner

### Performance
- Include `user_profile` data when fetching recordings (avoid N+1 queries)
- Efficient filtering for voice discovery (indexes on mood_tags, created_at)
- Pagination for messages and recordings lists

## Expected Outcome
After implementation:
1. **Voice Discovery** will show real user recordings from database
2. **User Profiles** will display and update real profile data  
3. **Messages** will send/receive real messages between users
4. **Settings** will persist profile changes to database
5. **Authentication** will work with existing Supabase auth

## Files to Modify
- `src/lib/voicesApi.ts` - Replace all functions with Supabase calls
- `src/lib/messagesApi.ts` - Replace all functions with Supabase calls  
- `src/components/voices/SettingsModal.tsx` - Add profile sync on save
- Ensure `src/integrations/supabase/client.ts` is properly configured

The frontend UI is complete and working with mock data. Just need the backend API calls implemented!