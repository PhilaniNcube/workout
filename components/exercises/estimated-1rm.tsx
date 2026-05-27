"use client"

import { useQuery } from "convex/react"

import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

function estimate1RM(weight: number, reps: number): number {
  if (reps === 1) return weight
  return Math.round(weight * (1 + reps / 30) * 10) / 10
}

export default function EstimatedOneRepMax({
  exerciseId,
}: {
  exerciseId: Id<"exercises">
}) {
  const history = useQuery(api.exercises.getHistory, {
    exerciseId,
    limit: 100,
  })

  if (history === undefined) {
    return (
      <Card size="sm">
        <CardHeader>
          <CardTitle>Estimated 1RM</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    )
  }

  let bestEstimate = 0
  let bestWeight = 0
  let bestReps = 0

  for (const entry of history) {
    for (const set of entry.sets) {
      if (set.isWarmup || set.weight == null || set.reps == null) continue
      const est = estimate1RM(set.weight, set.reps)
      if (est > bestEstimate) {
        bestEstimate = est
        bestWeight = set.weight
        bestReps = set.reps
      }
    }
  }

  if (bestEstimate === 0) {
    return null
  }

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Estimated 1RM</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold tabular-nums">
            {bestEstimate}
          </span>
          <span className="text-muted-foreground text-sm">kg</span>
        </div>
        <p className="text-muted-foreground mt-1 text-xs">
          Based on {bestWeight} kg x {bestReps} reps (Epley formula)
        </p>
      </CardContent>
    </Card>
  )
}
