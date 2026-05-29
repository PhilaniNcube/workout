"use client"

import React, { useState, useEffect } from "react"
import { useAction, useMutation } from "convex/react"
import { authClient } from "@/lib/auth-client"
import { api } from "@/convex/_generated/api"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Heart, RefreshCw, Zap, ShieldAlert, Award, Unlink } from "lucide-react"

export default function GoogleHealthCard() {
  const fetchHealthData = useAction(api.googleHealth.fetchGoogleHealthData)
  const unlinkAccount = useMutation(api.googleHealth.unlinkGoogleAccount)

  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [data, setData] = useState<any>(null)

  const loadData = async (showSyncIndicator = false) => {
    if (showSyncIndicator) {
      setSyncing(true)
    } else {
      setLoading(true)
    }

    try {
      const res = await fetchHealthData()
      setData(res)
    } catch (err) {
      console.error("Failed to load health data:", err)
      setData({ status: "error", message: "Failed to connect to server" })
    } finally {
      setLoading(false)
      setSyncing(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleLinkGoogle = async () => {
    try {
      await authClient.linkSocial({
        provider: "google",
        callbackURL: `${window.location.origin}/dashboard`,
      })
    } catch (err) {
      console.error("Failed to link Google account:", err)
    }
  }

  const handleUnlink = async () => {
    try {
      await unlinkAccount()
      setData(null)
    } catch (err) {
      console.error("Failed to unlink Google account:", err)
    }
  }

  if (loading) {
    return (
      <Card className="overflow-hidden border-zinc-200 dark:border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Google Health Sync</CardTitle>
          <CardDescription className="text-xs">
            Loading health data...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data || data.status === "unlinked") {
    return (
      <Card className="relative overflow-hidden border-zinc-200 bg-gradient-to-br from-zinc-50 to-zinc-100 shadow-sm dark:border-zinc-800 dark:from-zinc-950 dark:to-zinc-900">
        <div className="pointer-events-none absolute top-0 right-0 p-6 opacity-5 dark:opacity-10">
          <svg
            className="h-24 w-24 text-zinc-900 dark:text-white"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.2 16.2H10.8V15h2.4v3.2zm0-4.8H10.8V5.8h2.4V13.4z" />
          </svg>
        </div>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-zinc-400"></span>
            <CardTitle className="text-base font-semibold">
              Google Health Connect
            </CardTitle>
          </div>
          <CardDescription className="text-xs">
            Integrate steps & vitals from Google Health or Fitbit
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          <p className="mb-4 text-xs text-muted-foreground">
            Connect your personal Google account to fetch daily activities like
            step counts and heart rates directly into your dashboard.
          </p>
          <Button
            onClick={handleLinkGoogle}
            variant="default"
            className="w-full cursor-pointer bg-gradient-to-r from-blue-600 to-indigo-600 font-medium text-white shadow-md transition-all duration-200 hover:from-blue-500 hover:to-indigo-500 sm:w-auto"
          >
            Connect Google Health
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (data.status === "error") {
    return (
      <Card className="border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/20">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <ShieldAlert className="h-5 w-5" />
            <CardTitle className="text-base font-semibold">
              Integration Error
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-xs text-red-600/90 dark:text-red-400/90">
            {data.message || "Failed to load health metrics from your account."}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadData()}
            className="cursor-pointer"
          >
            Retry Connection
          </Button>
        </CardContent>
      </Card>
    )
  }

  const stepsGoal = 10000
  const stepsPercentage = Math.min((data.steps / stepsGoal) * 100, 100)

  return (
    <Card className="relative overflow-hidden border-zinc-200 bg-gradient-to-br from-white to-zinc-50/50 shadow-sm dark:border-zinc-800 dark:from-zinc-950 dark:to-zinc-900/50">
      <CardHeader className="border-b border-zinc-100 pb-3 dark:border-zinc-900">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
            </span>
            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
              <CardTitle className="text-base font-semibold">
                Google Health Active Sync
              </CardTitle>
              {data.isDemo && (
                <span className="py-0.2 inline-block self-start rounded-full bg-amber-500/10 px-1.5 text-[9px] font-semibold text-amber-600 sm:self-auto dark:text-amber-400">
                  Demo Mode
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => loadData(true)}
              disabled={syncing}
              className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800"
              title="Sync latest data"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 text-zinc-500 ${syncing ? "animate-spin text-indigo-600" : ""}`}
              />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleUnlink}
              className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full hover:bg-red-100 dark:hover:bg-red-950"
              title="Unlink Google account"
            >
              <Unlink className="h-3.5 w-3.5 text-zinc-400 hover:text-red-500" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Steps Card */}
          <div className="group dark:border-zinc-850 relative overflow-hidden rounded-xl border border-zinc-100 bg-white p-4 transition-all duration-300 hover:border-orange-200/55 hover:shadow-md dark:bg-zinc-900 dark:hover:border-orange-900/35">
            <div className="absolute top-0 right-0 -mt-6 -mr-6 h-20 w-20 rounded-full bg-orange-500/5 blur-xl transition-all duration-300 group-hover:bg-orange-500/10"></div>

            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-medium tracking-wider text-zinc-400 uppercase dark:text-zinc-500">
                  Steps Today
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold tracking-tight text-zinc-900 tabular-nums dark:text-white">
                    {data.steps.toLocaleString()}
                  </span>
                  <span className="text-xs text-zinc-400 dark:text-zinc-500">
                    / 10k
                  </span>
                </div>
              </div>
              <div className="rounded-lg bg-orange-500/10 p-2 text-orange-500">
                <Zap className="h-4 w-4" />
              </div>
            </div>

            {/* Steps Progress Bar */}
            <div className="mt-4 space-y-1.5">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-500 ease-out"
                  style={{ width: `${stepsPercentage}%` }}
                ></div>
              </div>
              <div className="flex items-center justify-between text-[10px] text-zinc-400 dark:text-zinc-500">
                <span>{Math.round(stepsPercentage)}% of daily goal</span>
                {stepsPercentage >= 100 && (
                  <span className="flex animate-pulse items-center gap-0.5 font-semibold text-orange-600 dark:text-orange-400">
                    <Award className="h-3 w-3" /> Goal met!
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Heart Rate Card */}
          <div className="group dark:border-zinc-850 relative overflow-hidden rounded-xl border border-zinc-100 bg-white p-4 transition-all duration-300 hover:border-red-200/55 hover:shadow-md dark:bg-zinc-900 dark:hover:border-red-900/35">
            <div className="absolute top-0 right-0 -mt-6 -mr-6 h-20 w-20 rounded-full bg-red-500/5 blur-xl transition-all duration-300 group-hover:bg-red-500/10"></div>

            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-medium tracking-wider text-zinc-400 uppercase dark:text-zinc-500">
                  Resting Heart Rate
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold tracking-tight text-zinc-900 tabular-nums dark:text-white">
                    {data.heartRate}
                  </span>
                  <span className="text-xs text-zinc-400 dark:text-zinc-500">
                    bpm
                  </span>
                </div>
              </div>
              <div className="rounded-lg bg-red-50/10 p-2 text-red-500 transition-transform duration-300 group-hover:scale-110 dark:bg-red-500/10">
                <Heart className="h-4 w-4 animate-pulse text-red-500" />
              </div>
            </div>

            <div className="mt-5 flex items-center gap-1.5 text-[10px] text-zinc-400 dark:text-zinc-500">
              <span className="flex h-1.5 w-1.5 animate-ping rounded-full bg-red-400"></span>
              <span>Monitored in real-time by your device</span>
            </div>
          </div>
        </div>

        {data.warning && (
          <p className="mt-3 text-center text-[10px] text-amber-600/80 italic dark:text-amber-400/80">
            * {data.warning}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
