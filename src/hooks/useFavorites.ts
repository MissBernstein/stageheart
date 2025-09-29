import { useState, useEffect } from 'react';
import { FeelingMap } from '@/types';

const FAVORITES_KEY = 'song-feelings-favorites';

export const useFavorites = () => {
  const [favorites, setFavorites] = useState<FeelingMap[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(FAVORITES_KEY);
    if (stored) {
      try {
        setFavorites(JSON.parse(stored));
      } catch (error) {
        console.error('Error loading favorites:', error);
      }
    }
  }, []);

  const saveFavorites = (newFavorites: FeelingMap[]) => {
    setFavorites(newFavorites);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(newFavorites));
  };

  const addFavorite = (feelingMap: FeelingMap) => {
    const exists = favorites.find(fav => 
      fav.title === feelingMap.title && fav.artist === feelingMap.artist
    );
    
    if (!exists) {
      const newFavorites = [...favorites, feelingMap];
      saveFavorites(newFavorites);
    }
  };

  const removeFavorite = (feelingMap: FeelingMap) => {
    const newFavorites = favorites.filter(fav => 
      !(fav.title === feelingMap.title && fav.artist === feelingMap.artist)
    );
    saveFavorites(newFavorites);
  };

  const isFavorite = (feelingMap: FeelingMap) => {
    return favorites.some(fav => 
      fav.title === feelingMap.title && fav.artist === feelingMap.artist
    );
  };

  return {
    favorites,
    addFavorite,
    removeFavorite,
    isFavorite
  };
};