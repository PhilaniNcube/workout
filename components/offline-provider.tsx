"use client"

import {
  useEffect,
  useState,
  useCallback,
  createContext,
  useContext,
} from "react"
import { useConvex } from "convex/react"

import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import {
  getPendingMutations,
  getQueueSize,
  removeMutation,
  enqueueMutation,
  type QueuedSetMutation,
} from "@/lib/offline-queue"

interface OfflineContextValue {
  isOnline: boolean
  pendingCount: number
  isSyncing: boolean
  queueSetMutation: (
    sessionId: string,
    exerciseId: string,
    set: QueuedSetMutation["set"],
    notes?: string | null
  ) => Promise<void>
  syncNow: () => Promise<void>
}

const OfflineContext = createContext<OfflineContextValue>({
  isOnline: true,
  pendingCount: 0,
  isSyncing: false,
  queueSetMutation: async () => {},
  syncNow: async () => {},
})

export function useOffline() {
  return useContext(OfflineContext)
}

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  )
  const [pendingCount, setPendingCount] = useState(0)
  const [isSyncing, setIsSyncing] = useState(false)
  const convex = useConvex()

  const refreshCount = useCallback(async () => {
    try {
      const count = await getQueueSize()
      setPendingCount(count)
    } catch {
      // IndexedDB may not be available (SSR)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      refreshCount()
    }, 0)
    return () => clearTimeout(timer)
  }, [refreshCount])

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)
    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  const syncNow = useCallback(async () => {
    if (isSyncing) return
    setIsSyncing(true)
    try {
      const pending = await getPendingMutations()
      for (const item of pending) {
        try {
          await convex.mutation(api.workoutSessionExercises.addWithSet, {
            sessionId: item.sessionId as Id<"workoutSessions">,
            exerciseId: item.exerciseId as Id<"exercises">,
            reps: item.set.reps ?? null,
            weight: item.set.weight ?? null,
            durationSeconds: item.set.durationSeconds ?? null,
            distance: item.set.distance ?? null,
            rir: item.set.rir ?? null,
            effortLevel: item.set.effortLevel ?? null,
            isWarmup: item.set.isWarmup ?? false,
            notes: item.notes ?? null,
          })
          await removeMutation(item.id)
        } catch {
          break
        }
      }
    } catch {
      // IndexedDB error
    } finally {
      setIsSyncing(false)
      await refreshCount()
    }
  }, [convex, isSyncing, refreshCount])

  useEffect(() => {
    if (isOnline && pendingCount > 0) {
      const timer = setTimeout(() => {
        syncNow()
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [isOnline, pendingCount, syncNow])

  const queueSetMutation = useCallback(
    async (
      sessionId: string,
      exerciseId: string,
      set: QueuedSetMutation["set"],
      notes?: string | null
    ) => {
      await enqueueMutation(sessionId, exerciseId, set, notes ?? null)
      await refreshCount()
    },
    [refreshCount]
  )

  return (
    <OfflineContext
      value={{ isOnline, pendingCount, isSyncing, queueSetMutation, syncNow }}
    >
      {children}
    </OfflineContext>
  )
}
