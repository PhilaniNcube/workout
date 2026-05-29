import { Suspense } from "react"
import Exercise from "@/components/exercises/exercise"



export default function ExercisePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  return (
    <Suspense fallback={<div className="py-12 text-center text-sm text-muted-foreground">Loading exercise...</div>}>
      <Exercise paramsPromise={params} />
    </Suspense>
  )
}
