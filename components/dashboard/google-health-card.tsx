"use client"

import React, { useState, useEffect } from "react"
import { useAction } from "convex/react"
import { authClient } from "@/lib/auth-client"
import { api } from "@/convex/_generated/api"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Heart, RefreshCw, Zap, ShieldAlert, Award } from "lucide-react"

export default function GoogleHealthCard() {
  const fetchHealthData = useAction(api.googleHealth.fetchGoogleHealthData)
  
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

  if (loading) {
    return (
      <Card className="overflow-hidden border-zinc-200 dark:border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Google Health Sync</CardTitle>
          <CardDescription className="text-xs">Loading health data...</CardDescription>
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
      <Card className="relative overflow-hidden border-zinc-200 dark:border-zinc-800 bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-zinc-900 shadow-sm">
        <div className="absolute top-0 right-0 p-6 opacity-5 dark:opacity-10 pointer-events-none">
          <svg className="w-24 h-24 text-zinc-900 dark:text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.2 16.2H10.8V15h2.4v3.2zm0-4.8H10.8V5.8h2.4V13.4z"/>
          </svg>
        </div>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-zinc-400"></span>
            <CardTitle className="text-base font-semibold">Google Health Connect</CardTitle>
          </div>
          <CardDescription className="text-xs">Integrate steps & vitals from Google Health or Fitbit</CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          <p className="text-xs text-muted-foreground mb-4">
            Connect your personal Google account to fetch daily activities like step counts and heart rates directly into your dashboard.
          </p>
          <Button 
            onClick={handleLinkGoogle} 
            variant="default"
            className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium shadow-md transition-all duration-200 cursor-pointer"
          >
            Connect Google Health
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (data.status === "error") {
    return (
      <Card className="border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <ShieldAlert className="h-5 w-5" />
            <CardTitle className="text-base font-semibold">Integration Error</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-red-600/90 dark:text-red-400/90 mb-3">
            {data.message || "Failed to load health metrics from your account."}
          </p>
          <Button variant="outline" size="sm" onClick={() => loadData()} className="cursor-pointer">
            Retry Connection
          </Button>
        </CardContent>
      </Card>
    )
  }

  const stepsGoal = 10000
  const stepsPercentage = Math.min((data.steps / stepsGoal) * 100, 100)

  return (
    <Card className="overflow-hidden border-zinc-200 dark:border-zinc-800 bg-gradient-to-br from-white to-zinc-50/50 dark:from-zinc-950 dark:to-zinc-900/50 shadow-sm relative">
      <CardHeader className="pb-3 border-b border-zinc-100 dark:border-zinc-900">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
              <CardTitle className="text-base font-semibold">Google Health Active Sync</CardTitle>
              {data.isDemo && (
                <span className="inline-block self-start sm:self-auto text-[9px] bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold px-1.5 py-0.2 rounded-full">
                  Demo Mode
                </span>
              )}
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => loadData(true)}
            disabled={syncing}
            className="hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full h-7 w-7 flex items-center justify-center cursor-pointer"
            title="Sync latest data"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-zinc-500 ${syncing ? "animate-spin text-indigo-600" : ""}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          
          {/* Steps Card */}
          <div className="relative group overflow-hidden rounded-xl border border-zinc-100 dark:border-zinc-850 bg-white dark:bg-zinc-900 p-4 transition-all duration-300 hover:shadow-md hover:border-orange-200/55 dark:hover:border-orange-900/35">
            <div className="absolute top-0 right-0 -mr-6 -mt-6 h-20 w-20 rounded-full bg-orange-500/5 blur-xl group-hover:bg-orange-500/10 transition-all duration-300"></div>
            
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Steps Today</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white tabular-nums">
                    {data.steps.toLocaleString()}
                  </span>
                  <span className="text-xs text-zinc-400 dark:text-zinc-500">/ 10k</span>
                </div>
              </div>
              <div className="rounded-lg bg-orange-500/10 p-2 text-orange-500">
                <Zap className="h-4 w-4" />
              </div>
            </div>

            {/* Steps Progress Bar */}
            <div className="mt-4 space-y-1.5">
              <div className="h-1.5 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-500 ease-out" 
                  style={{ width: `${stepsPercentage}%` }}
                ></div>
              </div>
              <div className="flex items-center justify-between text-[10px] text-zinc-400 dark:text-zinc-500">
                <span>{Math.round(stepsPercentage)}% of daily goal</span>
                {stepsPercentage >= 100 && (
                  <span className="flex items-center gap-0.5 text-orange-600 dark:text-orange-400 font-semibold animate-pulse">
                    <Award className="h-3 w-3" /> Goal met!
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Heart Rate Card */}
          <div className="relative group overflow-hidden rounded-xl border border-zinc-100 dark:border-zinc-850 bg-white dark:bg-zinc-900 p-4 transition-all duration-300 hover:shadow-md hover:border-red-200/55 dark:hover:border-red-900/35">
            <div className="absolute top-0 right-0 -mr-6 -mt-6 h-20 w-20 rounded-full bg-red-500/5 blur-xl group-hover:bg-red-500/10 transition-all duration-300"></div>
            
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Resting Heart Rate</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white tabular-nums">
                    {data.heartRate}
                  </span>
                  <span className="text-xs text-zinc-400 dark:text-zinc-500">bpm</span>
                </div>
              </div>
              <div className="rounded-lg bg-red-50/10 dark:bg-red-500/10 p-2 text-red-500 group-hover:scale-110 transition-transform duration-300">
                <Heart className="h-4 w-4 animate-pulse text-red-500" />
              </div>
            </div>

            <div className="mt-5 flex items-center gap-1.5 text-[10px] text-zinc-400 dark:text-zinc-500">
              <span className="flex h-1.5 w-1.5 rounded-full bg-red-400 animate-ping"></span>
              <span>Monitored in real-time by your device</span>
            </div>
          </div>

        </div>

        {data.warning && (
          <p className="mt-3 text-[10px] text-center text-amber-600/80 dark:text-amber-400/80 italic">
            * {data.warning}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
