import { useState, useEffect } from 'react';
import { Category, CategorySong } from '@/types';
import {
  CATEGORIES_STORAGE_KEY,
  CATEGORY_SONGS_STORAGE_KEY,
} from '@/lib/storageKeys';
import { ensurePresets, seedZurichChoirForExistingSongsV1 } from '@/lib/categorySeed';

const isBrowser = () => typeof window !== 'undefined' && typeof localStorage !== 'undefined';

const parseJSON = <T>(value: string | null, fallback: T): T => {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch (error) {
    console.error('Error parsing stored data:', error);
    return fallback;
  }
};

const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
};

export const useCategories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [categorySongs, setCategorySongs] = useState<CategorySong[]>([]);

  useEffect(() => {
    if (!isBrowser()) return;

    ensurePresets();
    seedZurichChoirForExistingSongsV1();

    const storedCategories = parseJSON<Category[]>(
      localStorage.getItem(CATEGORIES_STORAGE_KEY),
      []
    );
    setCategories(storedCategories);

    const storedCategorySongs = parseJSON<CategorySong[]>(
      localStorage.getItem(CATEGORY_SONGS_STORAGE_KEY),
      []
    );
    setCategorySongs(storedCategorySongs);
  }, []);

  const persistCategories = (newCategories: Category[]) => {
    setCategories(newCategories);
    if (isBrowser()) {
      localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(newCategories));
    }
  };

  const persistCategorySongs = (newCategorySongs: CategorySong[]) => {
    setCategorySongs(newCategorySongs);
    if (isBrowser()) {
      localStorage.setItem(CATEGORY_SONGS_STORAGE_KEY, JSON.stringify(newCategorySongs));
    }
  };

  const createCategory = (name: string): Category => {
    const newCategory: Category = {
      id: generateId(),
      name,
      createdAt: Date.now(),
    };
    const updated = [...categories, newCategory];
    persistCategories(updated);
    return newCategory;
  };

  const renameCategory = (id: string, name: string) => {
    const updated = categories.map(category =>
      category.id === id ? { ...category, name } : category
    );
    persistCategories(updated);
  };

  const deleteCategory = (id: string) => {
    const updatedCategories = categories.filter(category => category.id !== id);
    persistCategories(updatedCategories);

    const updatedLinks = categorySongs.filter(link => link.categoryId !== id);
    persistCategorySongs(updatedLinks);
  };

  const setSongCategories = (songId: string, categoryIds: string[]) => {
    const filtered = categorySongs.filter(link => link.songId !== songId);
    const updated: CategorySong[] = [
      ...filtered,
      ...categoryIds.map(categoryId => ({ categoryId, songId })),
    ];
    persistCategorySongs(updated);
  };

  const getSongCategories = (songId: string): string[] => {
    return categorySongs
      .filter(link => link.songId === songId)
      .map(link => link.categoryId);
  };

  const getSongsByCategory = (categoryId: string): string[] => {
    return categorySongs
      .filter(link => link.categoryId === categoryId)
      .map(link => link.songId);
  };

  const listCategories = (): Category[] =>
    [...categories].sort((a, b) => {
      if (a.isPreset && !b.isPreset) return -1;
      if (!a.isPreset && b.isPreset) return 1;
      return a.name.localeCompare(b.name);
    });

  return {
    categories: listCategories(),
    createCategory,
    renameCategory,
    deleteCategory,
    setSongCategories,
    getSongCategories,
    getSongsByCategory,
  };
};
