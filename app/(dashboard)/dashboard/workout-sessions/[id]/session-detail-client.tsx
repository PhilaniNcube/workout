"use client"

import { use } from "react"
import SessionDetail from "@/components/workouts/session-detail"
import type { Id } from "@/convex/_generated/dataModel"

export default function SessionDetailPage({
  paramsPromise,
}: {
  paramsPromise: Promise<{ id: string }>
}) {
  const { id } = use(paramsPromise)
  return <SessionDetail sessionId={id as Id<"workoutSessions">} />
}
