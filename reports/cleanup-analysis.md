# Safe Cleanup Analysis Report

## Summary of Analysis Tools

### Knip Analysis
- **Unused Files Found**: 58 files flagged as unused
- **Unused Dependencies**: 30+ unused dependencies identified
- **Unused Exports**: Multiple unused exports in various files

### Depcheck Analysis
- **Unused Dependencies**: `@hookform/resolvers`, `@radix-ui/react-toast`, `sonner`
- **Unused DevDependencies**: `@tailwindcss/typography`, `autoprefixer`, `depcheck`, `knip`, `postcss`, `ts-prune`

### Build Status
✅ Build passes successfully (7.56s build time)

## Classification of Findings 

### A) Safe to Remove (Low Risk)
1. **Unused scripts in `/scripts` folder** (not part of main app)
   - `scripts/diffSongs.ts`
   - `scripts/extractSongNarrative.ts`

2. **Unused standalone pages** (not in router)
   - `src/pages/InboxPage.tsx` (superseded by modal)
   - `src/pages/SettingsPage.tsx` (superseded by modal)
   - `src/pages/UserProfilePage.tsx` (superseded by modal)
   - `src/pages/VoiceProfilePage.tsx` (superseded by modal)
   - `src/pages/VoicesPage.tsx` (superseded by modal)

3. **Legacy banner components** (replaced by CombinedLegalBanner)
   - `src/components/LegalUpdateBanner.tsx`
   - `src/components/PrivacyUpdateBanner.tsx`

4. **Unused UI components** (not imported anywhere)
   - Several shadcn/ui components not actively used

### B) Keep (Integration Pending / Dynamic References)
1. **All Supabase integration files** - @keep
2. **API clients and hooks under `/lib`, `/integrations`** - @keep
3. **Route components** (may be dynamically imported) - @keep
4. **i18n files and locales** - @keep
5. **UI components** (shadcn/ui library for future use) - @keep

### C) Mark with @keep (Integration Pending)
1. **Schema migration files** - backend integration pending
2. **Voice/profile APIs** - Supabase integration pending
3. **Upload/auth flows** - feature completion pending

## Proposed Actions

### Phase 1: Conservative Cleanup
1. Remove truly orphaned files (unused scripts, legacy components)
2. Clean up unused imports in active files
3. Remove obviously unused dependencies
4. Add @keep markers to integration-pending code

### Phase 2: Verification
1. Ensure build still passes
2. Test main user flows
3. Verify no runtime errors
