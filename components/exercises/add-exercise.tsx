"use client";

import { useActionState, useState } from "react";
import { useForm } from "react-hook-form";
import { useQuery } from "convex/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { addExerciseAction } from "@/actions/exercises";
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

const addExerciseSchema = z.object({
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
});

type AddExerciseValues = z.infer<typeof addExerciseSchema>;

type AddExerciseState = {
  success: boolean;
  message: string | null;
};

const initialState: AddExerciseState = {
  success: false,
  message: null,
};

async function submitAddExercise(
  _prevState: AddExerciseState,
  formData: FormData
): Promise<AddExerciseState> {
  const values = {
    name: String(formData.get("name") ?? ""),
    muscleGroup: String(formData.get("muscleGroup") ?? ""),
    equipment: String(formData.get("equipment") ?? ""),
  };

  const parsed = addExerciseSchema.safeParse(values);
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    const firstError =
      fieldErrors.name?.[0] ??
      fieldErrors.equipment?.[0] ??
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

  const result = await addExerciseAction(
    parsed.data.name,
    muscleGroupId,
    equipment
  );

  if (!result.success) {
    return { success: false, message: result.message };
  }

  return { success: true, message: "Exercise created." };
}

export default function AddExercise() {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(
    submitAddExercise,
    initialState
  );

  const muscleGroups = useQuery(api.muscleGroups.list, {});

  const {
    register,
    clearErrors,
    setError,
    formState: { errors },
  } = useForm<AddExerciseValues>({
    resolver: zodResolver(addExerciseSchema),
    defaultValues: {
      name: "",
      muscleGroup: "",
      equipment: "",
    },
  });

  const submitAction = async (formData: FormData) => {
    const parsed = addExerciseSchema.safeParse({
      name: String(formData.get("name") ?? ""),
      muscleGroup: String(formData.get("muscleGroup") ?? ""),
      equipment: String(formData.get("equipment") ?? ""),
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
        <Button type="button">Add exercise</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add exercise</DialogTitle>
          <DialogDescription>
            Create an exercise to use in your workouts.
          </DialogDescription>
        </DialogHeader>

        <form action={submitAction} noValidate className="px-4 pb-4">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="exercise-name">Name</FieldLabel>
              <Input
                id="exercise-name"
                placeholder="e.g. Bench Press"
                aria-invalid={errors.name ? true : undefined}
                disabled={isPending}
                {...register("name")}
              />
              <FieldError>{errors.name?.message}</FieldError>
            </Field>

            <Field>
              <FieldLabel htmlFor="exercise-muscle-group">
                Muscle Group
              </FieldLabel>
              <select
                id="exercise-muscle-group"
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
              <FieldLabel htmlFor="exercise-equipment">Equipment</FieldLabel>
              <Input
                id="exercise-equipment"
                placeholder="e.g. Barbell, Dumbbell"
                aria-invalid={errors.equipment ? true : undefined}
                disabled={isPending}
                {...register("equipment")}
              />
              <FieldError>{errors.equipment?.message}</FieldError>
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
              {isPending ? "Saving..." : "Save exercise"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
