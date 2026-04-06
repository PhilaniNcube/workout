"use client";

import { useActionState, useState, useTransition } from "react";
import { useQuery } from "convex/react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Check, ChevronDown, ChevronsUpDown, Dumbbell, Plus, Trash2 } from "lucide-react";

import { addExerciseWithSetAction, addSetAction, deleteSetAction, deleteSessionExerciseAction } from "@/actions/workout-sessions";
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
  const isMobile = useIsMobile();

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
      notes: "",
    },
  });

  const submitAction = async (formData: FormData) => {
    const parsed = addExerciseSchema.safeParse({
      exerciseId: String(formData.get("exerciseId") ?? ""),
      reps: String(formData.get("reps") ?? ""),
      weight: String(formData.get("weight") ?? ""),
      effortLevel: String(formData.get("effortLevel") ?? ""),
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
          className="bg-primary/10 text-primary w-full rounded-md px-2 py-1 text-left text-xs transition-colors hover:bg-primary/20"
        >
          <span className="font-medium">
            {format(new Date(session.startedAt), "h:mm a")}
          </span>
          {sessionExercises && sessionExercises.length > 0 && (
            <div className="mt-0.5 space-y-0.5">
              {sessionExercises.map((se) => {
                const exercise = exerciseMap.get(se.exerciseId);
                return (
                  <p key={se._id} className="text-muted-foreground truncate text-[10px]">
                    {exercise?.name ?? "Unknown"}
                  </p>
                );
              })}
            </div>
          )}
          {session.notes && (
            <p className="text-muted-foreground mt-0.5 truncate text-[10px] italic">
              {session.notes}
            </p>
          )}
        </button>
      </SheetTrigger>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            Session – {format(new Date(session.startedAt), "MMM d, h:mm a")}
          </SheetTitle>
          <SheetDescription>
            {session.notes ?? "No notes for this session."}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 px-4">
          {/* Session exercises list */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Exercises</h4>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowAddForm((prev) => !prev)}
              >
                <Plus className="mr-1 h-3 w-3" />
                Add
              </Button>
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
                      index={index}
                      isExpanded={isExpanded}
                      onToggle={() =>
                        setExpandedExerciseId(isExpanded ? null : se._id)
                      }
                    />
                  );
                })}
              </div>
            )}
          </div>

          {/* Add exercise form */}
          {showAddForm && (
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

                <div className="grid grid-cols-2 gap-3">
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
                </div>

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
});

const addSetFormSchema = z.object({
  reps: z.string().optional(),
  weight: z.string().optional(),
  effortLevel: z.string().optional(),
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
  const parsed = addSetSchema.safeParse({
    reps: String(formData.get("reps") ?? ""),
    weight: String(formData.get("weight") ?? ""),
    effortLevel: String(formData.get("effortLevel") ?? ""),
  });

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
  });

  if (!result.success) return { success: false, message: result.message };
  return { success: true, message: "Set added." };
}

function SessionExerciseItem({
  sessionExercise,
  exerciseName,
  index,
  isExpanded,
  onToggle,
}: {
  sessionExercise: Doc<"workoutSessionExercises">;
  exerciseName: string;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const [showAddSet, setShowAddSet] = useState(false);
  const [isDeleting, startDeleteTransition] = useTransition();

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
    if (result.success) setShowAddSet(false);
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
    defaultValues: { reps: "", weight: "", effortLevel: "" },
  });

  const submitSetAction = async (formData: FormData) => {
    const parsed = addSetSchema.safeParse({
      reps: String(formData.get("reps") ?? ""),
      weight: String(formData.get("weight") ?? ""),
      effortLevel: String(formData.get("effortLevel") ?? ""),
    });
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

  return (
    <div className="rounded-md border">
      <div
        role="button"
        onClick={onToggle}
        className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-muted/50"
      >
        <Dumbbell className="text-muted-foreground h-4 w-4 shrink-0" />
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
        <button
          type="button"
          className="text-muted-foreground hover:text-destructive rounded p-0.5 transition-colors"
          disabled={isDeleting}
          onClick={(e) => {
            e.stopPropagation();
            startDeleteTransition(async () => {
              await deleteSessionExerciseAction(sessionExercise._id);
            });
          }}
        >
          <Trash2 className="h-3 w-3" />
        </button>
        <ChevronDown
          className={cn(
            "text-muted-foreground h-4 w-4 shrink-0 transition-transform",
            isExpanded && "rotate-180",
          )}
        />
      </div>

      {isExpanded && (
        <div className="border-t px-3 py-2">
          {/* Sets table */}
          {sets === undefined ? (
            <p className="text-muted-foreground text-xs">Loading sets…</p>
          ) : sets.length === 0 ? (
            <p className="text-muted-foreground text-xs">No sets recorded.</p>
          ) : (
            <div className="mb-2">
              <div className="text-muted-foreground grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2 text-[10px] font-medium uppercase">
                <span>Set</span>
                <span>Reps</span>
                <span>Weight</span>
                <span>Effort</span>
                <span></span>
              </div>
              {sets.map((s) => (
                <div
                  key={s._id}
                  className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2 border-b py-1 text-xs last:border-b-0"
                >
                  <span>{s.setNumber}</span>
                  <span>{s.reps ?? "–"}</span>
                  <span>{s.weight != null ? `${s.weight} kg` : "–"}</span>
                  <span>{s.effortLevel != null ? `${s.effortLevel}/10` : "–"}</span>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-destructive rounded p-0.5 transition-colors"
                    disabled={isDeleting}
                    onClick={() => {
                      startDeleteTransition(async () => {
                        await deleteSetAction(s._id);
                      });
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add set */}
          {showAddSet ? (
            <form
              action={submitSetAction}
              noValidate
              className="mt-2 space-y-2 rounded border bg-muted/30 p-2"
            >
              <div className="grid grid-cols-3 gap-2">
                <Field>
                  <FieldLabel
                    htmlFor={`set-reps-${sessionExercise._id}`}
                    className="text-[10px]"
                  >
                    Reps
                  </FieldLabel>
                  <Input
                    id={`set-reps-${sessionExercise._id}`}
                    type="number"
                    min={1}
                    placeholder="10"
                    className="h-7 text-xs"
                    disabled={isSetPending}
                    {...registerSet("reps")}
                  />
                  <FieldError>{setErrors.reps?.message}</FieldError>
                </Field>
                <Field>
                  <FieldLabel
                    htmlFor={`set-weight-${sessionExercise._id}`}
                    className="text-[10px]"
                  >
                    Weight (kg)
                  </FieldLabel>
                  <Input
                    id={`set-weight-${sessionExercise._id}`}
                    type="number"
                    min={0}
                    step="0.5"
                    placeholder="60"
                    className="h-7 text-xs"
                    disabled={isSetPending}
                    {...registerSet("weight")}
                  />
                  <FieldError>{setErrors.weight?.message}</FieldError>
                </Field>
                <Field>
                  <FieldLabel
                    htmlFor={`set-effort-${sessionExercise._id}`}
                    className="text-[10px]"
                  >
                    Effort (1–10)
                  </FieldLabel>
                  <Input
                    id={`set-effort-${sessionExercise._id}`}
                    type="number"
                    min={1}
                    max={10}
                    placeholder="7"
                    className="h-7 text-xs"
                    disabled={isSetPending}
                    {...registerSet("effortLevel")}
                  />
                  <FieldError>{setErrors.effortLevel?.message}</FieldError>
                </Field>
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
              <div className="flex justify-end gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-6 text-[10px]"
                  disabled={isSetPending}
                  onClick={() => setShowAddSet(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="h-6 text-[10px]"
                  disabled={isSetPending}
                >
                  {isSetPending ? "Adding…" : "Add set"}
                </Button>
              </div>
            </form>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-1 h-6 w-full text-[10px]"
              onClick={() => setShowAddSet(true)}
            >
              <Plus className="mr-1 h-3 w-3" />
              Add set
            </Button>
          )}
        </div>
      )}
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
