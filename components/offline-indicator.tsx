"use client"

import { useOffline } from "@/components/offline-provider"
import { Wifi, WifiOff, Loader2 } from "lucide-react"

export default function OfflineIndicator() {
  const { isOnline, pendingCount, isSyncing } = useOffline()

  if (isOnline && pendingCount === 0 && !isSyncing) return null

  return (
    <div
      className={`flex items-center justify-center gap-2 px-4 py-1.5 text-center text-xs font-medium ${
        !isOnline
          ? "bg-amber-600 text-white"
          : isSyncing
            ? "bg-blue-600 text-white"
            : "bg-emerald-600 text-white"
      }`}
    >
      {!isOnline ? (
        <>
          <WifiOff className="h-3.5 w-3.5" />
          <span>
            You&apos;re offline
            {pendingCount > 0
              ? ` — ${pendingCount} set${pendingCount === 1 ? "" : "s"} pending`
              : ""}
          </span>
        </>
      ) : isSyncing ? (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>
            Syncing {pendingCount} pending set{pendingCount === 1 ? "" : "s"}...
          </span>
        </>
      ) : pendingCount > 0 ? (
        <>
          <Wifi className="h-3.5 w-3.5" />
          <span>
            {pendingCount} set{pendingCount === 1 ? "" : "s"} queued —
            syncing...
          </span>
        </>
      ) : null}
    </div>
  )
}
