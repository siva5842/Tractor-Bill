import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

export interface Equipment {
  id: string;
  name: string;
  hourlyRate: number;
  photoUri?: string;
  createdAt: number;
}

export type TimerStatus = "idle" | "running" | "paused";

export interface ActiveTimer {
  equipmentId: string;
  startTime: number;
  pausedAt?: number;
  accumulatedSeconds: number;
  status: TimerStatus;
}

export interface PendingDebtItem {
  id: string;
  amount: number;
  description: string;
  source: "Home Equipment" | "Pending List" | "Calculator";
  timestamp: number;
  durationSeconds?: number;
}

export interface PendingDebt {
  id: string;
  contactName: string;
  mobileNumber: string;
  lineItems: PendingDebtItem[];
  totalAmount: number;
  reminderDate?: number;
  notificationId?: string;
  createdAt: number;
}

export type HistoryEntryType = "session" | "paid_debt" | "calculator";

export interface HistoryEntry {
  id: string;
  type: HistoryEntryType;
  title: string;
  amount: number;
  durationSeconds?: number;
  equipmentName?: string;
  contactName?: string;
  createdAt: number;
}

interface DataContextType {
  equipment: Equipment[];
  addEquipment: (eq: Omit<Equipment, "id" | "createdAt">) => void;
  updateEquipment: (id: string, updates: Partial<Omit<Equipment, "id" | "createdAt">>) => void;
  deleteEquipment: (id: string) => void;

  activeTimers: Record<string, ActiveTimer>;
  startTimer: (equipmentId: string) => void;
  pauseTimer: (equipmentId: string) => void;
  resumeTimer: (equipmentId: string) => void;
  stopTimer: (equipmentId: string) => ActiveTimer | null;

  pendingDebts: PendingDebt[];
  addPendingDebt: (debt: Omit<PendingDebt, "id" | "createdAt" | "lineItems" | "totalAmount"> & {
    amount: number;
    description: string;
    source: PendingDebtItem["source"];
    durationSeconds?: number;
  }) => void;
  updatePendingDebt: (id: string, updates: Partial<Omit<PendingDebt, "id" | "createdAt">>) => void;
  deletePendingDebt: (id: string) => void;
  markPendingPaid: (id: string) => void;
  deletePendingItem: (debtId: string, itemId: string) => void;
  markPendingItemPaid: (debtId: string, itemId: string) => void;
  updatePendingItem: (debtId: string, itemId: string, updates: Partial<PendingDebtItem>) => void;

  historyEntries: HistoryEntry[];
  addHistoryEntry: (entry: Omit<HistoryEntry, "id" | "createdAt">) => void;
  deleteHistoryEntry: (id: string) => void;
}

const DataContext = createContext<DataContextType | null>(null);

function makeId() {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [activeTimers, setActiveTimers] = useState<Record<string, ActiveTimer>>({});
  const [pendingDebts, setPendingDebts] = useState<PendingDebt[]>([]);
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const eq = await AsyncStorage.getItem("@tiller_equipment");
        if (eq) setEquipment(JSON.parse(eq));
        const pd = await AsyncStorage.getItem("@tiller_pending");
        if (pd) setPendingDebts(JSON.parse(pd));
        const at = await AsyncStorage.getItem("@tiller_timers");
        if (at) {
          const timers: Record<string, ActiveTimer> = JSON.parse(at);
          const now = Date.now();
          Object.keys(timers).forEach((key) => {
            const t = timers[key];
            if (t.status === "running" && t.pausedAt === undefined) {
              timers[key].accumulatedSeconds += Math.floor(
                (now - t.startTime) / 1000
              );
              timers[key].startTime = now;
            }
          });
          setActiveTimers(timers);
        }
        const hist = await AsyncStorage.getItem("@tiller_history");
        if (hist) setHistoryEntries(JSON.parse(hist));
      } catch {}
    })();
  }, []);

  const saveEquipment = useCallback(async (eq: Equipment[]) => {
    await AsyncStorage.setItem("@tiller_equipment", JSON.stringify(eq));
  }, []);

  const savePending = useCallback(async (pd: PendingDebt[]) => {
    await AsyncStorage.setItem("@tiller_pending", JSON.stringify(pd));
  }, []);

  const saveTimers = useCallback(async (at: Record<string, ActiveTimer>) => {
    await AsyncStorage.setItem("@tiller_timers", JSON.stringify(at));
  }, []);

  const saveHistory = useCallback(async (hist: HistoryEntry[]) => {
    await AsyncStorage.setItem("@tiller_history", JSON.stringify(hist));
  }, []);

  const addEquipment = useCallback(
    (eq: Omit<Equipment, "id" | "createdAt">) => {
      const newEq: Equipment = { ...eq, id: makeId(), createdAt: Date.now() };
      setEquipment((prev) => {
        const next = [newEq, ...prev];
        saveEquipment(next);
        return next;
      });
    },
    [saveEquipment]
  );

  const updateEquipment = useCallback(
    (id: string, updates: Partial<Omit<Equipment, "id" | "createdAt">>) => {
      setEquipment((prev) => {
        const next = prev.map((e) => (e.id === id ? { ...e, ...updates } : e));
        saveEquipment(next);
        return next;
      });
    },
    [saveEquipment]
  );

  const deleteEquipment = useCallback(
    (id: string) => {
      setEquipment((prev) => {
        const next = prev.filter((e) => e.id !== id);
        saveEquipment(next);
        return next;
      });
      setActiveTimers((prev) => {
        const next = { ...prev };
        delete next[id];
        saveTimers(next);
        return next;
      });
    },
    [saveEquipment, saveTimers]
  );

  const startTimer = useCallback(
    (equipmentId: string) => {
      setActiveTimers((prev) => {
        const next = {
          ...prev,
          [equipmentId]: {
            equipmentId,
            startTime: Date.now(),
            accumulatedSeconds: 0,
            status: "running" as TimerStatus,
          },
        };
        saveTimers(next);
        return next;
      });
    },
    [saveTimers]
  );

  const pauseTimer = useCallback(
    (equipmentId: string) => {
      setActiveTimers((prev) => {
        const timer = prev[equipmentId];
        if (!timer || timer.status !== "running") return prev;
        const elapsed = Math.floor((Date.now() - timer.startTime) / 1000);
        const next = {
          ...prev,
          [equipmentId]: {
            ...timer,
            status: "paused" as TimerStatus,
            accumulatedSeconds: timer.accumulatedSeconds + elapsed,
            pausedAt: Date.now(),
          },
        };
        saveTimers(next);
        return next;
      });
    },
    [saveTimers]
  );

  const resumeTimer = useCallback(
    (equipmentId: string) => {
      setActiveTimers((prev) => {
        const timer = prev[equipmentId];
        if (!timer || timer.status !== "paused") return prev;
        const next = {
          ...prev,
          [equipmentId]: {
            ...timer,
            status: "running" as TimerStatus,
            startTime: Date.now(),
            pausedAt: undefined,
          },
        };
        saveTimers(next);
        return next;
      });
    },
    [saveTimers]
  );

  const stopTimer = useCallback(
    (equipmentId: string): ActiveTimer | null => {
      let result: ActiveTimer | null = null;
      setActiveTimers((prev) => {
        const timer = prev[equipmentId];
        if (!timer) return prev;
        let totalSecs = timer.accumulatedSeconds;
        if (timer.status === "running") {
          totalSecs += Math.floor((Date.now() - timer.startTime) / 1000);
        }
        result = { ...timer, accumulatedSeconds: totalSecs, status: "idle" };
        const next = { ...prev };
        delete next[equipmentId];
        saveTimers(next);
        return next;
      });
      return result;
    },
    [saveTimers]
  );

  const addPendingDebt = useCallback(
    (
      debtData: Omit<PendingDebt, "id" | "createdAt" | "lineItems" | "totalAmount"> & {
        amount: number;
        description: string;
        source: PendingDebtItem["source"];
        durationSeconds?: number;
      }
    ) => {
      setPendingDebts((prev) => {
        const cleanPhone = debtData.mobileNumber.replace(/\D/g, "");
        const existingIndex = prev.findIndex((d) => {
          const dPhone = d.mobileNumber.replace(/\D/g, "");
          if (cleanPhone && dPhone) return cleanPhone === dPhone;
          return d.contactName.trim().toLowerCase() === debtData.contactName.trim().toLowerCase();
        });

        const newLineItem: PendingDebtItem = {
          id: makeId(),
          amount: debtData.amount,
          description: debtData.description,
          source: debtData.source,
          timestamp: Date.now(),
          durationSeconds: debtData.durationSeconds,
        };

        let next;
        if (existingIndex > -1) {
          const existing = prev[existingIndex];
          const updatedLineItems = [...existing.lineItems, newLineItem];
          const updated: PendingDebt = {
            ...existing,
            lineItems: updatedLineItems,
            totalAmount: updatedLineItems.reduce((sum, item) => sum + item.amount, 0),
            createdAt: Date.now(), // Bring to top
          };
          next = [updated, ...prev.filter((_, i) => i !== existingIndex)];
        } else {
          const newDebt: PendingDebt = {
            id: makeId(),
            contactName: debtData.contactName,
            mobileNumber: debtData.mobileNumber,
            lineItems: [newLineItem],
            totalAmount: debtData.amount,
            reminderDate: debtData.reminderDate,
            notificationId: debtData.notificationId,
            createdAt: Date.now(),
          };
          next = [newDebt, ...prev];
        }
        savePending(next);
        return next;
      });
    },
    [savePending]
  );

  const updatePendingDebt = useCallback(
    (id: string, updates: Partial<Omit<PendingDebt, "id" | "createdAt">>) => {
      setPendingDebts((prev) => {
        const next = prev.map((d) => (d.id === id ? { ...d, ...updates } : d));
        savePending(next);
        return next;
      });
    },
    [savePending]
  );

  const deletePendingDebt = useCallback(
    (id: string) => {
      setPendingDebts((prev) => {
        const next = prev.filter((d) => d.id !== id);
        savePending(next);
        return next;
      });
    },
    [savePending]
  );

  const addHistoryEntry = useCallback(
    (entry: Omit<HistoryEntry, "id" | "createdAt">) => {
      const newEntry: HistoryEntry = {
        ...entry,
        id: makeId(),
        createdAt: Date.now(),
      };
      setHistoryEntries((prev) => {
        const next = [newEntry, ...prev];
        saveHistory(next);
        return next;
      });
    },
    [saveHistory]
  );

  const markPendingPaid = useCallback(
    (id: string) => {
      setPendingDebts((prev) => {
        const debt = prev.find((d) => d.id === id);
        if (debt) {
          const entry: Omit<HistoryEntry, "id" | "createdAt"> = {
            type: "paid_debt",
            title: debt.contactName,
            amount: debt.totalAmount,
            contactName: debt.contactName,
            equipmentName: debt.lineItems.map(li => li.description).join(", "),
          };
          const newEntry: HistoryEntry = {
            ...entry,
            id: makeId(),
            createdAt: Date.now(),
          };
          setHistoryEntries((hPrev) => {
            const next = [newEntry, ...hPrev];
            saveHistory(next);
            return next;
          });
        }
        const next = prev.filter((d) => d.id !== id);
        savePending(next);
        return next;
      });
    },
    [savePending, saveHistory]
  );

  const deletePendingItem = useCallback(
    (debtId: string, itemId: string) => {
      setPendingDebts((prev) => {
        const debt = prev.find((d) => d.id === debtId);
        if (!debt) return prev;
        const newLineItems = debt.lineItems.filter((li) => li.id !== itemId);
        if (newLineItems.length === 0) {
          const next = prev.filter((d) => d.id !== debtId);
          savePending(next);
          return next;
        }
        const updatedDebt: PendingDebt = {
          ...debt,
          lineItems: newLineItems,
          totalAmount: newLineItems.reduce((sum, li) => sum + li.amount, 0),
        };
        const next = prev.map((d) => (d.id === debtId ? updatedDebt : d));
        savePending(next);
        return next;
      });
    },
    [savePending]
  );

  const markPendingItemPaid = useCallback(
    (debtId: string, itemId: string) => {
      setPendingDebts((prev) => {
        const debt = prev.find((d) => d.id === debtId);
        if (!debt) return prev;
        const item = debt.lineItems.find((li) => li.id === itemId);
        if (!item) return prev;

        // Add to history
        const entry: Omit<HistoryEntry, "id" | "createdAt"> = {
          type: "paid_debt",
          title: debt.contactName,
          amount: item.amount,
          contactName: debt.contactName,
          equipmentName: item.description,
        };
        const newEntry: HistoryEntry = {
          ...entry,
          id: makeId(),
          createdAt: Date.now(),
        };
        setHistoryEntries((hPrev) => {
          const next = [newEntry, ...hPrev];
          saveHistory(next);
          return next;
        });

        const newLineItems = debt.lineItems.filter((li) => li.id !== itemId);
        if (newLineItems.length === 0) {
          const next = prev.filter((d) => d.id !== debtId);
          savePending(next);
          return next;
        }
        const updatedDebt: PendingDebt = {
          ...debt,
          lineItems: newLineItems,
          totalAmount: newLineItems.reduce((sum, li) => sum + li.amount, 0),
        };
        const next = prev.map((d) => (d.id === debtId ? updatedDebt : d));
        savePending(next);
        return next;
      });
    },
    [savePending, saveHistory]
  );

  const updatePendingItem = useCallback(
    (debtId: string, itemId: string, updates: Partial<PendingDebtItem>) => {
      setPendingDebts((prev) => {
        const debt = prev.find((d) => d.id === debtId);
        if (!debt) return prev;
        const newLineItems = debt.lineItems.map((li) =>
          li.id === itemId ? { ...li, ...updates } : li
        );
        const updatedDebt: PendingDebt = {
          ...debt,
          lineItems: newLineItems,
          totalAmount: newLineItems.reduce((sum, li) => sum + li.amount, 0),
        };
        const next = prev.map((d) => (d.id === debtId ? updatedDebt : d));
        savePending(next);
        return next;
      });
    },
    [savePending]
  );

  const deleteHistoryEntry = useCallback(
    (id: string) => {
      setHistoryEntries((prev) => {
        const next = prev.filter((e) => e.id !== id);
        saveHistory(next);
        return next;
      });
    },
    [saveHistory]
  );

  return (
    <DataContext.Provider
      value={{
        equipment,
        addEquipment,
        updateEquipment,
        deleteEquipment,
        activeTimers,
        startTimer,
        pauseTimer,
        resumeTimer,
        stopTimer,
        pendingDebts,
        addPendingDebt,
        updatePendingDebt,
        deletePendingDebt,
        markPendingPaid,
        deletePendingItem,
        markPendingItemPaid,
        updatePendingItem,
        historyEntries,
        addHistoryEntry,
        deleteHistoryEntry,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used inside DataProvider");
  return ctx;
}
