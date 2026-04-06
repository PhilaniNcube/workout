"use client"

import { useQuery } from "convex/react"
import { format } from "date-fns"

import { api } from "@/convex/_generated/api"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function SuggestedNextExercisesCard() {
  const suggestions = useQuery(api.workoutSessions.suggestNextExercises, {
    limit: 6,
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Suggested Next Exercises</CardTitle>
        <CardDescription>
          Built from your last 2 workout days to avoid consecutive-day muscle
          group repeats.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {suggestions === undefined ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, idx) => (
              <Skeleton key={idx} className="h-16 w-full" />
            ))}
          </div>
        ) : suggestions.recommendations.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No suggestions yet. Log workouts from at least one day to generate
            recommendations.
          </p>
        ) : (
          <>
            <div className="text-xs text-muted-foreground">
              {suggestions.basedOn.mostRecentWorkoutDay ? (
                <p>
                  Most recent workout day:{" "}
                  {format(
                    new Date(suggestions.basedOn.mostRecentWorkoutDay),
                    "MMM d, yyyy",
                  )}
                </p>
              ) : (
                <p>No recent workout day found in the last 2 days.</p>
              )}
              {suggestions.blockedMuscleGroups.length > 0 && (
                <p>
                  Avoiding consecutive-day repeats for: {" "}
                  {suggestions.blockedMuscleGroups.join(", ")}
                </p>
              )}
            </div>

            <div className="space-y-2">
              {suggestions.recommendations.map((item) => (
                <div
                  key={item.exerciseId}
                  className="rounded-md border border-border/60 px-3 py-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold">{item.exerciseName}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.muscleGroupName}
                      </p>
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.reason}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
