"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { format } from "date-fns";
import { Trophy, Medal, Search } from "lucide-react";

import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const RECORD_TYPE_LABELS: Record<string, string> = {
  max_weight: "Max Weight (kg)",
  max_reps: "Max Reps",
};

function formatRecordType(recordType: string) {
  return (
    RECORD_TYPE_LABELS[recordType] ??
    recordType
      .split(/[_\s-]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ")
  );
}

export default function PersonalRecordsPage() {
  const records = useQuery(api.personalRecords.listAll, {});
  const exercises = useQuery(api.exercises.list, {});
  const muscleGroups = useQuery(api.muscleGroups.list, {});

  const [filter, setFilter] = useState("");
  const [filterType, setFilterType] = useState<string | null>(null);

  const exerciseMap = new Map(exercises?.map((e) => [e._id, e]) ?? []);
  const muscleGroupMap = new Map(
    muscleGroups?.map((m) => [m._id, m]) ?? [],
  );

  const recordTypes = records
    ? [...new Set(records.map((r) => r.recordType))]
    : [];

  const filtered =
    records?.filter((r) => {
      if (filterType && r.recordType !== filterType) return false;
      if (filter) {
        const ex = exerciseMap.get(r.exerciseId);
      const mgId = ex?.muscleGroup;
      const mgName = mgId
        ? (muscleGroupMap.get(mgId)?.name?.toLowerCase() ?? "")
        : "";
      const exName = ex?.name?.toLowerCase() ?? "";
      const query = filter.toLowerCase();
      if (!exName.includes(query) && !mgName.includes(query)) return false;
      }
      return true;
    }) ?? [];

  type Grouped = {
    muscleGroupName: string;
    items: (Doc<"personalRecords"> & {
      exerciseName: string;
    })[];
  };

  const grouped = (() => {
    const map = new Map<string, Grouped>();
    for (const record of filtered) {
      const ex = exerciseMap.get(record.exerciseId);
      if (!ex) continue;
      const mgId = ex.muscleGroup;
      const mgName = mgId
        ? (muscleGroupMap.get(mgId)?.name ?? "Uncategorized")
        : "Uncategorized";

      let group = map.get(mgName);
      if (!group) {
        group = { muscleGroupName: mgName, items: [] };
        map.set(mgName, group);
      }

      group.items.push({
        ...record,
        exerciseName: ex.name,
      });
    }

    return Array.from(map.values()).sort((a, b) =>
      a.muscleGroupName.localeCompare(b.muscleGroupName),
    );
  })();

  if (records === undefined) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-bold tracking-tight">Personal Records</h1>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex w-full items-start justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Personal Records</h1>
      </div>

      {records.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Trophy className="text-muted-foreground mx-auto mb-3 h-12 w-12" />
            <h2 className="text-lg font-semibold">No Records Yet</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Complete workout sets to start building your personal bests.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-48">
              <Search className="text-muted-foreground absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2" />
              <Input
                placeholder="Search exercises..."
                className="pl-8"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
            </div>

            <div className="flex gap-1">
              <Button
                variant={filterType === null ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterType(null)}
              >
                All
              </Button>
              {recordTypes.map((rt) => (
                <Button
                  key={rt}
                  variant={filterType === rt ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterType(rt)}
                >
                  {formatRecordType(rt).split(" ").pop()}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            {grouped.map((group) => (
              <Card key={group.muscleGroupName}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    {group.muscleGroupName}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="divide-y">
                    {group.items.map((record) => (
                      <div
                        key={record._id}
                        className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                      >
                        <div className="flex items-center gap-3">
                          <Medal
                            className={cn(
                              "h-5 w-5 shrink-0",
                              record.recordType === "max_weight"
                                ? "text-amber-500"
                                : "text-blue-500",
                            )}
                          />
                          <div>
                            <p className="font-medium">{record.exerciseName}</p>
                            <p className="text-muted-foreground text-xs">
                              {formatRecordType(record.recordType)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold tabular-nums">
                            {record.value}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            {format(new Date(record.achievedAt), "MMM d, yyyy")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
