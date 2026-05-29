import SessionDetailPage from "./session-detail-client"

export default async function WorkoutSessionPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <SessionDetailPage sessionId={id} />
}
