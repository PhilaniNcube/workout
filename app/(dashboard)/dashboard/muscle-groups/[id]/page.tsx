import MuscleGroup from "@/components/muscle-groups/muscle-group"


export default async function MuscleGroupPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {


  return (
    <MuscleGroup paramsPromise={params} />
  )
}