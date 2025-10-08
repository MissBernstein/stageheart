# Stageheart Style Guide

## Color Palette

### Primary Colors
- **Dark Purple**: `#160F29`
- **Teal**: `#246A73`
- **Blue-Green**: `#368F8B`
- **Light Beige**: `#F3DFC1`
- **Soft Tan**: `#DDBEA8`
- **White**: `#FFFFFF`
- **Black**: `#000000`

## Typography

### Headings

#### H1
- **Size**: 36 px
- **Usage**: Only on Home page and `/auth` top-level screen titles
- **Notes**: Largest headline tier

#### H2
- **Size**: 24 px
- **Usage**: Main section headers
  - Examples: Discover Voices, Song Library, Performance Prep, Voice Profile, Song titles on Feeling Cards, Settings, Messages, Favorites, Feeling Journey

#### H3
- **Size**: 18 px
- **Usage**: Sub-section headers within a page or modal

### Font Family
- **Primary Font**: "Love Ya Like A Sister"
- **Tailwind Class**: `font-heading` (recommended)
- **Inline Style**: `style={{ fontFamily: '"Love Ya Like A Sister"' }}` (fallback)

## Icon Sizing

### Default Sizes
- **H1-associated icons**: `w-18`, `h-18`
- **H2-associated icons**: `w-14`, `h-14`
- **H3-associated icons**: `w-10`, `h-10`

### Exceptions and Special Cases
- **Messages icon**: Fixed size `w-16`, `h-16`
- **Prep Tools menu header**:
  - Font size: 30 px
  - Icon size: `w-18`, `h-18`
- **Prep Tools Menu cards**:
  - Font size: 24 px
  - Icon size: `w-14`, `h-14`

## Implementation Rules

- Headings use exact pixel sizes specified above. Do not auto-scale based on viewport.
- Icon sizes are tied to the heading tier unless an exception is listed.
- Use the specified font family for all headings and menu card titles.

## Quick Reference

```
H1: 36px; icons 18px; scope: Home, /auth top-level titles only
H2: 24px; icons 14px; scope: main section headers (Discover Voices, Song Library, Performance Prep, Voice Profile, Feeling Card song titles, Settings, Messages, Favorites, Feeling Journey)
H3: 18px; icons 10px; scope: in-page and modal section headers
Font: "Love Ya Like A Sister" (use font-heading class)
Exceptions:
- Messages icon: 16x16
- Prep Tools menu header: 30px text, 18px icon
- Menu cards: 24px text, 14px icon
```

## Notes for Future Expansion

- If additional heading tiers are introduced, maintain a 1.333 scale ratio downwards from H1 or define explicit pixel sizes.
- Add language, weight, and fallback font details if needed by platform.