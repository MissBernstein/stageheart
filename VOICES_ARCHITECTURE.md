# Voices & Profiles UI Architecture

## 🏗️ Architecture Overview

This is a comprehensive UI implementation for Stageheart's new Voices & Profiles feature - a privacy-first platform for sharing authentic voice recordings and connecting with their creators.

## 📁 File Structure

```
src/
├── VoicesApp.tsx                 # Main app component with providers
├── router.tsx                    # React Router configuration
├── styles/
│   ├── theme.ts                  # Design tokens and theme
│   └── globals.css               # Global styles and animations
├── components/
│   ├── layout/
│   │   ├── Layout.tsx            # Main app layout
│   │   ├── Navigation.tsx        # Primary navigation
│   │   └── SkipToContent.tsx     # Accessibility skip link
│   ├── audio/
│   │   ├── AudioPlayer.tsx       # Global bottom audio player
│   │   └── WavePlayer.tsx        # Inline waveform player
│   ├── ui/
│   │   └── Toast.tsx             # Toast notification system
│   └── auth/
│       └── AuthGuard.tsx         # Route protection
├── pages/
│   ├── VoicesPage.tsx            # Main discovery page
│   ├── VoiceProfilePage.tsx      # Individual recording view
│   ├── UserProfilePage.tsx       # User profile display
│   ├── SettingsPage.tsx          # User settings
│   ├── InboxPage.tsx             # Messages and notifications
│   └── NotFoundPage.tsx          # 404 error page
├── hooks/
│   ├── useAuth.tsx               # Authentication state
│   └── usePlayer.tsx             # Global audio player state
└── types/
    └── voices.ts                 # TypeScript definitions
```

## 🎨 Design System

### Theme Structure
- **Colors**: Primary/secondary, semantic colors (success, warning, error, info)
- **Typography**: 6 size scales, 4 weight scales
- **Spacing**: 5-step scale (xs to xl)
- **Radius**: 3 border radius options
- **Shadows**: 3 elevation levels

### Component Patterns
- **Accessibility**: Skip links, ARIA labels, keyboard navigation
- **Responsive**: Mobile-first approach with breakpoints
- **Dark Mode Ready**: Theme tokens support light/dark switching
- **Animations**: Smooth transitions with reduced motion support

## 🎯 Key Features

### Privacy-First Design
- **Meet the Voice**: Users must listen to recordings before contacting creators
- **Progressive Disclosure**: Contact info revealed based on interaction thresholds
- **Granular Controls**: Per-recording privacy settings

### Audio Experience
- **Global Player**: Persistent bottom audio bar with queue management
- **Waveform Visualization**: Visual audio representation for engagement
- **Smart Playback**: Auto-queue related recordings

### Discovery & Connection
- **Mood-Based Search**: Find voices by emotional tone and tags
- **Voice Personas**: Creators define their voice character/style
- **Contextual Messaging**: Connect after meaningful listening experiences

## 🔧 State Management

### Authentication (`useAuth`)
- User session management via Supabase
- Route protection and redirects
- Profile data caching

### Audio Player (`usePlayer`)
- Global playback state
- Queue management
- Progress tracking and seeking
- Volume control

### Notifications (`useToast`)
- Success/error messaging
- Auto-dismiss timers
- Accessibility announcements

## 🛣️ Routing Structure

```
/voices                 # Main discovery page
/voice/:recordingId     # Individual recording view
/p/:userId             # User profile (public)
/p/me                  # Current user's profile
/settings              # User preferences (protected)
/inbox                 # Messages/notifications (protected)
```

## 🎪 Current Implementation Status

### ✅ Completed
- [x] Complete component architecture
- [x] Design system and theming
- [x] Authentication flow setup
- [x] Global audio player state
- [x] Toast notification system
- [x] Routing and navigation
- [x] Accessibility foundations
- [x] TypeScript definitions
- [x] Responsive design patterns

### 🔄 In Progress
- [ ] VoicesPage discovery functionality
- [ ] Recording detail views
- [ ] User profile displays
- [ ] Settings management
- [ ] Message/inbox system

### 📋 Next Steps
1. **API Integration**: Connect components to Supabase backend
2. **Audio Implementation**: Integrate actual audio file handling
3. **Real-time Features**: WebSocket connections for messaging
4. **Upload Flow**: Recording creation and management
5. **Advanced Filtering**: Search and discovery enhancements

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Type checking
npm run type-check

# Build for production
npm run build
```

## 📱 Component Usage Examples

### Basic Audio Player
```tsx
import { usePlayer } from './hooks/usePlayer';

const { loadRecording, play, isPlaying } = usePlayer();

// Load and play a recording
loadRecording(recording);
play();
```

### Toast Notifications
```tsx
import { useToast } from './components/ui/Toast';

const { addToast } = useToast();

addToast({
  type: 'success',
  title: 'Recording uploaded!',
  description: 'Your voice is now live.'
});
```

### Theme Usage
```tsx
import { theme } from './styles/theme';

const styles = {
  color: theme.colors.primary,
  fontSize: theme.typography.sizes.lg,
  padding: theme.spacing.md
};
```

## 🎭 Philosophy

This UI architecture embodies Stageheart's core values:
- **Authentic Connection**: Design facilitates genuine human interaction
- **Privacy Respect**: User control over personal information
- **Accessible Design**: Inclusive experience for all users
- **Audio-First**: Voice is the primary medium of expression
- **Community Safety**: Thoughtful moderation and reporting tools

The implementation balances modern web technologies with timeless UX principles to create a platform where voices can be shared safely and meaningfully.