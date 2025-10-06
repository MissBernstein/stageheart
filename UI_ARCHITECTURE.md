# Stageheart UI Architecture

## Project Structure

```
src/
├── components/           # Reusable UI components
│   ├── audio/           # Audio-specific components
│   ├── forms/           # Form components
│   ├── layout/          # Layout components
│   └── ui/             # Base UI components
├── pages/              # Route-level pages
├── hooks/              # Custom React hooks
├── stores/             # Global state management
├── utils/              # Utility functions
├── types/              # TypeScript definitions
└── styles/             # Theme and global styles
```

## Component Tree Overview

```
App
├── Layout
│   ├── Navigation
│   ├── SkipToContent
│   └── ToastContainer
└── Routes
    ├── Home
    │   ├── WarmupCard
    │   ├── RecentRecordings
    │   └── TipsPanel
    ├── Library
    │   ├── RecordingList
    │   ├── RecordingRowActions
    │   └── PublicQuotaIndicator
    ├── Upload
    │   ├── FileDrop
    │   ├── MetaForm
    │   ├── RightsNotice
    │   └── SubmitBar
    ├── Voices
    │   ├── VoiceCard
    │   ├── FilterBar
    │   └── Pagination
    ├── VoicePlayer
    │   ├── WavePlayer
    │   ├── CTAReveal
    │   └── ReportButton
    ├── Profile
    │   ├── SignatureClip
    │   ├── About
    │   ├── Tags
    │   ├── Groups
    │   ├── Contact
    │   ├── NotesToListeners
    │   ├── PublicRecordingsList
    │   └── Actions (SendNote, LeaveComment)
    ├── Settings
    │   ├── ProfileForm
    │   ├── TagEditors
    │   ├── LinksEditor
    │   ├── PrivacyToggles
    │   └── DangerZone
    └── Inbox
        ├── ThreadList
        ├── MessageView
        └── Composer
```

## Theme System

```typescript
interface Theme {
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: {
      primary: string;
      secondary: string;
      muted: string;
    };
    border: string;
    success: string;
    warning: string;
    error: string;
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  typography: {
    sizes: {
      xs: string;
      sm: string;
      base: string;
      lg: string;
      xl: string;
      '2xl': string;
    };
    weights: {
      normal: number;
      medium: number;
      semibold: number;
      bold: number;
    };
  };
  radius: {
    sm: string;
    md: string;
    lg: string;
  };
  shadows: {
    sm: string;
    md: string;
    lg: string;
  };
}
```