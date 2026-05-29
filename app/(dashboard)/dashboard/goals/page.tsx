"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import {
  Plus,
  Trash2,
  Target,
  CheckCircle2,
  Circle,
  ChevronsUpDown,
  Check,
} from "lucide-react";

import { api } from "@/convex/_generated/api";
import type { Id, Doc } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NumberStepper } from "@/components/ui/number-stepper";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const createGoalSchema = z.object({
  type: z.string().trim().min(1, "Goal type is required").max(200),
  exerciseId: z.string().optional(),
  targetValue: z
    .string()
    .min(1, "Target value is required")
    .refine((v) => !isNaN(Number(v)), "Must be a number"),
  targetDate: z.string().optional(),
});

type CreateGoalValues = z.infer<typeof createGoalSchema>;

function ExerciseSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const exercises = useQuery(api.exercises.list, {});
  const muscleGroups = useQuery(api.muscleGroups.list, {});

  const muscleGroupMap = new Map(
    muscleGroups?.map((m) => [m._id, m]) ?? [],
  );

  const exercisesByGroup = (() => {
    if (!exercises) return [];
    const grouped = new Map<string, { label: string; exercises: typeof exercises }>();
    const ungrouped: typeof exercises = [];

    for (const ex of exercises) {
      if (ex.muscleGroup) {
        const mg = muscleGroupMap.get(ex.muscleGroup);
        const key = ex.muscleGroup;
        const group = grouped.get(key) ?? { label: mg?.name ?? "Unknown", exercises: [] };
        group.exercises.push(ex);
        grouped.set(key, group);
      } else {
        ungrouped.push(ex);
      }
    }

    const result = Array.from(grouped.values());
    if (ungrouped.length > 0) {
      result.push({ label: "Uncategorized", exercises: ungrouped });
    }
    return result;
  })();

  const [open, setOpen] = useState(false);
  const selected = value
    ? exercises?.find((e) => e._id === value)
    : undefined;

  return (
    <>
      <input type="hidden" name="exerciseId" value={value} />
      <Popover open={open} onOpenChange={(v) => setOpen(v)}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            className="w-full justify-between font-normal"
            type="button"
          >
            <span className="truncate">
              {selected ? selected.name : "Select exercise (optional)"}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search exercises..." />
            <CommandList className="max-h-60 overflow-y-auto">
              <CommandEmpty>No exercises found.</CommandEmpty>
              <CommandItem
                value="none"
                onSelect={() => {
                  onChange("");
                  setOpen(false);
                }}
              >
                <Check
                  className={cn("mr-2 h-4 w-4", !value ? "opacity-100" : "opacity-0")}
                />
                None
              </CommandItem>
              {exercisesByGroup.map((group) => (
                <CommandGroup key={group.label} heading={group.label}>
                  {group.exercises.map((ex) => (
                    <CommandItem
                      key={ex._id}
                      value={`${ex.name} ${group.label}`}
                      onSelect={() => {
                        onChange(ex._id);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === ex._id ? "opacity-100" : "opacity-0",
                        )}
                      />
                      {ex.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </>
  );
}

export default function GoalsPage() {
  const goals = useQuery(api.goals.list, {});
  const exercises = useQuery(api.exercises.list, {});
  const createGoal = useMutation(api.goals.create);
  const updateStatus = useMutation(api.goals.updateStatus);
  const removeGoal = useMutation(api.goals.remove);

  const [dialogOpen, setDialogOpen] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateGoalValues>({
    resolver: zodResolver(createGoalSchema),
    defaultValues: {
      type: "",
      exerciseId: "",
      targetValue: "",
      targetDate: "",
    },
  });

  const exerciseMap = new Map(exercises?.map((e) => [e._id, e]) ?? []);

  const onSubmit = async (data: CreateGoalValues) => {
    await createGoal({
      type: data.type,
      exerciseId: data.exerciseId && data.exerciseId !== "" ? (data.exerciseId as Id<"exercises">) : undefined,
      targetValue: Number(data.targetValue),
      targetDate: data.targetDate && data.targetDate !== "" ? new Date(data.targetDate).getTime() : undefined,
      status: "active",
    });
    reset();
    setDialogOpen(false);
  };

  const sortedGoals = goals
    ? [...goals].sort((a, b) => {
        if (a.status !== b.status) {
          return a.status === "active" ? -1 : 1;
        }
        return b.createdAt - a.createdAt;
      })
    : undefined;

  const activeGoals = sortedGoals?.filter((g) => g.status === "active") ?? [];
  const completedGoals = sortedGoals?.filter((g) => g.status !== "active") ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex w-full items-start justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Goals</h1>
        <Dialog open={dialogOpen} onOpenChange={(v) => setDialogOpen(v)}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-1 h-4 w-4" />
              New Goal
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Goal</DialogTitle>
              <DialogDescription>
                Set a fitness goal with a target value and optional deadline.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              <FieldGroup className="space-y-3">
                <Field>
                  <FieldLabel htmlFor="goal-type">Goal Type</FieldLabel>
                  <Input
                    id="goal-type"
                    placeholder="e.g. Bench Press 100kg, Lose 5kg, Run 10k"
                    {...register("type")}
                  />
                  <FieldError>{errors.type?.message}</FieldError>
                </Field>

                <Field>
                  <FieldLabel>Exercise (optional)</FieldLabel>
                  <Controller
                    name="exerciseId"
                    control={control}
                    render={({ field }) => (
                      <ExerciseSelect
                        value={field.value ?? ""}
                        onChange={field.onChange}
                      />
                    )}
                  />
                </Field>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="goal-target">Target Value</FieldLabel>
                    <NumberStepper
                      id="goal-target"
                      step={0.5}
                      placeholder="e.g. 100"
                      {...register("targetValue")}
                    />
                    <FieldError>{errors.targetValue?.message}</FieldError>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="goal-date">Target Date (optional)</FieldLabel>
                    <Input
                      id="goal-date"
                      type="date"
                      {...register("targetDate")}
                    />
                  </Field>
                </div>
              </FieldGroup>
              <DialogFooter className="mt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Create</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {goals === undefined ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : goals.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Target className="text-muted-foreground mx-auto mb-3 h-10 w-10" />
            <p className="text-muted-foreground">No goals set yet. Create your first goal to stay on track.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {activeGoals.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold">Active</h2>
              {activeGoals.map((goal) => (
                <GoalCard
                  key={goal._id}
                  goal={goal}
                  exerciseMap={exerciseMap}
                  onToggle={(id) => updateStatus({ goalId: id, status: "completed" })}
                  onRemove={(id) => removeGoal({ goalId: id })}
                />
              ))}
            </div>
          )}

          {completedGoals.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-muted-foreground text-lg font-semibold">Completed</h2>
              {completedGoals.map((goal) => (
                <GoalCard
                  key={goal._id}
                  goal={goal}
                  exerciseMap={exerciseMap}
                  onToggle={(id) => updateStatus({ goalId: id, status: "active" })}
                  onRemove={(id) => removeGoal({ goalId: id })}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function GoalCard({
  goal,
  exerciseMap,
  onToggle,
  onRemove,
}: {
  goal: Doc<"goals">;
  exerciseMap: Map<Id<"exercises">, Doc<"exercises">>;
  onToggle: (id: Id<"goals">) => void;
  onRemove: (id: Id<"goals">) => void;
}) {
  const isCompleted = goal.status !== "active";
  const exercise = goal.exerciseId ? exerciseMap.get(goal.exerciseId) : null;

  return (
    <Card className={cn(isCompleted && "opacity-70")}>
      <CardContent className="flex items-center gap-3 py-4">
        <button
          type="button"
          onClick={() => onToggle(goal._id)}
          className={cn(
            "mt-0.5 shrink-0 transition-colors min-h-11 min-w-11 flex items-center justify-center p-2 rounded-md hover:bg-muted/50",
            isCompleted
              ? "text-green-600 hover:text-green-700"
              : "text-muted-foreground hover:text-primary",
          )}
        >
          {isCompleted ? (
            <CheckCircle2 className="h-5 w-5" />
          ) : (
            <Circle className="h-5 w-5" />
          )}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className={cn("font-medium", isCompleted && "line-through")}>
              {goal.type}
            </p>
            <span className="text-sm font-semibold whitespace-nowrap tabular-nums">
              {goal.targetValue}
            </span>
          </div>
          <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
            {exercise && <span>{exercise.name}</span>}
            {goal.targetDate && (
              <span>
                by {format(new Date(goal.targetDate), "MMM d, yyyy")}
              </span>
            )}
            <span className="capitalize">{goal.status}</span>
          </div>
        </div>

        <button
          type="button"
          className="text-muted-foreground hover:text-destructive rounded-md p-2 min-h-11 min-w-11 flex items-center justify-center transition-colors hover:bg-muted/50"
          onClick={() => onRemove(goal._id)}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </CardContent>
    </Card>
  );
}
