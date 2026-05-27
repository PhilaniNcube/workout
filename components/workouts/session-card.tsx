"use client";

import { useActionState, useState, useEffect, useRef, useTransition } from "react";
import { useQuery } from "convex/react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import {
  Check,
  ChevronDown,
  ChevronsUpDown,
  Dumbbell,
  Plus,
  Trash2,
  Timer,
  Flag,
} from "lucide-react";

import {
  addExerciseWithSetAction,
  addSetAction,
  deleteSetAction,
  deleteSessionExerciseAction,
  finishSessionAction,
} from "@/actions/workout-sessions";
import { saveTemplateFromSessionAction } from "@/actions/templates";
import { api } from "@/convex/_generated/api";
import type { Id, Doc } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

type WorkoutSession = Doc<"workoutSessions">;

const addExerciseSchema = z.object({
  exerciseId: z.string().min(1, "Please select an exercise"),
  reps: z
    .string()
    .optional()
    .transform((val) => (val && val !== "" ? Number(val) : undefined))
    .pipe(z.number().int().min(1, "At least 1 rep").optional()),
  weight: z
    .string()
    .optional()
    .transform((val) => (val && val !== "" ? Number(val) : undefined))
    .pipe(z.number().min(0, "Weight cannot be negative").optional()),
  effortLevel: z
    .string()
    .optional()
    .transform((val) => (val && val !== "" ? Number(val) : undefined))
    .pipe(z.number().int().min(1, "Min 1").max(10, "Max 10").optional()),
  durationSeconds: z.string().optional(),
  distance: z.string().optional(),
  rir: z.string().optional(),
  isWarmup: z.boolean().optional(),
  notes: z
    .string()
    .trim()
    .max(500, "Notes must be 500 characters or fewer")
    .optional(),
});

const addExerciseFormSchema = z.object({
  exerciseId: z.string().min(1, "Please select an exercise"),
  reps: z.string().optional(),
  weight: z.string().optional(),
  effortLevel: z.string().optional(),
  durationSeconds: z.string().optional(),
  distance: z.string().optional(),
  rir: z.string().optional(),
  isWarmup: z.boolean().optional(),
  notes: z.string().trim().max(500, "Notes must be 500 characters or fewer").optional(),
});

type AddExerciseValues = z.infer<typeof addExerciseFormSchema>;

type AddExerciseState = {
  success: boolean;
  message: string | null;
};

const initialState: AddExerciseState = {
  success: false,
  message: null,
};

async function submitAddExercise(
  sessionId: Id<"workoutSessions">,
  _prevState: AddExerciseState,
  formData: FormData,
): Promise<AddExerciseState> {
  const values = {
    exerciseId: String(formData.get("exerciseId") ?? ""),
    reps: String(formData.get("reps") ?? ""),
    weight: String(formData.get("weight") ?? ""),
    effortLevel: String(formData.get("effortLevel") ?? ""),
    durationSeconds: String(formData.get("durationSeconds") ?? ""),
    distance: String(formData.get("distance") ?? ""),
    rir: String(formData.get("rir") ?? ""),
    isWarmup: formData.get("isWarmup") === "on",
    notes: String(formData.get("notes") ?? ""),
  };

  const parsed = addExerciseSchema.safeParse(values);
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    const firstError =
      fieldErrors.exerciseId?.[0] ??
      fieldErrors.reps?.[0] ??
      fieldErrors.weight?.[0] ??
      fieldErrors.effortLevel?.[0] ??
      "Invalid input.";
    return { success: false, message: firstError };
  }

  const notes =
    parsed.data.notes && parsed.data.notes !== "" ? parsed.data.notes : null;

  const result = await addExerciseWithSetAction(
    sessionId,
    parsed.data.exerciseId as Id<"exercises">,
    {
      reps: parsed.data.reps ?? null,
      weight: parsed.data.weight ?? null,
      effortLevel: parsed.data.effortLevel ?? null,
      durationSeconds: parsed.data.durationSeconds ? Number(parsed.data.durationSeconds) : null,
      distance: parsed.data.distance ? Number(parsed.data.distance) : null,
      rir: parsed.data.rir ? Number(parsed.data.rir) : null,
      isWarmup: parsed.data.isWarmup,
    },
    notes,
  );

  if (!result.success) {
    return { success: false, message: result.message };
  }

  return { success: true, message: "Set added." };
}

export default function SessionCard({ session }: { session: WorkoutSession }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedExerciseId, setExpandedExerciseId] = useState<Id<"workoutSessionExercises"> | null>(null);
  const [isFinishing, startFinishTransition] = useTransition();
  const isMobile = useIsMobile();

  const isFinished = session.endedAt != null;

  const sessionExercises = useQuery(
    api.workoutSessionExercises.listForSession,
    { sessionId: session._id },
  );

  const exercises = useQuery(api.exercises.list, {});
  const muscleGroups = useQuery(api.muscleGroups.list, {});

  const exerciseMap = new Map(
    exercises?.map((e) => [e._id, e]) ?? [],
  );

  const muscleGroupMap = new Map(
    muscleGroups?.map((mg) => [mg._id, mg]) ?? [],
  );

  const exercisesByGroup = (() => {
    if (!exercises) return [];
    const grouped = new Map<string, { label: string; exercises: typeof exercises }>();
    const ungrouped: typeof exercises = [];

    for (const ex of exercises) {
      if (ex.muscleGroup) {
        const mg = muscleGroupMap.get(ex.muscleGroup);
        const key = ex.muscleGroup;
        const group = grouped.get(key) ?? {
          label: mg?.name ?? "Unknown",
          exercises: [],
        };
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

  const boundSubmit = async (
    prevState: AddExerciseState,
    formData: FormData,
  ) => {
    const result = await submitAddExercise(session._id, prevState, formData);
    if (result.success) {
      setShowAddForm(false);
    }
    return result;
  };

  const [state, formAction, isPending] = useActionState(
    boundSubmit,
    initialState,
  );

  const {
    register,
    control,
    watch,
    clearErrors,
    setError,
    formState: { errors },
  } = useForm<AddExerciseValues>({
    resolver: zodResolver(addExerciseFormSchema),
    defaultValues: {
      exerciseId: "",
      reps: "",
      weight: "",
      effortLevel: "",
      durationSeconds: "",
      distance: "",
      rir: "",
      isWarmup: false,
      notes: "",
    },
  });

  const selectedExerciseId = watch("exerciseId");
  const selectedExercise = selectedExerciseId
    ? exerciseMap.get(selectedExerciseId as Id<"exercises">)
    : null;
  const selectedExerciseType = selectedExercise?.exerciseType ?? "strength";
  const isCardioExercise = selectedExerciseType === "cardio";

  const submitAction = async (formData: FormData) => {
    const parsed = addExerciseSchema.safeParse({
      exerciseId: String(formData.get("exerciseId") ?? ""),
      reps: String(formData.get("reps") ?? ""),
      weight: String(formData.get("weight") ?? ""),
      effortLevel: String(formData.get("effortLevel") ?? ""),
      durationSeconds: String(formData.get("durationSeconds") ?? ""),
      distance: String(formData.get("distance") ?? ""),
      rir: String(formData.get("rir") ?? ""),
      isWarmup: formData.get("isWarmup") === "on",
      notes: String(formData.get("notes") ?? ""),
    });

    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      if (fieldErrors.exerciseId?.[0]) {
        setError("exerciseId", {
          type: "manual",
          message: fieldErrors.exerciseId[0],
        });
      }
      if (fieldErrors.reps?.[0]) {
        setError("reps", { type: "manual", message: fieldErrors.reps[0] });
      }
      if (fieldErrors.weight?.[0]) {
        setError("weight", { type: "manual", message: fieldErrors.weight[0] });
      }
      if (fieldErrors.effortLevel?.[0]) {
        setError("effortLevel", { type: "manual", message: fieldErrors.effortLevel[0] });
      }
      return;
    }

    clearErrors();
    formAction(formData);
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          type="button"
          className={cn(
            "w-full rounded-md px-3 py-3 text-left text-sm transition-colors min-h-[44px]",
            isFinished
              ? "bg-muted/40 text-muted-foreground hover:bg-muted/60"
              : "bg-primary/10 text-primary hover:bg-primary/20",
          )}
        >
          <span className="font-medium">
            {format(new Date(session.startedAt), "h:mm a")}
          </span>
          {isFinished && (
            <span className="ml-2 text-xs text-green-600 font-medium">
              Done
            </span>
          )}
          {sessionExercises && sessionExercises.length > 0 && (
            <div className="mt-1 space-y-0.5">
              {sessionExercises.map((se) => {
                const exercise = exerciseMap.get(se.exerciseId);
                return (
                  <p key={se._id} className="text-muted-foreground truncate text-xs">
                    {exercise?.name ?? "Unknown"}
                  </p>
                );
              })}
            </div>
          )}
          {session.notes && (
            <p className="text-muted-foreground mt-1 truncate text-xs italic">
              {session.notes}
            </p>
          )}
        </button>
      </SheetTrigger>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <div className="flex items-start justify-between">
            <div>
              <SheetTitle>
                Session – {format(new Date(session.startedAt), "MMM d, h:mm a")}
                {isFinished && (
                  <span className="ml-2 inline-flex items-center rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    Finished {session.endedAt ? format(new Date(session.endedAt), "h:mm a") : ""}
                  </span>
                )}
              </SheetTitle>
              <SheetDescription>
                {session.notes ?? "No notes for this session."}
              </SheetDescription>
              {session.perceivedEffort != null && (
                <p className="text-muted-foreground mt-1 text-xs">
                  Perceived effort: {session.perceivedEffort}/10
                </p>
              )}
            </div>
            {!isFinished && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0"
                disabled={isFinishing}
                onClick={() => {
                  startFinishTransition(async () => {
                    await finishSessionAction(session._id);
                  });
                }}
              >
                <Flag className="mr-1 h-3.5 w-3.5" />
                {isFinishing ? "Ending..." : "End Workout"}
              </Button>
            )}
          </div>
        </SheetHeader>

        {isFinished && sessionExercises && sessionExercises.length > 0 && (
          <SaveTemplateForm sessionId={session._id} />
        )}

        <div className="space-y-4 px-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Exercises</h4>
              {!isFinished && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddForm((prev) => !prev)}
                >
                  <Plus className="mr-1 h-3 w-3" />
                  Add
                </Button>
              )}
            </div>

            {sessionExercises === undefined ? (
              <p className="text-muted-foreground text-xs">Loading...</p>
            ) : sessionExercises.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No exercises yet. Add one to get started.
              </p>
            ) : (
              <div className="space-y-1">
                {sessionExercises.map((se, index) => {
                  const exercise = exerciseMap.get(se.exerciseId);
                  const isExpanded = expandedExerciseId === se._id;
                  return (
                    <SessionExerciseItem
                      key={se._id}
                      sessionExercise={se}
                      exerciseName={exercise?.name ?? "Unknown exercise"}
                      exerciseType={exercise?.exerciseType ?? "strength"}
                      index={index}
                      isExpanded={isExpanded}
                      isSessionFinished={isFinished}
                      onToggle={() =>
                        setExpandedExerciseId(isExpanded ? null : se._id)
                      }
                    />
                  );
                })}
              </div>
            )}
          </div>

          {showAddForm && !isFinished && (
            <form
              action={submitAction}
              noValidate
              className="space-y-3 rounded-md border p-3"
            >
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="session-exercise-id">
                    Exercise
                  </FieldLabel>
                  <Controller
                    name="exerciseId"
                    control={control}
                    render={({ field }) => (
                      <ExerciseCombobox
                        value={field.value}
                        onChange={field.onChange}
                        exercisesByGroup={exercisesByGroup}
                        exerciseMap={exerciseMap}
                        disabled={isPending}
                        isMobile={isMobile}
                        hasError={!!errors.exerciseId}
                      />
                    )}
                  />
                  <FieldError>{errors.exerciseId?.message}</FieldError>
                </Field>

                <div className="grid grid-cols-3 gap-2">
                  {isCardioExercise ? (
                    <>
                      <Field>
                        <FieldLabel htmlFor="session-exercise-dur">Duration (s)</FieldLabel>
                        <Input
                          id="session-exercise-dur"
                          type="number"
                          min={0}
                          placeholder="e.g. 1800"
                          disabled={isPending}
                          {...register("durationSeconds")}
                        />
                      </Field>

                      <Field>
                        <FieldLabel htmlFor="session-exercise-dist">Distance (km)</FieldLabel>
                        <Input
                          id="session-exercise-dist"
                          type="number"
                          min={0}
                          step="0.1"
                          placeholder="e.g. 5.0"
                          disabled={isPending}
                          {...register("distance")}
                        />
                      </Field>

                      <Field>
                        <FieldLabel htmlFor="session-exercise-effort">
                          Effort (1–10)
                        </FieldLabel>
                        <Input
                          id="session-exercise-effort"
                          type="number"
                          min={1}
                          max={10}
                          placeholder="e.g. 7"
                          aria-invalid={errors.effortLevel ? true : undefined}
                          disabled={isPending}
                          {...register("effortLevel")}
                        />
                        <FieldError>{errors.effortLevel?.message}</FieldError>
                      </Field>
                    </>
                  ) : (
                    <>
                      <Field>
                        <FieldLabel htmlFor="session-exercise-reps">Reps</FieldLabel>
                        <Input
                          id="session-exercise-reps"
                          type="number"
                          min={1}
                          placeholder="e.g. 10"
                          aria-invalid={errors.reps ? true : undefined}
                          disabled={isPending}
                          {...register("reps")}
                        />
                        <FieldError>{errors.reps?.message}</FieldError>
                      </Field>

                      <Field>
                        <FieldLabel htmlFor="session-exercise-weight">
                          Weight (kg)
                        </FieldLabel>
                        <Input
                          id="session-exercise-weight"
                          type="number"
                          min={0}
                          step="0.5"
                          placeholder="e.g. 60"
                          aria-invalid={errors.weight ? true : undefined}
                          disabled={isPending}
                          {...register("weight")}
                        />
                        <FieldError>{errors.weight?.message}</FieldError>
                      </Field>

                      <Field>
                        <FieldLabel htmlFor="session-exercise-effort">
                          Effort (1–10)
                        </FieldLabel>
                        <Input
                          id="session-exercise-effort"
                          type="number"
                          min={1}
                          max={10}
                          placeholder="e.g. 7"
                          aria-invalid={errors.effortLevel ? true : undefined}
                          disabled={isPending}
                          {...register("effortLevel")}
                        />
                        <FieldError>{errors.effortLevel?.message}</FieldError>
                      </Field>
                    </>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {!isCardioExercise && (
                    <>
                      <Field>
                        <FieldLabel htmlFor="session-exercise-dur">Duration (s)</FieldLabel>
                        <Input
                          id="session-exercise-dur"
                          type="number"
                          min={0}
                          placeholder="e.g. 60"
                          disabled={isPending}
                          {...register("durationSeconds")}
                        />
                      </Field>

                      <Field>
                        <FieldLabel htmlFor="session-exercise-dist">Distance</FieldLabel>
                        <Input
                          id="session-exercise-dist"
                          type="number"
                          min={0}
                          step="0.1"
                          placeholder="e.g. 5.0"
                          disabled={isPending}
                          {...register("distance")}
                        />
                      </Field>

                      <Field>
                        <FieldLabel htmlFor="session-exercise-rir">RIR</FieldLabel>
                        <Input
                          id="session-exercise-rir"
                          type="number"
                          min={0}
                          max={20}
                          placeholder="e.g. 2"
                          disabled={isPending}
                          {...register("rir")}
                        />
                      </Field>
                    </>
                  )}
                </div>

                {!isCardioExercise && (
                  <div className="flex items-center gap-2">
                    <Controller
                      name="isWarmup"
                      control={control}
                      render={({ field }) => (
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="session-exercise-warmup"
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={isPending}
                          />
                          <Label htmlFor="session-exercise-warmup" className="text-sm cursor-pointer">
                            Warmup set
                          </Label>
                        </div>
                      )}
                    />
                  </div>
                )}

                <Field>
                  <FieldLabel htmlFor="session-exercise-notes">
                    Notes (optional)
                  </FieldLabel>
                  <Input
                    id="session-exercise-notes"
                    placeholder="e.g. Go heavier this time"
                    disabled={isPending}
                    {...register("notes")}
                  />
                  <FieldError>{errors.notes?.message}</FieldError>
                </Field>

                {state.message && (
                  <FieldError
                    className={state.success ? "text-green-600" : undefined}
                  >
                    {state.message}
                  </FieldError>
                )}
              </FieldGroup>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isPending}
                  onClick={() => setShowAddForm(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isPending}>
                  {isPending ? "Adding..." : "Add set"}
                </Button>
              </div>
            </form>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ── Rest Timer Component ── */

function RestTimer({ restSeconds }: { restSeconds: number }) {
  const [remaining, setRemaining] = useState(restSeconds);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    if (restSeconds <= 0) return;

    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [restSeconds]);

  if (restSeconds <= 0) return null;

  const progress = remaining / restSeconds;
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const displayTime = `${minutes}:${seconds.toString().padStart(2, "0")}`;
  const isComplete = remaining === 0;

  return (
    <div className={cn(
      "rounded-md p-2 text-center transition-colors",
      isComplete ? "bg-green-100 dark:bg-green-900/20" : "bg-primary/5",
    )}>
      <div className="flex items-center justify-center gap-1.5">
        <Timer className={cn(
          "h-3.5 w-3.5",
          isComplete ? "text-green-600" : "text-primary",
        )} />
        <span className={cn(
          "text-xs font-medium tabular-nums",
          isComplete ? "text-green-600" : "text-primary",
        )}>
          {isComplete ? "Rest Complete!" : `Rest: ${displayTime}`}
        </span>
      </div>
      <div className="mt-1 h-1 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-1000 ease-linear",
            isComplete ? "bg-green-500" : "bg-primary",
          )}
          style={{ width: `${100 - progress * 100}%` }}
        />
      </div>
    </div>
  );
}

/* ── Session Exercise Item (expandable with sets) ── */

const addSetSchema = z.object({
  reps: z
    .string()
    .optional()
    .transform((val) => (val && val !== "" ? Number(val) : undefined))
    .pipe(z.number().int().min(1, "At least 1 rep").optional()),
  weight: z
    .string()
    .optional()
    .transform((val) => (val && val !== "" ? Number(val) : undefined))
    .pipe(z.number().min(0, "Weight cannot be negative").optional()),
  effortLevel: z
    .string()
    .optional()
    .transform((val) => (val && val !== "" ? Number(val) : undefined))
    .pipe(z.number().int().min(1, "Min 1").max(10, "Max 10").optional()),
  durationSeconds: z.string().optional(),
  distance: z.string().optional(),
  rir: z.string().optional(),
  restSeconds: z.string().optional(),
  isWarmup: z.boolean().optional(),
});

const addSetFormSchema = z.object({
  reps: z.string().optional(),
  weight: z.string().optional(),
  effortLevel: z.string().optional(),
  durationSeconds: z.string().optional(),
  distance: z.string().optional(),
  rir: z.string().optional(),
  restSeconds: z.string().optional(),
  isWarmup: z.boolean().optional(),
});

type AddSetFormValues = z.infer<typeof addSetFormSchema>;

type AddSetState = {
  success: boolean;
  message: string | null;
};

const addSetInitialState: AddSetState = { success: false, message: null };

async function submitAddSet(
  sessionExerciseId: Id<"workoutSessionExercises">,
  setNumber: number,
  _prev: AddSetState,
  formData: FormData,
): Promise<AddSetState> {
  const values = {
    reps: String(formData.get("reps") ?? ""),
    weight: String(formData.get("weight") ?? ""),
    effortLevel: String(formData.get("effortLevel") ?? ""),
    durationSeconds: String(formData.get("durationSeconds") ?? ""),
    distance: String(formData.get("distance") ?? ""),
    rir: String(formData.get("rir") ?? ""),
    restSeconds: String(formData.get("restSeconds") ?? ""),
    isWarmup: formData.get("isWarmup") === "on",
  };
  const parsed = addSetSchema.safeParse(values);

  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors;
    return {
      success: false,
      message: fe.reps?.[0] ?? fe.weight?.[0] ?? fe.effortLevel?.[0] ?? "Invalid input.",
    };
  }

  const result = await addSetAction(sessionExerciseId, setNumber, {
    reps: parsed.data.reps ?? null,
    weight: parsed.data.weight ?? null,
    effortLevel: parsed.data.effortLevel ?? null,
    durationSeconds: parsed.data.durationSeconds ? Number(parsed.data.durationSeconds) : null,
    distance: parsed.data.distance ? Number(parsed.data.distance) : null,
    rir: parsed.data.rir ? Number(parsed.data.rir) : null,
    isWarmup: parsed.data.isWarmup,
  });

  if (!result.success) return { success: false, message: result.message };
  return { success: true, message: "Set added." };
}

function SessionExerciseItem({
  sessionExercise,
  exerciseName,
  exerciseType,
  index,
  isExpanded,
  isSessionFinished,
  onToggle,
}: {
  sessionExercise: Doc<"workoutSessionExercises">;
  exerciseName: string;
  exerciseType: string;
  index: number;
  isExpanded: boolean;
  isSessionFinished: boolean;
  onToggle: () => void;
}) {
  const isCardio = exerciseType === "cardio";
  const [showAddSet, setShowAddSet] = useState(false);
  const [isDeleting, startDeleteTransition] = useTransition();
  const [timerRest, setTimerRest] = useState<number>(0);

  const sets = useQuery(
    api.sets.listForSessionExercise,
    isExpanded
      ? { workoutSessionExerciseId: sessionExercise._id }
      : "skip",
  );

  const boundSubmitSet = async (prev: AddSetState, formData: FormData) => {
    const nextSetNumber = (sets?.length ?? 0) + 1;
    const result = await submitAddSet(
      sessionExercise._id,
      nextSetNumber,
      prev,
      formData,
    );
    if (result.success) {
      setShowAddSet(false);
      const restVal = formData.get("restSeconds");
      if (restVal && String(restVal) !== "") {
        setTimerRest(Number(restVal));
      }
    }
    return result;
  };

  const [setFormState, setFormAction, isSetPending] = useActionState(
    boundSubmitSet,
    addSetInitialState,
  );

  const {
    register: registerSet,
    clearErrors: clearSetErrors,
    setError: setSetError,
    formState: { errors: setErrors },
  } = useForm<AddSetFormValues>({
    resolver: zodResolver(addSetFormSchema),
    defaultValues: {
      reps: "", weight: "", effortLevel: "",
      durationSeconds: "", distance: "", rir: "", restSeconds: "",
      isWarmup: false,
    },
  });

  const submitSetAction = async (formData: FormData) => {
    const values = {
      reps: String(formData.get("reps") ?? ""),
      weight: String(formData.get("weight") ?? ""),
      effortLevel: String(formData.get("effortLevel") ?? ""),
      durationSeconds: String(formData.get("durationSeconds") ?? ""),
      distance: String(formData.get("distance") ?? ""),
      rir: String(formData.get("rir") ?? ""),
      restSeconds: String(formData.get("restSeconds") ?? ""),
      isWarmup: formData.get("isWarmup") === "on",
    };
    const parsed = addSetSchema.safeParse(values);
    if (!parsed.success) {
      const fe = parsed.error.flatten().fieldErrors;
      if (fe.reps?.[0])
        setSetError("reps", { type: "manual", message: fe.reps[0] });
      if (fe.weight?.[0])
        setSetError("weight", { type: "manual", message: fe.weight[0] });
      if (fe.effortLevel?.[0])
        setSetError("effortLevel", { type: "manual", message: fe.effortLevel[0] });
      return;
    }
    clearSetErrors();
    setFormAction(formData);
  };

  const hasExtraFields = sets?.some(
    (s) =>
      s.durationSeconds != null ||
      s.distance != null ||
      s.rir != null ||
      s.isWarmup,
  );

  return (
    <div className="rounded-md border">
      <div
        role="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-muted/50 min-h-[48px]"
      >
        <Dumbbell className="text-muted-foreground h-5 w-5 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{exerciseName}</p>
          {sessionExercise.notes && (
            <p className="text-muted-foreground truncate text-xs">
              {sessionExercise.notes}
            </p>
          )}
        </div>
        <span className="text-muted-foreground text-xs">
          #{index + 1}
        </span>
        {!isSessionFinished && (
          <button
            type="button"
            className="text-muted-foreground hover:text-destructive rounded p-2 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            disabled={isDeleting}
            onClick={(e) => {
              e.stopPropagation();
              startDeleteTransition(async () => {
                await deleteSessionExerciseAction(sessionExercise._id);
              });
            }}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
        <ChevronDown
          className={cn(
            "text-muted-foreground h-5 w-5 shrink-0 transition-transform",
            isExpanded && "rotate-180",
          )}
        />
      </div>

      {isExpanded && (
        <div className="border-t px-3 py-2">
          {sets === undefined ? (
            <p className="text-muted-foreground text-xs">Loading sets...</p>
          ) : sets.length === 0 ? (
            <p className="text-muted-foreground text-xs">No sets recorded.</p>
          ) : (
            <div className="mb-2">
              <div
                className={cn(
                  "text-muted-foreground grid gap-2 text-[10px] font-medium uppercase",
                  isCardio
                    ? "grid-cols-[1fr_1fr_1fr_1fr_auto]"
                    : hasExtraFields
                      ? "grid-cols-[1fr_0.8fr_0.8fr_0.7fr_0.7fr_0.5fr_0.5fr_auto]"
                      : "grid-cols-[1fr_1fr_1fr_1fr_auto]",
                )}
              >
                <span>{isCardio ? "Interval" : "Set"}</span>
                {isCardio ? (
                  <>
                    <span>Duration</span>
                    <span>Distance</span>
                    <span>Effort</span>
                  </>
                ) : (
                  <>
                    <span>Reps</span>
                    <span>Weight</span>
                    <span>Effort</span>
                    {hasExtraFields && (
                      <>
                        <span>RIR</span>
                        <span>Dur</span>
                        <span>Dist</span>
                      </>
                    )}
                  </>
                )}
                <span></span>
              </div>
              {sets.map((s) => (
                <div
                  key={s._id}
                  className={cn(
                    "grid gap-2 border-b py-1 text-xs last:border-b-0",
                    isCardio
                      ? "grid-cols-[1fr_1fr_1fr_1fr_auto]"
                      : hasExtraFields
                        ? "grid-cols-[1fr_0.8fr_0.8fr_0.7fr_0.7fr_0.5fr_0.5fr_auto]"
                        : "grid-cols-[1fr_1fr_1fr_1fr_auto]",
                    !isCardio && s.isWarmup && "text-muted-foreground italic",
                  )}
                >
                  <span>
                    {!isCardio && s.isWarmup ? "W" : s.setNumber}
                  </span>
                  {isCardio ? (
                    <>
                      <span>{s.durationSeconds != null ? `${Math.floor(s.durationSeconds / 60)}m ${s.durationSeconds % 60}s` : "–"}</span>
                      <span>{s.distance != null ? `${s.distance} km` : "–"}</span>
                      <span>{s.effortLevel != null ? `${s.effortLevel}/10` : "–"}</span>
                    </>
                  ) : (
                    <>
                      <span>{s.reps ?? "–"}</span>
                      <span>{s.weight != null ? `${s.weight} kg` : "–"}</span>
                      <span>{s.effortLevel != null ? `${s.effortLevel}/10` : "–"}</span>
                      {hasExtraFields && (
                        <>
                          <span>{s.rir != null ? s.rir : "–"}</span>
                          <span>{s.durationSeconds != null ? `${s.durationSeconds}s` : "–"}</span>
                          <span>{s.distance != null ? s.distance : "–"}</span>
                        </>
                      )}
                    </>
                  )}
                  {!isSessionFinished && (
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-destructive rounded p-2 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                      disabled={isDeleting}
                      onClick={() => {
                        startDeleteTransition(async () => {
                          await deleteSetAction(s._id);
                        });
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                  {isSessionFinished && <span />}
                </div>
              ))}
            </div>
          )}

          {timerRest > 0 && <RestTimer key={timerRest} restSeconds={timerRest} />}

          {showAddSet && !isSessionFinished ? (
            <form
              action={submitSetAction}
              noValidate
              className="mt-2 space-y-2 rounded border bg-muted/30 p-2"
            >
              <div className="grid grid-cols-3 gap-2">
                {isCardio ? (
                  <>
                    <Field>
                      <FieldLabel
                        htmlFor={`set-dur-${sessionExercise._id}`}
                        className="text-xs"
                      >
                        Duration (s)
                      </FieldLabel>
                      <Input
                        id={`set-dur-${sessionExercise._id}`}
                        type="number"
                        min={0}
                        placeholder="1800"
                        className="h-10 text-sm"
                        disabled={isSetPending}
                        {...registerSet("durationSeconds")}
                      />
                    </Field>
                    <Field>
                      <FieldLabel
                        htmlFor={`set-dist-${sessionExercise._id}`}
                        className="text-xs"
                      >
                        Distance (km)
                      </FieldLabel>
                      <Input
                        id={`set-dist-${sessionExercise._id}`}
                        type="number"
                        min={0}
                        step="0.1"
                        placeholder="5.0"
                        className="h-10 text-sm"
                        disabled={isSetPending}
                        {...registerSet("distance")}
                      />
                    </Field>
                    <Field>
                      <FieldLabel
                        htmlFor={`set-effort-${sessionExercise._id}`}
                        className="text-xs"
                      >
                        Effort (1–10)
                      </FieldLabel>
                      <Input
                        id={`set-effort-${sessionExercise._id}`}
                        type="number"
                        min={1}
                        max={10}
                        placeholder="7"
                        className="h-10 text-sm"
                        disabled={isSetPending}
                        {...registerSet("effortLevel")}
                      />
                      <FieldError>{setErrors.effortLevel?.message}</FieldError>
                    </Field>
                  </>
                ) : (
                  <>
                    <Field>
                      <FieldLabel
                        htmlFor={`set-reps-${sessionExercise._id}`}
                        className="text-xs"
                      >
                        Reps
                      </FieldLabel>
                      <Input
                        id={`set-reps-${sessionExercise._id}`}
                        type="number"
                        min={1}
                        placeholder="10"
                        className="h-10 text-sm"
                        disabled={isSetPending}
                        {...registerSet("reps")}
                      />
                      <FieldError>{setErrors.reps?.message}</FieldError>
                    </Field>
                    <Field>
                      <FieldLabel
                        htmlFor={`set-weight-${sessionExercise._id}`}
                        className="text-xs"
                      >
                        Weight (kg)
                      </FieldLabel>
                      <Input
                        id={`set-weight-${sessionExercise._id}`}
                        type="number"
                        min={0}
                        step="0.5"
                        placeholder="60"
                        className="h-10 text-sm"
                        disabled={isSetPending}
                        {...registerSet("weight")}
                      />
                      <FieldError>{setErrors.weight?.message}</FieldError>
                    </Field>
                    <Field>
                      <FieldLabel
                        htmlFor={`set-effort-${sessionExercise._id}`}
                        className="text-xs"
                      >
                        Effort (1–10)
                      </FieldLabel>
                      <Input
                        id={`set-effort-${sessionExercise._id}`}
                        type="number"
                        min={1}
                        max={10}
                        placeholder="7"
                        className="h-10 text-sm"
                        disabled={isSetPending}
                        {...registerSet("effortLevel")}
                      />
                      <FieldError>{setErrors.effortLevel?.message}</FieldError>
                    </Field>
                  </>
                )}
              </div>

              {!isCardio && (
                <div className="grid grid-cols-3 gap-2">
                  <Field>
                    <FieldLabel
                      htmlFor={`set-rir-${sessionExercise._id}`}
                      className="text-xs"
                    >
                      RIR
                    </FieldLabel>
                    <Input
                      id={`set-rir-${sessionExercise._id}`}
                      type="number"
                      min={0}
                      max={20}
                      placeholder="2"
                      className="h-10 text-sm"
                      disabled={isSetPending}
                      {...registerSet("rir")}
                    />
                  </Field>
                  <Field>
                    <FieldLabel
                      htmlFor={`set-dur-${sessionExercise._id}`}
                      className="text-xs"
                    >
                      Duration (s)
                    </FieldLabel>
                    <Input
                      id={`set-dur-${sessionExercise._id}`}
                      type="number"
                      min={0}
                      placeholder="60"
                      className="h-10 text-sm"
                      disabled={isSetPending}
                      {...registerSet("durationSeconds")}
                    />
                  </Field>
                  <Field>
                    <FieldLabel
                      htmlFor={`set-dist-${sessionExercise._id}`}
                      className="text-xs"
                    >
                      Distance
                    </FieldLabel>
                    <Input
                      id={`set-dist-${sessionExercise._id}`}
                      type="number"
                      min={0}
                      step="0.1"
                      placeholder="5.0"
                      className="h-10 text-sm"
                      disabled={isSetPending}
                      {...registerSet("distance")}
                    />
                  </Field>
                </div>
              )}

              <div className="flex items-center gap-3">
                <Field>
                  <FieldLabel
                    htmlFor={`set-rest-${sessionExercise._id}`}
                    className="text-xs"
                  >
                    Rest (s)
                  </FieldLabel>
                  <Input
                    id={`set-rest-${sessionExercise._id}`}
                    type="number"
                    min={0}
                    placeholder="90"
                    className="h-10 w-24 text-sm"
                    disabled={isSetPending}
                    {...registerSet("restSeconds")}
                  />
                </Field>

                {!isCardio && (
                  <div className="flex items-center gap-2 pt-4">
                    <Checkbox
                      id={`set-warmup-${sessionExercise._id}`}
                      disabled={isSetPending}
                      {...registerSet("isWarmup")}
                    />
                    <Label
                      htmlFor={`set-warmup-${sessionExercise._id}`}
                      className="text-sm cursor-pointer"
                    >
                      Warmup
                    </Label>
                  </div>
                )}
              </div>

              {setFormState.message && (
                <FieldError
                  className={
                    setFormState.success ? "text-green-600" : undefined
                  }
                >
                  {setFormState.message}
                </FieldError>
              )}
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 text-sm"
                  disabled={isSetPending}
                  onClick={() => setShowAddSet(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="h-10 text-sm"
                  disabled={isSetPending}
                >
                  {isSetPending ? "Adding..." : "Add set"}
                </Button>
              </div>
            </form>
          ) : (
            !isSessionFinished && (
              <Button
                type="button"
                variant="ghost"
                className="mt-2 h-10 w-full text-sm"
                onClick={() => setShowAddSet(true)}
              >
                <Plus className="mr-1 h-4 w-4" />
                Add set
              </Button>
            )
          )}
        </div>
      )}
    </div>
  );
}

/* ── Save as Template Form ── */

function SaveTemplateForm({ sessionId }: { sessionId: Id<"workoutSessions"> }) {
  const [show, setShow] = useState(false);
  const [name, setName] = useState("");
  const [saving, startSave] = useTransition();

  if (!show) {
    return (
      <div className="px-4">
        <Button
          type="button"
          variant="ghost"
          className="w-full h-10 text-sm"
          onClick={() => setShow(true)}
        >
          Save as template
        </Button>
      </div>
    );
  }

  return (
    <div className="px-4">
      <div className="flex items-center gap-2 rounded border p-2">
        <Input
          placeholder="Template name..."
          className="h-10 text-sm"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={saving}
        />
        <Button
          type="button"
          className="h-10 text-sm shrink-0"
          disabled={saving || !name.trim()}
          onClick={() => {
            startSave(async () => {
              await saveTemplateFromSessionAction(sessionId, name.trim());
              setShow(false);
              setName("");
            });
          }}
        >
          {saving ? "Saving..." : "Save"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="h-10 text-sm shrink-0"
          disabled={saving}
          onClick={() => setShow(false)}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}

/* ── Exercise Combobox ── */

type ExerciseComboboxProps = {
  value: string;
  onChange: (value: string) => void;
  exercisesByGroup: { label: string; exercises: Doc<"exercises">[] }[];
  exerciseMap: Map<Id<"exercises">, Doc<"exercises">>;
  disabled?: boolean;
  isMobile: boolean;
  hasError?: boolean;
};

function ExerciseCombobox({
  value,
  onChange,
  exercisesByGroup,
  exerciseMap,
  disabled,
  isMobile,
  hasError,
}: ExerciseComboboxProps) {
  const [open, setOpen] = useState(false);

  const selectedExercise = value
    ? exerciseMap.get(value as Id<"exercises">)
    : undefined;

  const handleSelect = (exerciseId: string) => {
    onChange(exerciseId);
    setOpen(false);
  };

  const commandList = (
    <Command>
      <CommandInput placeholder="Search exercises..." />
      <CommandList className="max-h-60 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/30">
        <CommandEmpty>No exercises found.</CommandEmpty>
        {exercisesByGroup.map((group) => (
          <CommandGroup key={group.label} heading={group.label}>
            {group.exercises.map((ex) => (
              <CommandItem
                key={ex._id}
                value={`${ex.name} ${group.label}`}
                onSelect={() => handleSelect(ex._id)}
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
  );

  const triggerButton = (
    <Button
      variant="outline"
      role="combobox"
      aria-expanded={open}
      aria-invalid={hasError ? true : undefined}
      className="w-full justify-between font-normal"
      disabled={disabled}
      type="button"
    >
      <span className="truncate">
        {selectedExercise ? selectedExercise.name : "Select an exercise"}
      </span>
      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
    </Button>
  );

  if (isMobile) {
    return (
      <>
        <input type="hidden" name="exerciseId" value={value} />
        <Drawer open={open} onOpenChange={setOpen}>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="w-full"
            disabled={disabled}
          >
            {triggerButton}
          </button>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Select exercise</DrawerTitle>
            </DrawerHeader>
            <div className="px-4 pb-4">
              <Command>
                <CommandInput placeholder="Search exercises..." />
                <CommandList className="max-h-[50vh] overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/30">
                  <CommandEmpty>No exercises found.</CommandEmpty>
                  {exercisesByGroup.map((group) => (
                    <CommandGroup key={group.label} heading={group.label}>
                      {group.exercises.map((ex) => (
                        <CommandItem
                          key={ex._id}
                          value={`${ex.name} ${group.label}`}
                          onSelect={() => handleSelect(ex._id)}
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
            </div>
          </DrawerContent>
        </Drawer>
      </>
    );
  }

  return (
    <>
      <input type="hidden" name="exerciseId" value={value} />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>{triggerButton}</PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          {commandList}
        </PopoverContent>
      </Popover>
    </>
  );
}
