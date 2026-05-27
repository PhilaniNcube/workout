"use client"

import { useQuery } from "convex/react"

import { api } from "@/convex/_generated/api"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function MuscleBalanceCard() {
  const data = useQuery(api.stats.getMuscleBalance, { weeks: 4 })

  if (data === undefined) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Muscle Balance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (data.muscleGroups.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Muscle Balance</CardTitle>
          <CardDescription>
            Sets per muscle group over the last {data.weeks} weeks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            No data yet. Log workouts to see your muscle balance.
          </p>
        </CardContent>
      </Card>
    )
  }

  const maxSets = data.muscleGroups[0]?.totalSets ?? 1

  return (
    <Card>
      <CardHeader>
        <CardTitle>Muscle Balance</CardTitle>
        <CardDescription>
          Working sets per muscle group over the last {data.weeks} weeks
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.muscleGroups.map((mg) => {
          const pct = maxSets > 0 ? (mg.totalSets / maxSets) * 100 : 0
          return (
            <div key={mg.muscleGroupId} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium">{mg.muscleGroupName}</span>
                <span className="text-muted-foreground tabular-nums">
                  {mg.totalSets} sets ({mg.setsPerWeek}/wk) · {mg.exerciseCount}{" "}
                  exercise{mg.exerciseCount !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
                <div
                  className="bg-primary h-full rounded-full transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
