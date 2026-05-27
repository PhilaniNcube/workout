"use client"

import { useQuery } from "convex/react"
import { format } from "date-fns"
import Link from "next/link"

import { api } from "@/convex/_generated/api"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function WeightReferenceCard() {
  const weights = useQuery(api.exercises.getLastUsedWeights, { limit: 20 })

  if (weights === undefined) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Last Used Weights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (weights.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Last Used Weights</CardTitle>
          <CardDescription>
            Quick reference for your most recent lifts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            No weights logged yet.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Last Used Weights</CardTitle>
        <CardDescription>
          Quick reference for your most recent lifts
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="divide-border divide-y">
          {weights.map((w) => (
            <Link
              key={w.exerciseId}
              href={`/dashboard/exercises/${w.exerciseId}`}
              className="flex items-center justify-between gap-3 py-2.5 transition-colors hover:bg-muted/50 -mx-4 px-4"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{w.exerciseName}</p>
                <p className="text-muted-foreground text-xs">
                  {w.muscleGroupName ?? "Uncategorized"}
                  {w.equipment ? ` · ${w.equipment}` : ""}
                  {" · "}
                  {w.lastDate ? format(new Date(w.lastDate), "MMM d") : ""}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold tabular-nums">
                  {w.lastWeight} kg
                </p>
                {w.lastReps != null && (
                  <p className="text-muted-foreground text-xs tabular-nums">
                    {w.lastReps} reps
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
