import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

const LS_KEY = 'stageheart_unread_messages_v1';

interface UnreadContextType {
  unread: number;
  setUnread: React.Dispatch<React.SetStateAction<number>>;
  markAllRead: () => void;
  markReadIds: (ids: string[]) => void; // for future granular updates
}

const UnreadMessagesContext = createContext<UnreadContextType | undefined>(undefined);

export const UnreadMessagesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [unread, setUnread] = useState(0);

  // hydrate from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const num = parseInt(raw, 10);
        if (!isNaN(num)) setUnread(num);
      }
    } catch {/* ignore */}
  }, []);

  useEffect(() => {
    try { localStorage.setItem(LS_KEY, String(unread)); } catch {/* ignore */}
  }, [unread]);

  const markAllRead = useCallback(() => setUnread(0), []);
  const markReadIds = useCallback((_ids: string[]) => {
    // For now just decrement by ids.length but clamp at 0 (placeholder until real backend)
    setUnread(prev => Math.max(0, prev - _ids.length));
  }, []);

  return (
    <UnreadMessagesContext.Provider value={{ unread, setUnread, markAllRead, markReadIds }}>
      {children}
      <div aria-live="polite" role="status" className="sr-only">{unread} unread messages</div>
    </UnreadMessagesContext.Provider>
  );
};

export const useUnreadMessagesStore = () => {
  const ctx = useContext(UnreadMessagesContext);
  if (!ctx) throw new Error('useUnreadMessagesStore must be used within UnreadMessagesProvider');
  return ctx;
};
