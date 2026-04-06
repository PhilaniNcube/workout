import Image from "next/image"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Id } from "@/convex/_generated/dataModel"
import { fetchAuthQuery } from "@/lib/auth-server"
import { api } from "@/convex/_generated/api"
import { notFound } from "next/navigation"

export default async function Exercise({
  paramsPromise,
}: {
  paramsPromise: Promise<{ id: string }>
}) {
  const { id } = await paramsPromise
  const exercise = await fetchAuthQuery(api.exercises.get, {
    exerciseId: id as Id<"exercises">,
  })

  if (exercise === null) {
    notFound()
  }

  const muscleGroup = exercise.muscleGroup
    ? await fetchAuthQuery(api.muscleGroups.getById, {
        muscleGroupId: exercise.muscleGroup,
      })
    : null

  return (
    <Card>
      <CardHeader>
        <CardTitle>{exercise.name}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          {muscleGroup && <span>Muscle group: {muscleGroup.name}</span>}
          {exercise.equipment && <span>Equipment: {exercise.equipment}</span>}
        </div>
        {muscleGroup?.illustrationUrl && (
          <Image
            src={muscleGroup.illustrationUrl}
            alt={`${muscleGroup.name} illustration`}
            width={400}
            height={400}
            unoptimized
            className="rounded-md"
          />
        )}
        {!muscleGroup && !exercise.equipment && (
          <p className="text-muted-foreground text-sm">
            No details added yet.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
