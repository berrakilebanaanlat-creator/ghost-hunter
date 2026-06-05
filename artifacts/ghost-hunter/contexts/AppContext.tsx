import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

export interface Session {
  id: string;
  startTime: number;
  endTime: number;
  duration: number;
  tool: "EMF" | "EVP" | "RADAR" | "SPIRIT_BOX";
  peakReading?: number;
  avgReading?: number;
  eventsDetected: number;
  location?: string;
}

interface AppContextValue {
  sessions: Session[];
  isPremium: boolean;
  addSession: (session: Session) => void;
  deleteSession: (id: string) => void;
  setPremium: (value: boolean) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

const SESSIONS_KEY = "@ghost_hunter_sessions";
const PREMIUM_KEY = "@ghost_hunter_premium";

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isPremium, setIsPremiumState] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [storedSessions, storedPremium] = await Promise.all([
          AsyncStorage.getItem(SESSIONS_KEY),
          AsyncStorage.getItem(PREMIUM_KEY),
        ]);
        if (storedSessions) setSessions(JSON.parse(storedSessions));
        if (storedPremium === "true") setIsPremiumState(true);
      } catch {}
    })();
  }, []);

  const addSession = useCallback(async (session: Session) => {
    setSessions((prev) => {
      const next = [session, ...prev].slice(0, 100);
      AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const deleteSession = useCallback(async (id: string) => {
    setSessions((prev) => {
      const next = prev.filter((s) => s.id !== id);
      AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const setPremium = useCallback(async (value: boolean) => {
    setIsPremiumState(value);
    await AsyncStorage.setItem(PREMIUM_KEY, value ? "true" : "false");
  }, []);

  return (
    <AppContext.Provider value={{ sessions, isPremium, addSession, deleteSession, setPremium }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
