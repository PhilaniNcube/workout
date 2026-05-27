"use client"

import { useState } from "react"
import { useQuery } from "convex/react"
import { format } from "date-fns"
import { ChevronDown, Clock, Dumbbell, Scale } from "lucide-react"

import { api } from "@/convex/_generated/api"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export default function SessionHistoryCard() {
  const history = useQuery(api.stats.getSessionHistory, { limit: 20 })
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (history === undefined) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Session History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Session History</CardTitle>
          <CardDescription>Your recent workouts</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            No sessions yet. Start a workout to build your history.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Session History</CardTitle>
        <CardDescription>Your recent workouts</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {history.map((entry) => {
          const isExpanded = expandedId === entry.session._id
          return (
            <div key={entry.session._id} className="rounded-md border">
              <button
                type="button"
                onClick={() =>
                  setExpandedId(isExpanded ? null : entry.session._id)
                }
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/50"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {format(
                      new Date(entry.session.startedAt),
                      "EEE, MMM d",
                    )}
                    {entry.session.notes && (
                      <span className="text-muted-foreground ml-2 text-xs italic">
                        {entry.session.notes}
                      </span>
                    )}
                  </p>
                  <div className="text-muted-foreground mt-0.5 flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1">
                      <Dumbbell className="h-3 w-3" />
                      {entry.exercises.length} exercise
                      {entry.exercises.length !== 1 ? "s" : ""}
                    </span>
                    <span className="flex items-center gap-1">
                      <Scale className="h-3 w-3" />
                      {entry.totalVolume.toLocaleString()} kg
                    </span>
                    <span>{entry.totalSets} sets</span>
                    {entry.duration != null && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {entry.duration} min
                      </span>
                    )}
                  </div>
                </div>
                <ChevronDown
                  className={cn(
                    "text-muted-foreground h-4 w-4 shrink-0 transition-transform",
                    isExpanded && "rotate-180",
                  )}
                />
              </button>

              {isExpanded && (
                <div className="border-t px-3 py-2">
                  <div className="space-y-2">
                    {entry.exercises.map((ex) => (
                      <div
                        key={ex.exerciseId}
                        className="flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium">
                            {ex.exerciseName}
                          </p>
                          <p className="text-muted-foreground">
                            {ex.muscleGroupName ?? "Uncategorized"}
                          </p>
                        </div>
                        <div className="text-muted-foreground text-right shrink-0 tabular-nums">
                          <p>
                            {ex.setCount} set{ex.setCount !== 1 ? "s" : ""}
                          </p>
                          {ex.maxWeight != null && (
                            <p className="font-medium text-foreground">
                              {ex.maxWeight} kg max
                            </p>
                          )}
                          {ex.totalVolume > 0 && (
                            <p>{ex.totalVolume.toLocaleString()} kg vol</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  {entry.session.perceivedEffort != null && (
                    <p className="text-muted-foreground mt-2 text-xs">
                      Perceived effort: {entry.session.perceivedEffort}/10
                    </p>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
