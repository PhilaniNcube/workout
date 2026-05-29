"use client"

import SessionDetail from "@/components/workouts/session-detail"
import type { Id } from "@/convex/_generated/dataModel"

export default function SessionDetailPage({
  sessionId,
}: {
  sessionId: string
}) {
  return <SessionDetail sessionId={sessionId as Id<"workoutSessions">} />
}
