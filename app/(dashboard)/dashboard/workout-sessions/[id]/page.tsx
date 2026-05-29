import SessionDetailPage from "./session-detail-client"

export default async function WorkoutSessionPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  return <SessionDetailPage paramsPromise={params} />
}
