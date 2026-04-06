import Exercise from "@/components/exercises/exercise"



export default async function ExercisePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  return (
    <Exercise paramsPromise={params} />
  )
}
