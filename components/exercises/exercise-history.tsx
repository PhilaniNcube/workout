"use client";

import { useQuery } from "convex/react";
import { format } from "date-fns";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function ExerciseHistory({
  exerciseId,
}: {
  exerciseId: Id<"exercises">;
}) {
  const history = useQuery(api.exercises.getHistory, { exerciseId });

  if (history === undefined) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">No workout history for this exercise yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {history.map((entry) => {
            const sessionDate = format(
              new Date(entry.session.startedAt),
              "MMM d, yyyy h:mm a",
            );

            const sets = entry.sets;
            const maxWeight = sets.length > 0
              ? Math.max(
                  ...sets
                    .filter((s) => s.weight != null && !s.isWarmup)
                    .map((s) => s.weight as number),
                )
              : null;

            const maxReps = sets.length > 0
              ? Math.max(
                  ...sets
                    .filter((s) => s.reps != null)
                    .map((s) => s.reps as number),
                )
              : null;

            const totalVolume = sets
              .filter((s) => s.weight != null && s.reps != null)
              .reduce(
                (sum, s) => sum + (s.weight as number) * (s.reps as number),
                0,
              );

            return (
              <div
                key={entry.sessionExercise._id}
                className="rounded-md border"
              >
                <div className="flex items-center justify-between border-b px-3 py-2 bg-muted/30">
                  <span className="text-sm font-medium">{sessionDate}</span>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {maxWeight != null && (
                      <span>
                        Max: <span className="font-medium text-foreground">{maxWeight} kg</span>
                      </span>
                    )}
                    {maxReps != null && (
                      <span>
                        Reps: <span className="font-medium text-foreground">{maxReps}</span>
                      </span>
                    )}
                    {totalVolume > 0 && (
                      <span>
                        Vol:{" "}
                        <span className="font-medium text-foreground">
                          {totalVolume.toLocaleString()} kg
                        </span>
                      </span>
                    )}
                  </div>
                </div>
                <div className="p-2">
                  <div className="grid grid-cols-[1fr_1fr_1fr_1fr] gap-2 text-xs">
                    <span className="text-muted-foreground font-medium">Set</span>
                    <span className="text-muted-foreground font-medium">Reps</span>
                    <span className="text-muted-foreground font-medium">Weight</span>
                    <span className="text-muted-foreground font-medium">Effort</span>
                  </div>
                  {sets.map((set) => (
                    <div
                      key={set._id}
                      className="grid grid-cols-[1fr_1fr_1fr_1fr] gap-2 border-b py-1 text-xs last:border-b-0"
                    >
                      <span>{set.isWarmup ? "W" : set.setNumber}</span>
                      <span>{set.reps ?? "–"}</span>
                      <span>{set.weight != null ? `${set.weight} kg` : "–"}</span>
                      <span>
                        {set.effortLevel != null ? `${set.effortLevel}/10` : "–"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
