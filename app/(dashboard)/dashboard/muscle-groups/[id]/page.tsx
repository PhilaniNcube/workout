import { Suspense } from "react"
import MuscleGroup from "@/components/muscle-groups/muscle-group"


export default function MuscleGroupPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {


  return (
    <Suspense fallback={<div className="py-12 text-center text-sm text-muted-foreground">Loading muscle group...</div>}>
      <MuscleGroup paramsPromise={params} />
    </Suspense>
  )
}