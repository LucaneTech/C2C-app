import React, { createContext, useContext, useState, useCallback } from 'react';

type RefreshContextType = {
  isRefreshing: boolean;
  startRefreshing: () => void;
  stopRefreshing: () => void;
  
  executeRefresh: (callback: () => Promise<void>) => Promise<void>;
};

const RefreshContext = createContext<RefreshContextType | undefined>(undefined);

export function RefreshProvider({ children }: { children: React.ReactNode }) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const startRefreshing = useCallback(() => setIsRefreshing(true), []);
  const stopRefreshing = useCallback(() => setIsRefreshing(false), []);

  const executeRefresh = useCallback(async (callback: () => Promise<void>) => {
    setIsRefreshing(true);
    try {
      await callback();
    } catch (error) {
      console.error("Erreur lors du rafraîchissement global:", error);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  return (
    <RefreshContext.Provider value={{ isRefreshing, startRefreshing, stopRefreshing, executeRefresh }}>
      {children}
    </RefreshContext.Provider>
  );
}

// Hook personnalisé pour consommer le contexte facilement
export function useRefresh() {
  const context = useContext(RefreshContext);
  if (!context) {
    throw new Error("useRefresh doit être utilisé à l'intérieur d'un RefreshProvider");
  }
  return context;
}