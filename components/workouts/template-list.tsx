"use client";

import { useQuery, useMutation } from "convex/react";
import { startTransition, useState } from "react";
import { Bookmark, Trash2, Play } from "lucide-react";

import { api } from "@/convex/_generated/api";
import type { Id, Doc } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { startFromTemplateAction } from "@/actions/templates";

export default function TemplateList() {
  const templates = useQuery(api.workoutTemplates.list, {});
  const exercises = useQuery(api.exercises.list, {});
  const deleteTemplate = useMutation(api.workoutTemplates.remove);

  const [startingId, setStartingId] = useState<string | null>(null);

  const exerciseMap = new Map(exercises?.map((e) => [e._id, e]) ?? []);

  const handleStart = (templateId: Id<"workoutTemplates">) => {
    setStartingId(templateId);
    startTransition(async () => {
      await startFromTemplateAction(templateId);
      setStartingId(null);
    });
  };

  if (templates === undefined) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Templates</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (templates.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Templates</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {templates.map((t) => (
            <TemplateItem
              key={t._id}
              template={t}
              exerciseMap={exerciseMap}
              isStarting={startingId === t._id}
              onStart={() => handleStart(t._id)}
              onDelete={() => deleteTemplate({ templateId: t._id })}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function TemplateItem({
  template,
  exerciseMap,
  isStarting,
  onStart,
  onDelete,
}: {
  template: Doc<"workoutTemplates">;
  exerciseMap: Map<Id<"exercises">, Doc<"exercises">>;
  isStarting: boolean;
  onStart: () => void;
  onDelete: () => void;
}) {
  const details = useQuery(api.workoutTemplates.getWithExercises, {
    templateId: template._id,
  });

  return (
    <div className="flex items-center gap-3 rounded-md border p-3">
      <Bookmark className="text-muted-foreground h-4 w-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{template.name}</p>
        {details ? (
          <p className="text-muted-foreground truncate text-xs">
            {details.exercises
              .map((e) => exerciseMap.get(e.exerciseId)?.name ?? "—")
              .join(", ")}
          </p>
        ) : (
          <p className="text-muted-foreground text-xs">Loading...</p>
        )}
        {template.notes && (
          <p className="text-muted-foreground truncate text-xs italic">
            {template.notes}
          </p>
        )}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-7 shrink-0 text-[10px]"
        disabled={isStarting}
        onClick={onStart}
      >
        <Play className="mr-1 h-3 w-3" />
        {isStarting ? "Starting..." : "Start"}
      </Button>
      <button
        type="button"
        className="text-muted-foreground hover:text-destructive rounded p-1 transition-colors shrink-0"
        onClick={onDelete}
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  );
}
