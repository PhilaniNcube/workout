"use client"

import Link from "next/link"
import { useQuery } from "convex/react"

import { api } from "@/convex/_generated/api"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function ExercisesList() {
  const exercises = useQuery(api.exercises.list, {})
  const muscleGroups = useQuery(api.muscleGroups.list, {})

  if (exercises === undefined || muscleGroups === undefined) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (exercises.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No exercises yet. Add one to get started.
      </p>
    )
  }

  const exercisesByMuscleGroup = new Map<string, typeof exercises>()
  for (const exercise of exercises) {
    if (!exercise.muscleGroup) {
      continue
    }

    const existingExercises = exercisesByMuscleGroup.get(exercise.muscleGroup) ?? []
    exercisesByMuscleGroup.set(exercise.muscleGroup, [...existingExercises, exercise])
  }

  const groupedExercises = muscleGroups
    .map((muscleGroup) => ({
      id: muscleGroup._id,
      title: muscleGroup.name,
      exercises: exercisesByMuscleGroup.get(muscleGroup._id) ?? [],
    }))
    .filter((group) => group.exercises.length > 0)
    .map((group) => ({
      ...group,
      description: `${group.exercises.length} exercise${
        group.exercises.length === 1
          ? ""
          : "s"
      }`,
    }))

  const uncategorizedExercises = exercises.filter((exercise) => !exercise.muscleGroup)

  const exerciseGroups = uncategorizedExercises.length
    ? [
        ...groupedExercises,
        {
          id: "uncategorized",
          title: "Uncategorized",
          description: `${uncategorizedExercises.length} exercise${
            uncategorizedExercises.length === 1 ? "" : "s"
          }`,
          exercises: uncategorizedExercises,
        },
      ]
    : groupedExercises

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {exerciseGroups.map((group) => (
        <Card key={group.id} size="sm">
          <CardHeader className="border-b">
            <CardTitle>{group.title}</CardTitle>
            <CardDescription>{group.description}</CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <ul className="divide-border divide-y">
              {group.exercises.map((exercise) => (
                <li key={exercise._id}>
                  <Link
                    href={`/dashboard/exercises/${exercise._id}`}
                    className="hover:bg-muted flex items-center justify-between gap-4 px-4 py-3 transition-colors group-data-[size=sm]/card:px-3"
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-medium">{exercise.name}</span>
                      {exercise.equipment ? (
                        <span className="text-muted-foreground text-xs">
                          {exercise.equipment}
                        </span>
                      ) : null}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
