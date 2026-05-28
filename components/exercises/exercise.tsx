import Image from "next/image"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import ExerciseHistory from "@/components/exercises/exercise-history"
import EstimatedOneRepMax from "@/components/exercises/estimated-1rm"
import EditExercise from "@/components/exercises/edit-exercise"
import type { Id } from "@/convex/_generated/dataModel"
import { fetchAuthQuery } from "@/lib/auth-server"
import { api } from "@/convex/_generated/api"
import { notFound } from "next/navigation"

function formatExerciseType(type: string): string {
  return type.charAt(0).toUpperCase() + type.slice(1)
}

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

  const isStrength = (exercise.exerciseType ?? "strength") === "strength"

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 md:grid-cols-[1fr_auto]">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <CardTitle>{exercise.name}</CardTitle>
              <EditExercise
                exerciseId={id as Id<"exercises">}
                exercise={{
                  name: exercise.name,
                  muscleGroup: exercise.muscleGroup ?? null,
                  equipment: exercise.equipment ?? null,
                  exerciseType: exercise.exerciseType ?? "strength",
                  machineNotes: exercise.machineNotes ?? null,
                  setupNotes: exercise.setupNotes ?? null,
                  photoUrl: exercise.photoUrl ?? null,
                  photoStorageId: exercise.photoStorageId ?? null,
                  isCompound: exercise.isCompound,
                }}
              />
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span className="rounded-full border px-2 py-0.5 text-xs font-medium">
                {formatExerciseType(exercise.exerciseType ?? "strength")}
              </span>
              {exercise.isCompound && (
                <span className="rounded-full border border-primary/40 px-2 py-0.5 text-xs font-medium text-primary">
                  Compound
                </span>
              )}
              {muscleGroup && <span>Muscle group: {muscleGroup.name}</span>}
              {exercise.equipment && (
                <span>Equipment: {exercise.equipment}</span>
              )}
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
            {exercise.photoUrl && (
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">
                  Machine photo
                </p>
                <Image
                  src={exercise.photoUrl}
                  alt={`${exercise.name} photo`}
                  width={400}
                  height={300}
                  unoptimized
                  className="rounded-md"
                />
              </div>
            )}
            {exercise.machineNotes && (
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">
                  Machine identification
                </p>
                <p className="rounded-md border bg-muted/30 p-2 text-sm whitespace-pre-wrap">
                  {exercise.machineNotes}
                </p>
              </div>
            )}
            {exercise.setupNotes && (
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">
                  Setup notes
                </p>
                <p className="rounded-md border bg-muted/30 p-2 text-sm whitespace-pre-wrap">
                  {exercise.setupNotes}
                </p>
              </div>
            )}
            {!muscleGroup &&
              !exercise.equipment &&
              !exercise.machineNotes &&
              !exercise.setupNotes &&
              !exercise.photoUrl && (
                <p className="text-sm text-muted-foreground">
                  No details added yet.
                </p>
              )}
          </CardContent>
        </Card>
        {isStrength && (
          <EstimatedOneRepMax exerciseId={id as Id<"exercises">} />
        )}
      </div>
      <ExerciseHistory exerciseId={id as Id<"exercises">} />
    </div>
  )
}
