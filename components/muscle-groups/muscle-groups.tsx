"use client"

import { useQuery } from "convex/react"

import { api } from "@/convex/_generated/api"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import AddMuscleGroup from "@/components/muscle-groups/add-muscle-group"
import Link from "next/link"

export default function MuscleGroups() {
  const muscleGroups = useQuery(api.muscleGroups.list, {})

  return (
    <Card>
      <CardHeader>
        <CardTitle>Muscle Groups</CardTitle>
        <CardDescription>
          Organize your exercises by muscle group.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {muscleGroups === undefined ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-5 w-1/2" />
          </div>
        ) : muscleGroups.length === 0 ? (
          <p className="text-muted-foreground">
            No muscle groups yet. Add one to get started.
          </p>
        ) : (
          <ul className="flex flex-col gap-1">
            {muscleGroups.map((group) => (
              <Link
                href={`/dashboard/muscle-groups/${group._id}`}
                key={group._id}
                className="flex items-center justify-between rounded-none px-2 py-1.5 text-xs hover:bg-muted"
              >
                <span>{group.name}</span>
              </Link>
            ))}
          </ul>
        )}
      </CardContent>

      <CardFooter>
        <AddMuscleGroup />
      </CardFooter>
    </Card>
  )
}