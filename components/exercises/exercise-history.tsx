"use client";

import { useQuery } from "convex/react";
import { format } from "date-fns";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function estimate1RM(weight: number, reps: number): number {
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0) {
    return `${mins}m ${secs}s`;
  }
  return `${secs}s`;
}

export default function ExerciseHistory({
  exerciseId,
}: {
  exerciseId: Id<"exercises">;
}) {
  const history = useQuery(api.exercises.getHistory, { exerciseId });
  const exercise = useQuery(api.exercises.get, { exerciseId });

  if (history === undefined || exercise === undefined) {
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

  const isStrength = exercise?.exerciseType === "strength";
  const isCardio = exercise?.exerciseType === "cardio";

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
            const workingSets = sets.filter((s) => !s.isWarmup);

            if (isCardio) {
              const totalDuration = workingSets
                .filter((s) => s.durationSeconds != null)
                .reduce((sum, s) => sum + (s.durationSeconds as number), 0);

              const totalDistance = workingSets
                .filter((s) => s.distance != null)
                .reduce((sum, s) => sum + (s.distance as number), 0);

              const maxDuration = workingSets.length > 0
                ? Math.max(
                    ...workingSets
                      .filter((s) => s.durationSeconds != null)
                      .map((s) => s.durationSeconds as number),
                  )
                : null;

              const maxDistance = workingSets.length > 0
                ? Math.max(
                    ...workingSets
                      .filter((s) => s.distance != null)
                      .map((s) => s.distance as number),
                  )
                : null;

              return (
                <div
                  key={entry.sessionExercise._id}
                  className="rounded-md border"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2 bg-muted/30">
                    <span className="text-sm font-medium">{sessionDate}</span>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      {totalDuration > 0 && (
                        <span>
                          Total: <span className="font-medium text-foreground">{formatDuration(totalDuration)}</span>
                        </span>
                      )}
                      {totalDistance > 0 && (
                        <span>
                          Distance: <span className="font-medium text-foreground">{totalDistance} km</span>
                        </span>
                      )}
                      {maxDuration != null && (
                        <span>
                          Longest: <span className="font-medium text-foreground">{formatDuration(maxDuration)}</span>
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="p-2">
                    <div className="grid grid-cols-[1fr_1fr_1fr_1fr] gap-2 text-xs">
                      <span className="text-muted-foreground font-medium">Interval</span>
                      <span className="text-muted-foreground font-medium">Duration</span>
                      <span className="text-muted-foreground font-medium">Distance</span>
                      <span className="text-muted-foreground font-medium">Effort</span>
                    </div>
                    {sets.map((set) => (
                      <div
                        key={set._id}
                        className="grid grid-cols-[1fr_1fr_1fr_1fr] gap-2 border-b py-1 text-xs last:border-b-0"
                      >
                        <span>{set.setNumber}</span>
                        <span>{set.durationSeconds != null ? formatDuration(set.durationSeconds) : "–"}</span>
                        <span>{set.distance != null ? `${set.distance} km` : "–"}</span>
                        <span>
                          {set.effortLevel != null ? `${set.effortLevel}/10` : "–"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            }

            const maxWeight = workingSets.length > 0
              ? Math.max(
                  ...workingSets
                    .filter((s) => s.weight != null)
                    .map((s) => s.weight as number),
                )
              : null;

            const maxReps = workingSets.length > 0
              ? Math.max(
                  ...workingSets
                    .filter((s) => s.reps != null)
                    .map((s) => s.reps as number),
                )
              : null;

            const totalVolume = workingSets
              .filter((s) => s.weight != null && s.reps != null)
              .reduce(
                (sum, s) => sum + (s.weight as number) * (s.reps as number),
                0,
              );

            let bestEst1RM = 0;
            if (isStrength) {
              for (const s of workingSets) {
                if (s.weight != null && s.reps != null) {
                  const est = estimate1RM(s.weight, s.reps);
                  if (est > bestEst1RM) bestEst1RM = est;
                }
              }
            }

            return (
              <div
                key={entry.sessionExercise._id}
                className="rounded-md border"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2 bg-muted/30">
                  <span className="text-sm font-medium">{sessionDate}</span>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
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
                    {isStrength && bestEst1RM > 0 && (
                      <span>
                        Est 1RM:{" "}
                        <span className="font-medium text-foreground">
                          {bestEst1RM} kg
                        </span>
                      </span>
                    )}
                  </div>
                </div>
                <div className="p-2">
                  <div className={`grid gap-2 text-xs ${isStrength ? "grid-cols-[1fr_1fr_1fr_1fr_1fr]" : "grid-cols-[1fr_1fr_1fr_1fr]"}`}>
                    <span className="text-muted-foreground font-medium">Set</span>
                    <span className="text-muted-foreground font-medium">{isStrength ? "Reps" : "Reps"}</span>
                    <span className="text-muted-foreground font-medium">{isStrength ? "Weight" : "Duration"}</span>
                    <span className="text-muted-foreground font-medium">Effort</span>
                    {isStrength && <span className="text-muted-foreground font-medium">Est 1RM</span>}
                  </div>
                  {sets.map((set) => {
                    const setEst1RM =
                      isStrength && !set.isWarmup && set.weight != null && set.reps != null
                        ? estimate1RM(set.weight, set.reps)
                        : null;
                    return (
                      <div
                        key={set._id}
                        className={`grid gap-2 border-b py-1 text-xs last:border-b-0 ${isStrength ? "grid-cols-[1fr_1fr_1fr_1fr_1fr]" : "grid-cols-[1fr_1fr_1fr_1fr]"}`}
                      >
                        <span>{set.isWarmup ? "W" : set.setNumber}</span>
                        <span>{set.reps ?? "–"}</span>
                        <span>
                          {isStrength
                            ? (set.weight != null ? `${set.weight} kg` : "–")
                            : (set.durationSeconds != null ? formatDuration(set.durationSeconds) : "–")
                          }
                        </span>
                        <span>
                          {set.effortLevel != null ? `${set.effortLevel}/10` : "–"}
                        </span>
                        {isStrength && (
                          <span className="text-muted-foreground">
                            {setEst1RM != null ? `${setEst1RM} kg` : "–"}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
