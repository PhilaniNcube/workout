"use client";

import { useActionState, useState } from "react";
import { useForm } from "react-hook-form";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Pencil } from "lucide-react";

import { updateExerciseAction } from "@/actions/exercises";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";

const editExerciseSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Exercise name is required")
    .max(120, "Name must be 120 characters or fewer"),
  muscleGroup: z.string().optional(),
  equipment: z
    .string()
    .trim()
    .max(80, "Equipment must be 80 characters or fewer")
    .optional(),
  exerciseType: z.string().min(1, "Exercise type is required"),
  machineNotes: z
    .string()
    .trim()
    .max(500, "Machine notes must be 500 characters or fewer")
    .optional(),
  setupNotes: z
    .string()
    .trim()
    .max(500, "Setup notes must be 500 characters or fewer")
    .optional(),
});

type EditExerciseValues = z.infer<typeof editExerciseSchema>;

type EditExerciseState = {
  success: boolean;
  message: string | null;
};

const initialState: EditExerciseState = {
  success: false,
  message: null,
};

export default function EditExercise({
  exerciseId,
  exercise,
}: {
  exerciseId: Id<"exercises">;
  exercise: {
    name: string;
    muscleGroup: Id<"muscleGroups"> | null;
    equipment: string | null;
    exerciseType: string | undefined;
    machineNotes: string | null;
    setupNotes: string | null;
  };
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const muscleGroups = useQuery(api.muscleGroups.list, {});

  const boundSubmit = async (
    _prevState: EditExerciseState,
    formData: FormData,
  ): Promise<EditExerciseState> => {
    const values = {
      name: String(formData.get("name") ?? ""),
      muscleGroup: String(formData.get("muscleGroup") ?? ""),
      equipment: String(formData.get("equipment") ?? ""),
      exerciseType: String(formData.get("exerciseType") ?? "strength"),
      machineNotes: String(formData.get("machineNotes") ?? ""),
      setupNotes: String(formData.get("setupNotes") ?? ""),
    };

    const parsed = editExerciseSchema.safeParse(values);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      const firstError =
        fieldErrors.name?.[0] ??
        fieldErrors.equipment?.[0] ??
        fieldErrors.exerciseType?.[0] ??
        "Invalid input.";
      return { success: false, message: firstError };
    }

    const muscleGroupId =
      parsed.data.muscleGroup && parsed.data.muscleGroup !== ""
        ? (parsed.data.muscleGroup as Id<"muscleGroups">)
        : null;

    const equipment =
      parsed.data.equipment && parsed.data.equipment !== ""
        ? parsed.data.equipment
        : null;

    const machineNotes =
      parsed.data.machineNotes && parsed.data.machineNotes !== ""
        ? parsed.data.machineNotes
        : null;

    const setupNotes =
      parsed.data.setupNotes && parsed.data.setupNotes !== ""
        ? parsed.data.setupNotes
        : null;

    const result = await updateExerciseAction(exerciseId, {
      name: parsed.data.name,
      muscleGroup: muscleGroupId,
      equipment,
      exerciseType: parsed.data.exerciseType,
      machineNotes,
      setupNotes,
    });

    if (!result.success) {
      return { success: false, message: result.message };
    }

    setOpen(false);
    router.refresh();
    return { success: true, message: "Exercise updated." };
  };

  const [state, formAction, isPending] = useActionState(
    boundSubmit,
    initialState,
  );

  const {
    register,
    clearErrors,
    setError,
    formState: { errors },
  } = useForm<EditExerciseValues>({
    resolver: zodResolver(editExerciseSchema),
    defaultValues: {
      name: exercise.name,
      muscleGroup: exercise.muscleGroup ?? "",
      equipment: exercise.equipment ?? "",
      exerciseType: exercise.exerciseType ?? "strength",
      machineNotes: exercise.machineNotes ?? "",
      setupNotes: exercise.setupNotes ?? "",
    },
  });

  const submitAction = async (formData: FormData) => {
    const parsed = editExerciseSchema.safeParse({
      name: String(formData.get("name") ?? ""),
      muscleGroup: String(formData.get("muscleGroup") ?? ""),
      equipment: String(formData.get("equipment") ?? ""),
      exerciseType: String(formData.get("exerciseType") ?? "strength"),
      machineNotes: String(formData.get("machineNotes") ?? ""),
      setupNotes: String(formData.get("setupNotes") ?? ""),
    });

    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      if (fieldErrors.name?.[0]) {
        setError("name", { type: "manual", message: fieldErrors.name[0] });
      }
      if (fieldErrors.equipment?.[0]) {
        setError("equipment", {
          type: "manual",
          message: fieldErrors.equipment[0],
        });
      }
      return;
    }

    clearErrors();
    formAction(formData);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <Pencil className="mr-1.5 h-3.5 w-3.5" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit exercise</DialogTitle>
          <DialogDescription>
            Update the details for this exercise.
          </DialogDescription>
        </DialogHeader>

        <form action={submitAction} noValidate className="px-4 pb-4">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="edit-exercise-name">Name</FieldLabel>
              <Input
                id="edit-exercise-name"
                placeholder="e.g. Bench Press"
                aria-invalid={errors.name ? true : undefined}
                disabled={isPending}
                {...register("name")}
              />
              <FieldError>{errors.name?.message}</FieldError>
            </Field>

            <Field>
              <FieldLabel htmlFor="edit-exercise-muscle-group">
                Muscle Group
              </FieldLabel>
              <select
                id="edit-exercise-muscle-group"
                className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-sm transition-colors focus-visible:ring-1 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isPending}
                {...register("muscleGroup")}
              >
                <option value="">None</option>
                {muscleGroups?.map((group) => (
                  <option key={group._id} value={group._id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field>
              <FieldLabel htmlFor="edit-exercise-equipment">
                Equipment
              </FieldLabel>
              <Input
                id="edit-exercise-equipment"
                placeholder="e.g. Barbell, Dumbbell"
                aria-invalid={errors.equipment ? true : undefined}
                disabled={isPending}
                {...register("equipment")}
              />
              <FieldError>{errors.equipment?.message}</FieldError>
            </Field>

            <Field>
              <FieldLabel htmlFor="edit-exercise-type">
                Exercise Type
              </FieldLabel>
              <select
                id="edit-exercise-type"
                className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-sm transition-colors focus-visible:ring-1 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isPending}
                {...register("exerciseType")}
              >
                <option value="strength">Strength</option>
                <option value="cardio">Cardio</option>
                <option value="plyometric">Plyometric</option>
              </select>
              <FieldError>{errors.exerciseType?.message}</FieldError>
            </Field>

            <Field>
              <FieldLabel htmlFor="edit-exercise-machine-notes">
                Machine identification
              </FieldLabel>
              <Textarea
                id="edit-exercise-machine-notes"
                placeholder="e.g. Black Hammer Strength machine, 2nd row from left, pin-loaded"
                disabled={isPending}
                {...register("machineNotes")}
              />
              <FieldError>{errors.machineNotes?.message}</FieldError>
            </Field>

            <Field>
              <FieldLabel htmlFor="edit-exercise-setup-notes">
                Setup notes
              </FieldLabel>
              <Textarea
                id="edit-exercise-setup-notes"
                placeholder="e.g. Seat position 3, bar at mid-chest, feet flat"
                disabled={isPending}
                {...register("setupNotes")}
              />
              <FieldError>{errors.setupNotes?.message}</FieldError>
            </Field>

            {!errors.name && !errors.equipment && state.message ? (
              <FieldError
                className={state.success ? "text-green-600" : undefined}
              >
                {state.message}
              </FieldError>
            ) : null}
          </FieldGroup>

          <DialogFooter className="p-0 pt-4">
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
