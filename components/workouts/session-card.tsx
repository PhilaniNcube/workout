"use client"

import { useQuery } from "convex/react"
import { format } from "date-fns"
import Link from "next/link"

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

  return (
    <Link
      href={`/dashboard/workout-sessions/${session._id}`}
      className={cn(
        "block min-h-[44px] w-full rounded-md px-3 py-3 text-left text-sm transition-colors",
        isFinished
          ? "bg-muted/40 text-muted-foreground hover:bg-muted/60"
          : "bg-primary/10 text-primary hover:bg-primary/20"
      )}
    >
      <span className="font-medium">
        {format(new Date(session.startedAt), "h:mm a")}
      </span>
      {isFinished && (
        <span className="ml-2 text-xs font-medium text-green-600">Done</span>
      )}
      {sessionExercises && sessionExercises.length > 0 && (
        <div className="mt-1 space-y-0.5">
          {sessionExercises.map((se) => {
            const exercise = exerciseMap.get(se.exerciseId)
            return (
              <p
                key={se._id}
                className="truncate text-xs text-muted-foreground"
              >
                {exercise?.name ?? "Unknown"}
              </p>
            )
          })}
        </div>
      )}
      {session.notes && (
        <p className="mt-1 truncate text-xs text-muted-foreground italic">
          {session.notes}
        </p>
      )}
    </Link>
  )
}
