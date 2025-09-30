import { useState, useEffect } from 'react';
import { FeelingMap } from '@/types';

const NOTES_KEY = 'song-personal-notes';

interface PersonalNote {
  songKey: string;
  note: string;
}

export const usePersonalNotes = () => {
  const [notes, setNotes] = useState<PersonalNote[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(NOTES_KEY);
    if (stored) {
      try {
        setNotes(JSON.parse(stored));
      } catch (error) {
        console.error('Error loading notes:', error);
      }
    }
  }, []);

  const saveNotes = (newNotes: PersonalNote[]) => {
    setNotes(newNotes);
    localStorage.setItem(NOTES_KEY, JSON.stringify(newNotes));
  };

  const getSongKey = (feelingMap: FeelingMap) => {
    return `${feelingMap.title}-${feelingMap.artist || 'unknown'}`;
  };

  const getNote = (feelingMap: FeelingMap): string => {
    const songKey = getSongKey(feelingMap);
    const existingNote = notes.find(n => n.songKey === songKey);
    return existingNote?.note || '';
  };

  const saveNote = (feelingMap: FeelingMap, note: string) => {
    const songKey = getSongKey(feelingMap);
    const existingIndex = notes.findIndex(n => n.songKey === songKey);
    
    let newNotes: PersonalNote[];
    if (existingIndex >= 0) {
      newNotes = [...notes];
      if (note.trim() === '') {
        // Remove note if empty
        newNotes.splice(existingIndex, 1);
      } else {
        newNotes[existingIndex] = { songKey, note };
      }
    } else if (note.trim() !== '') {
      newNotes = [...notes, { songKey, note }];
    } else {
      return; // Nothing to save
    }
    
    saveNotes(newNotes);
  };

  return {
    getNote,
    saveNote
  };
};
