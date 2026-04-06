"use client"

import { useQuery } from "convex/react"
import { format } from "date-fns"

import { api } from "@/convex/_generated/api"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

function formatRecordType(recordType: string) {
  return recordType
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

export default function PersonalBestsByMuscleGroupCard() {
  const groups = useQuery(api.personalRecords.listBestByMuscleGroup, {
    recordLimit: 300,
    limitPerGroup: 3,
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Personal Bests by Muscle Group</CardTitle>
        <CardDescription>
          Your top completed lifts and performance markers per muscle group.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {groups === undefined ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, idx) => (
              <Skeleton key={idx} className="h-14 w-full" />
            ))}
          </div>
        ) : groups.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No personal bests yet. Complete more workout sets to build your
            progression history.
          </p>
        ) : (
          <div className="space-y-4">
            {groups.map((group) => (
              <div
                key={group.muscleGroupName}
                className="rounded-md border border-border/60"
              >
                <div className="border-b px-3 py-2">
                  <h4 className="text-sm font-semibold">{group.muscleGroupName}</h4>
                </div>
                <div className="space-y-2 p-3">
                  {group.records.map((record) => (
                    <div
                      key={`${record.exerciseId}:${record.recordType}`}
                      className="flex items-start justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {record.exerciseName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatRecordType(record.recordType)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">{record.value}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(record.achievedAt), "MMM d, yyyy")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
