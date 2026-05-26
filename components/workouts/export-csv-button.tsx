"use client";

import { useQuery } from "convex/react";
import { format } from "date-fns";
import { Download } from "lucide-react";

import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";

function escapeCsv(val: string | number | null | undefined): string {
  if (val == null) return "";
  const s = String(val);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export default function ExportCsvButton() {
  const sessions = useQuery(api.workoutSessions.list, { limit: 100 });
  const exercises = useQuery(api.exercises.list, {});

  const exerciseMap = new Map(exercises?.map((e) => [e._id, e]) ?? []);

  const exportCsv = async () => {
    const { fetchAuthQuery } = await import("@/lib/auth-server");

    if (!sessions) return;

    const rows: string[][] = [
      [
        "Session Date",
        "Exercise",
        "Set #",
        "Reps",
        "Weight (kg)",
        "Effort (1-10)",
        "RIR",
        "Duration (s)",
        "Distance",
        "Warmup",
        "Rest (s)",
        "Session Notes",
      ],
    ];

    for (const session of sessions) {
      const sessionDate = format(new Date(session.startedAt), "yyyy-MM-dd HH:mm");

      try {
        const result = await fetchAuthQuery(api.workoutSessionExercises.listForSession, {
          sessionId: session._id,
        });

        for (const se of result) {
          const exercise = exerciseMap.get(se.exerciseId);
          const exerciseName = exercise?.name ?? "Unknown";

          try {
            const sets = await fetchAuthQuery(api.sets.listForSessionExercise, {
              workoutSessionExerciseId: se._id,
            });

            for (const s of sets as Doc<"sets">[]) {
              rows.push([
                sessionDate,
                escapeCsv(exerciseName),
                String(s.setNumber),
                s.reps != null ? String(s.reps) : "",
                s.weight != null ? String(s.weight) : "",
                s.effortLevel != null ? String(s.effortLevel) : "",
                s.rir != null ? String(s.rir) : "",
                s.durationSeconds != null ? String(s.durationSeconds) : "",
                s.distance != null ? String(s.distance) : "",
                s.isWarmup ? "Yes" : "No",
                s.restSeconds != null ? String(s.restSeconds) : "",
                escapeCsv(session.notes),
              ]);
            }
          } catch {
            continue;
          }
        }
      } catch {
        continue;
      }
    }

    const csv = rows.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `workout-export-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Button type="button" variant="outline" size="sm" onClick={exportCsv}>
      <Download className="mr-1 h-3.5 w-3.5" />
      Export CSV
    </Button>
  );
}
