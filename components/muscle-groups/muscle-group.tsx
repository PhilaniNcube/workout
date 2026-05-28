import Image from "next/image"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Id } from "@/convex/_generated/dataModel"
import { fetchAuthQuery } from "@/lib/auth-server"
import { api } from "@/convex/_generated/api"
import { notFound } from "next/navigation"
import UpdateMuscleGroup from "@/components/muscle-groups/update-muscle-group"

export default async function MuscleGroup({
  paramsPromise,
}: {
  paramsPromise: Promise<{ id: string }>
}) {
  const { id } = await paramsPromise
  const muscleGroup = await fetchAuthQuery(api.muscleGroups.getById, {
    muscleGroupId: id as Id<"muscleGroups">,
  })

  if (muscleGroup === null) {
    notFound()
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>{muscleGroup.name}</CardTitle>
          {(muscleGroup.category || muscleGroup.region) && (
            <div className="mt-1 flex gap-1">
              {muscleGroup.category && (
                <span className="rounded-full border px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  {muscleGroup.category}
                </span>
              )}
              {muscleGroup.region && (
                <span className="rounded-full border px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  {muscleGroup.region}
                </span>
              )}
            </div>
          )}
        </div>
        <UpdateMuscleGroup muscleGroup={muscleGroup} />
      </CardHeader>
      <CardContent>
        {muscleGroup.illustrationUrl ? (
          <Image
            src={muscleGroup.illustrationUrl}
            alt={`${muscleGroup.name} illustration`}
            width={400}
            height={400}
            unoptimized
            className="rounded-md"
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            No illustration uploaded yet.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
