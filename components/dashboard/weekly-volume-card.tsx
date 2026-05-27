"use client"

import { useQuery } from "convex/react"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"

import { api } from "@/convex/_generated/api"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function WeeklyVolumeCard() {
  const data = useQuery(api.stats.getWeeklyVolume, {})

  if (data === undefined) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Weekly Volume</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  const { thisWeek, prevWeek } = data
  const volumeChange =
    prevWeek.totalVolume > 0
      ? ((thisWeek.totalVolume - prevWeek.totalVolume) / prevWeek.totalVolume) * 100
      : null

  const TrendIcon =
    volumeChange != null
      ? volumeChange > 0
        ? TrendingUp
        : volumeChange < 0
          ? TrendingDown
          : Minus
      : null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekly Volume</CardTitle>
        <CardDescription>
          This week vs last week (working sets only)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-md border p-3 text-center">
            <p className="text-xl font-bold tabular-nums">
              {thisWeek.totalVolume.toLocaleString()}
            </p>
            <p className="text-muted-foreground text-[10px] uppercase">
              Volume (kg)
            </p>
          </div>
          <div className="rounded-md border p-3 text-center">
            <p className="text-xl font-bold tabular-nums">
              {thisWeek.totalSets}
            </p>
            <p className="text-muted-foreground text-[10px] uppercase">
              Sets
            </p>
          </div>
          <div className="rounded-md border p-3 text-center">
            <p className="text-xl font-bold tabular-nums">
              {thisWeek.totalReps}
            </p>
            <p className="text-muted-foreground text-[10px] uppercase">
              Reps
            </p>
          </div>
        </div>

        {volumeChange != null && TrendIcon && (
          <div className="flex items-center gap-2 text-sm">
            <TrendIcon
              className={`h-4 w-4 ${
                volumeChange > 0
                  ? "text-emerald-500"
                  : volumeChange < 0
                    ? "text-red-500"
                    : "text-muted-foreground"
              }`}
            />
            <span
              className={
                volumeChange > 0
                  ? "text-emerald-500"
                  : volumeChange < 0
                    ? "text-red-500"
                    : "text-muted-foreground"
              }
            >
              {volumeChange > 0 ? "+" : ""}
              {volumeChange.toFixed(1)}% vs last week
            </span>
          </div>
        )}

        {thisWeek.byMuscleGroup.length > 0 && (
          <div className="space-y-2">
            <p className="text-muted-foreground text-xs font-medium">
              By muscle group
            </p>
            {thisWeek.byMuscleGroup.map((mg) => {
              const maxVol = thisWeek.byMuscleGroup[0]?.volume ?? 1
              const pct = maxVol > 0 ? (mg.volume / maxVol) * 100 : 0
              return (
                <div key={mg.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium">{mg.name}</span>
                    <span className="text-muted-foreground tabular-nums">
                      {mg.volume.toLocaleString()} kg · {mg.sets} sets
                    </span>
                  </div>
                  <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
                    <div
                      className="bg-primary h-full rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
