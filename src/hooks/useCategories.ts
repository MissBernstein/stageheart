import { useState, useEffect } from 'react';

const CATEGORIES_KEY = 'song-categories';
const CATEGORY_SONGS_KEY = 'category-songs';
const SEEDING_KEY = 'categories-seeded';

export interface Category {
  id: string;
  name: string;
  createdAt: number;
  isPreset?: boolean;
}

export interface CategorySong {
  categoryId: string;
  songId: string;
}

const PRESET_CATEGORIES: Omit<Category, 'id' | 'createdAt'>[] = [
  { name: 'My Solos', isPreset: true },
  { name: 'Zurich Gospel Choir', isPreset: true }
];

export const useCategories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [categorySongs, setCategorySongs] = useState<CategorySong[]>([]);

  useEffect(() => {
    loadData();
    seedIfNeeded();
  }, []);

  const loadData = () => {
    const storedCategories = localStorage.getItem(CATEGORIES_KEY);
    const storedCategorySongs = localStorage.getItem(CATEGORY_SONGS_KEY);
    
    if (storedCategories) {
      try {
        setCategories(JSON.parse(storedCategories));
      } catch (error) {
        console.error('Error loading categories:', error);
      }
    } else {
      initializePresets();
    }

    if (storedCategorySongs) {
      try {
        setCategorySongs(JSON.parse(storedCategorySongs));
      } catch (error) {
        console.error('Error loading category songs:', error);
      }
    }
  };

  const initializePresets = () => {
    const newCategories: Category[] = PRESET_CATEGORIES.map(preset => ({
      ...preset,
      id: crypto.randomUUID(),
      createdAt: Date.now()
    }));
    
    setCategories(newCategories);
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(newCategories));
  };

  const seedIfNeeded = () => {
    const hasSeeded = localStorage.getItem(SEEDING_KEY);
    if (!hasSeeded) {
      seedZurichChoirForAllSongs();
    }
  };

  const seedZurichChoirForAllSongs = () => {
    const storedCategories = localStorage.getItem(CATEGORIES_KEY);
    const storedFavorites = localStorage.getItem('song-feelings-favorites');
    
    if (!storedCategories || !storedFavorites) return;

    try {
      const cats: Category[] = JSON.parse(storedCategories);
      const favorites = JSON.parse(storedFavorites);
      
      const zurichCategory = cats.find(c => c.name === 'Zurich Gospel Choir');
      if (!zurichCategory || favorites.length === 0) {
        localStorage.setItem(SEEDING_KEY, 'true');
        return;
      }

      const newCategorySongs: CategorySong[] = favorites.map((fav: any) => ({
        categoryId: zurichCategory.id,
        songId: fav.id
      }));

      localStorage.setItem(CATEGORY_SONGS_KEY, JSON.stringify(newCategorySongs));
      localStorage.setItem(SEEDING_KEY, 'true');
      setCategorySongs(newCategorySongs);
    } catch (error) {
      console.error('Error seeding:', error);
    }
  };

  const saveCategories = (newCategories: Category[]) => {
    setCategories(newCategories);
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(newCategories));
  };

  const saveCategorySongs = (newCategorySongs: CategorySong[]) => {
    setCategorySongs(newCategorySongs);
    localStorage.setItem(CATEGORY_SONGS_KEY, JSON.stringify(newCategorySongs));
  };

  const createCategory = (name: string): Category => {
    const newCategory: Category = {
      id: crypto.randomUUID(),
      name,
      createdAt: Date.now()
    };
    const newCategories = [...categories, newCategory];
    saveCategories(newCategories);
    return newCategory;
  };

  const renameCategory = (id: string, name: string) => {
    const newCategories = categories.map(cat =>
      cat.id === id ? { ...cat, name } : cat
    );
    saveCategories(newCategories);
  };

  const deleteCategory = (id: string) => {
    const newCategories = categories.filter(cat => cat.id !== id);
    saveCategories(newCategories);
    
    const newCategorySongs = categorySongs.filter(cs => cs.categoryId !== id);
    saveCategorySongs(newCategorySongs);
  };

  const setSongCategories = (songId: string, categoryIds: string[]) => {
    const filteredCategorySongs = categorySongs.filter(cs => cs.songId !== songId);
    const newCategorySongs = [
      ...filteredCategorySongs,
      ...categoryIds.map(categoryId => ({ categoryId, songId }))
    ];
    saveCategorySongs(newCategorySongs);
  };

  const getSongCategories = (songId: string): string[] => {
    return categorySongs
      .filter(cs => cs.songId === songId)
      .map(cs => cs.categoryId);
  };

  const getSongsByCategory = (categoryId: string): string[] => {
    return categorySongs
      .filter(cs => cs.categoryId === categoryId)
      .map(cs => cs.songId);
  };

  const listCategories = (): Category[] => {
    return [...categories].sort((a, b) => {
      if (a.isPreset && !b.isPreset) return -1;
      if (!a.isPreset && b.isPreset) return 1;
      return a.name.localeCompare(b.name);
    });
  };

  return {
    categories: listCategories(),
    createCategory,
    renameCategory,
    deleteCategory,
    setSongCategories,
    getSongCategories,
    getSongsByCategory
  };
};
