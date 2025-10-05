# Schema Migration Quick Reference

## 🚀 Migration Ready!

I've created a comprehensive migration with all your suggested tweaks:

### 📂 Files Created:
- `supabase/migrations/20251005123000_songs_schema_upgrade_with_tweaks.sql` - Main migration
- `scripts/validateSchemaMigration.ts` - Post-migration validation
- `types/schema-migration-types.ts` - Updated TypeScript types
- `MIGRATION_GUIDE.md` - Detailed code update guide

### ✅ Tweaks Implemented:

1. **Case-insensitive uniqueness** on `(artist, song_title, version_label)`
   ```sql
   CREATE UNIQUE INDEX songs_artist_title_ver_idx
   ON songs (lower(artist), lower(song_title), COALESCE(version_label, ''));
   ```

2. **Artist+title-based slugs** (no more collisions)
   ```sql
   NEW.slug := regexp_replace(lower(NEW.artist || '-' || NEW.song_title), '[^a-z0-9]+', '-', 'g');
   ```

3. **Immutable public_id** for stable references
   ```sql
   ALTER TABLE songs ADD COLUMN public_id UUID DEFAULT gen_random_uuid();
   ```

4. **Parent-child relationships** (`parent_song_id` for covers)
   ```sql
   ALTER TABLE songs ADD COLUMN parent_song_id UUID REFERENCES songs(id);
   ```

5. **CASCADE deletes** and performance indexes
   ```sql
   FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE;
   CREATE INDEX songs_search_trgm ON songs USING GIN ((artist || ' ' || song_title) gin_trgm_ops);
   ```

### 🎯 Next Steps:

1. **Apply the migration:**
   ```bash
   npx supabase db push
   ```

2. **Validate it worked:**
   ```bash
   npm run migrate:validate
   ```

3. **Update your code** using the migration guide

4. **Test with sample data:**
   - Try inserting duplicate artist/title combinations (should fail gracefully)
   - Test search performance with the new indexes
   - Verify slug generation with artist+title

### 🔒 Safety Features:
- ✅ Non-destructive (preserves existing data)
- ✅ Automatic backfill of new fields
- ✅ Data validation constraints
- ✅ Rollback-friendly design

### 💡 Key Benefits After Migration:
- No more "Hello" collisions across different artists
- Stable references for favorites/i18n (public_id)
- Better search performance with trigram indexes
- Support for covers and alternate versions
- Case-insensitive duplicate prevention

**Ready to proceed?** Run the migration and let me know if you need any adjustments!