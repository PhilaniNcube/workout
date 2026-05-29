import { Suspense } from "react"
import SessionDetailPage from "./session-detail-client"

export default function WorkoutSessionPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  return (
    <Suspense fallback={<div className="py-12 text-center text-sm text-muted-foreground">Loading session...</div>}>
      <SessionContent paramsPromise={params} />
    </Suspense>
  )
}

async function SessionContent({
  paramsPromise,
}: {
  paramsPromise: Promise<{ id: string }>
}) {
  const { id } = await paramsPromise
  return <SessionDetailPage sessionId={id} />
}
