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

const CATEGORY_COLORS: Record<string, string> = {
  push: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  pull: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  legs: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  core: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  cardio: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  full: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300",
}

export default function SuggestedNextExercisesCard() {
  const suggestions = useQuery(api.workoutSessions.suggestNextExercises, {
    limit: 6,
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Suggested Next Exercises</CardTitle>
        <CardDescription>
          PPL-balanced recommendations using your last 14 training days. Factors
          in frequency, variety, upper/lower balance, and compound movements.
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
            <div className="space-y-1 text-xs text-muted-foreground">
              {suggestions.basedOn.mostRecentWorkoutDay ? (
                <p>
                  Most recent workout day:{" "}
                  {format(
                    new Date(suggestions.basedOn.mostRecentWorkoutDay),
                    "MMM d, yyyy"
                  )}
                  {suggestions.basedOn.mostRecentDominantCategory && (
                    <span
                      className={`ml-1.5 inline-block rounded-full px-1.5 py-0 text-[10px] leading-normal font-medium ${CATEGORY_COLORS[suggestions.basedOn.mostRecentDominantCategory] ?? "bg-muted text-muted-foreground"}`}
                    >
                      {suggestions.basedOn.mostRecentDominantCategory}
                    </span>
                  )}
                </p>
              ) : (
                <p>No recent workout day found.</p>
              )}
              {suggestions.basedOn.dueCategories &&
                suggestions.basedOn.dueCategories.length > 0 && (
                  <div className="flex items-center gap-1">
                    <span className="text-[10px]">Due for rotation:</span>
                    {suggestions.basedOn.dueCategories.map((cat) => (
                      <span
                        key={cat}
                        className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${CATEGORY_COLORS[cat] ?? "bg-muted text-muted-foreground"}`}
                      >
                        {cat}
                      </span>
                    ))}
                  </div>
                )}
              {suggestions.window && (
                <div className="flex flex-wrap gap-1">
                  {Object.entries(suggestions.window.categoryBreakdown)
                    .sort(([, a], [, b]) => b - a)
                    .map(([cat, count]) => (
                      <span
                        key={cat}
                        className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${CATEGORY_COLORS[cat] ?? "bg-muted text-muted-foreground"}`}
                      >
                        {cat}: {count}d
                      </span>
                    ))}
                  {suggestions.window.totalTrainingDays > 0 && (
                    <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      {suggestions.window.totalTrainingDays}/
                      {suggestions.window.daysAnalyzed}d
                    </span>
                  )}
                </div>
              )}
              {suggestions.blockedMuscleGroups.length > 0 && (
                <p>Resting: {suggestions.blockedMuscleGroups.join(", ")}</p>
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
                      <p className="text-sm font-semibold">
                        {item.exerciseName}
                        {item.isCompound && (
                          <span className="ml-1.5 rounded-full border border-border px-1.5 py-0 text-[10px] leading-none text-muted-foreground">
                            compound
                          </span>
                        )}
                      </p>
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
