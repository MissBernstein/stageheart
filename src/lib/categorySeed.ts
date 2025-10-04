import { Category, CategorySong, FeelingMap } from '@/types';
import {
  CATEGORIES_STORAGE_KEY,
  CATEGORY_SONGS_STORAGE_KEY,
  FAVORITES_STORAGE_KEY,
  PRESET_CATEGORY_DEFINITIONS,
  SEED_FLAG_ZURICH_CHOIR_V1,
} from './storageKeys';

const isBrowser = () => typeof window !== 'undefined' && typeof localStorage !== 'undefined';

const parseJSON = <T>(value: string | null, fallback: T): T => {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch (error) {
    console.error('Failed to parse stored value', error);
    return fallback;
  }
};

const persist = (key: string, value: unknown) => {
  localStorage.setItem(key, JSON.stringify(value));
};

const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
};

interface EnsurePresetsResult {
  mySolosId: string | null;
  zurichId: string | null;
  categories: Category[];
}

export const ensurePresets = (): EnsurePresetsResult => {
  if (!isBrowser()) {
    return { mySolosId: null, zurichId: null, categories: [] };
  }

  const storedCategories = parseJSON<Category[]>(
    localStorage.getItem(CATEGORIES_STORAGE_KEY),
    []
  );

  const idMap: Record<string, string | null> = {
    'My Solos': null,
    'Zurich Gospel Choir': null,
  };

  let hasChanges = false;
  const now = Date.now();

  PRESET_CATEGORY_DEFINITIONS.forEach(preset => {
    const existing = storedCategories.find(
      category => category.name.toLowerCase() === preset.name.toLowerCase()
    );

    if (existing) {
      idMap[preset.name] = existing.id;
      if (preset.isPreset && !existing.isPreset) {
        existing.isPreset = true;
        hasChanges = true;
      }
      return;
    }

    const newCategory: Category = {
      id: generateId(),
      name: preset.name,
      createdAt: now,
      isPreset: preset.isPreset,
    };
    storedCategories.push(newCategory);
    idMap[preset.name] = newCategory.id;
    hasChanges = true;
  });

  if (hasChanges) {
    persist(CATEGORIES_STORAGE_KEY, storedCategories);
  }

  return {
    mySolosId: idMap['My Solos'],
    zurichId: idMap['Zurich Gospel Choir'],
    categories: storedCategories,
  };
};

export const seedZurichChoirForExistingSongsV1 = () => {
  if (!isBrowser()) return;

  if (localStorage.getItem(SEED_FLAG_ZURICH_CHOIR_V1) === 'true') {
    return;
  }

  const { zurichId } = ensurePresets();
  if (!zurichId) {
    return;
  }

  const favorites = parseJSON<FeelingMap[]>(
    localStorage.getItem(FAVORITES_STORAGE_KEY),
    []
  );
  const categorySongs = parseJSON<CategorySong[]>(
    localStorage.getItem(CATEGORY_SONGS_STORAGE_KEY),
    []
  );

  let favoritesChanged = false;
  let categorySongsChanged = false;

  // Removed automatic seeding of legacy static songs. Future: optional DB-based seed.

  if (favoritesChanged) {
    persist(FAVORITES_STORAGE_KEY, favorites);
  }

  if (categorySongsChanged) {
    persist(CATEGORY_SONGS_STORAGE_KEY, categorySongs);
  }

  localStorage.setItem(SEED_FLAG_ZURICH_CHOIR_V1, 'true');
};
