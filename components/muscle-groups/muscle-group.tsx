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
                <CardTitle>{muscleGroup.name}</CardTitle>
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
