"use client"

import { useQuery } from "convex/react"
import { format, differenceInMinutes } from "date-fns"
import Link from "next/link"
import { Clock, Dumbbell } from "lucide-react"

import { api } from "@/convex/_generated/api"
import type { Doc } from "@/convex/_generated/dataModel"
import { cn } from "@/lib/utils"

type WorkoutSession = Doc<"workoutSessions">

export default function SessionCard({ session }: { session: WorkoutSession }) {
  const isFinished = session.endedAt != null

  const sessionExercises = useQuery(
    api.workoutSessionExercises.listForSession,
    { sessionId: session._id }
  )

  const exercises = useQuery(api.exercises.list, {})
  const exerciseMap = new Map(exercises?.map((e) => [e._id, e]) ?? [])

  const durationMinutes =
    session.endedAt != null
      ? differenceInMinutes(new Date(session.endedAt), new Date(session.startedAt))
      : null

  const exerciseCount = sessionExercises?.length ?? null

  return (
    <Link
      href={`/dashboard/workout-sessions/${session._id}`}
      className={cn(
        "group block w-full rounded-lg px-3.5 py-3 text-left text-sm transition-all",
        isFinished
          ? "bg-muted/50 hover:bg-muted/80"
          : "bg-primary/10 ring-1 ring-primary/20 hover:bg-primary/15",
      )}
    >
      {/* Top row: time + badges */}
      <div className="flex items-center gap-2">
        <span className={cn(
          "font-semibold",
          isFinished ? "text-foreground" : "text-primary",
        )}>
          {format(new Date(session.startedAt), "h:mm a")}
        </span>

        {isFinished && (
          <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400">
            Done
          </span>
        )}

        {!isFinished && (
          <span className="inline-flex items-center rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
            In Progress
          </span>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Meta badges */}
        <div className="flex items-center gap-2.5 text-[11px] text-muted-foreground">
          {durationMinutes != null && durationMinutes > 0 && (
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {durationMinutes >= 60
                ? `${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}m`
                : `${durationMinutes}m`}
            </span>
          )}
          {exerciseCount != null && exerciseCount > 0 && (
            <span className="inline-flex items-center gap-1">
              <Dumbbell className="h-3 w-3" />
              {exerciseCount}
            </span>
          )}
        </div>
      </div>

      {/* Exercise list preview */}
      {sessionExercises && sessionExercises.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-x-1.5 gap-y-0.5">
          {sessionExercises.slice(0, 4).map((se) => {
            const exercise = exerciseMap.get(se.exerciseId)
            return (
              <span
                key={se._id}
                className="text-xs text-muted-foreground"
              >
                {exercise?.name ?? "Unknown"}
                {sessionExercises.indexOf(se) <
                  Math.min(sessionExercises.length, 4) - 1 && (
                  <span className="text-border"> · </span>
                )}
              </span>
            )
          })}
          {sessionExercises.length > 4 && (
            <span className="text-xs text-muted-foreground/60">
              +{sessionExercises.length - 4} more
            </span>
          )}
        </div>
      )}

      {/* Notes */}
      {session.notes && (
        <p className="mt-1 truncate text-xs text-muted-foreground/70 italic">
          {session.notes}
        </p>
      )}
    </Link>
  )
}
