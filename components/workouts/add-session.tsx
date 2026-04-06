"use client";

import { useActionState, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Plus } from "lucide-react";

import { addSessionAction } from "@/actions/workout-sessions";
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

const addSessionSchema = z.object({
  date: z.string().min(1, "Date is required"),
  time: z.string().min(1, "Time is required"),
  notes: z.string().trim().max(500, "Notes must be 500 characters or fewer").optional(),
  perceivedEffort: z
    .string()
    .optional()
    .transform((val) => (val && val !== "" ? Number(val) : undefined))
    .pipe(
      z
        .number()
        .min(1, "Effort must be between 1 and 10")
        .max(10, "Effort must be between 1 and 10")
        .optional(),
    ),
});

const addSessionFormSchema = z.object({
  date: z.string().min(1, "Date is required"),
  time: z.string().min(1, "Time is required"),
  notes: z.string().trim().max(500, "Notes must be 500 characters or fewer").optional(),
  perceivedEffort: z.string().optional(),
});

type AddSessionValues = z.infer<typeof addSessionFormSchema>;

type AddSessionState = {
  success: boolean;
  message: string | null;
};

const initialState: AddSessionState = {
  success: false,
  message: null,
};

async function submitAddSession(
  _prevState: AddSessionState,
  formData: FormData,
): Promise<AddSessionState> {
  const values = {
    date: String(formData.get("date") ?? ""),
    time: String(formData.get("time") ?? ""),
    notes: String(formData.get("notes") ?? ""),
    perceivedEffort: String(formData.get("perceivedEffort") ?? ""),
  };

  const parsed = addSessionSchema.safeParse(values);
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    const firstError =
      fieldErrors.date?.[0] ??
      fieldErrors.time?.[0] ??
      fieldErrors.perceivedEffort?.[0] ??
      "Invalid input.";
    return { success: false, message: firstError };
  }

  const startedAt = new Date(`${parsed.data.date}T${parsed.data.time}`).getTime();
  if (Number.isNaN(startedAt)) {
    return { success: false, message: "Invalid date or time." };
  }

  const notes = parsed.data.notes && parsed.data.notes !== "" ? parsed.data.notes : null;
  const perceivedEffort = parsed.data.perceivedEffort ?? null;

  const result = await addSessionAction(startedAt, notes, perceivedEffort);

  if (!result.success) {
    return { success: false, message: result.message };
  }

  return { success: true, message: "Session created." };
}

export default function AddSession() {
  const [open, setOpen] = useState(false);

  const submitAndClose = async (
    prevState: AddSessionState,
    formData: FormData,
  ): Promise<AddSessionState> => {
    const result = await submitAddSession(prevState, formData);
    if (result.success) {
      setOpen(false);
    }
    return result;
  };

  const [state, formAction, isPending] = useActionState(
    submitAndClose,
    initialState,
  );

  const now = new Date();
  const defaultDate = format(now, "yyyy-MM-dd");
  const defaultTime = format(now, "HH:mm");

  const {
    register,
    clearErrors,
    setError,
    formState: { errors },
  } = useForm<AddSessionValues>({
    resolver: zodResolver(addSessionFormSchema),
    defaultValues: {
      date: defaultDate,
      time: defaultTime,
      notes: "",
      perceivedEffort: "",
    },
  });

  const submitAction = async (formData: FormData) => {
    const parsed = addSessionSchema.safeParse({
      date: String(formData.get("date") ?? ""),
      time: String(formData.get("time") ?? ""),
      notes: String(formData.get("notes") ?? ""),
      perceivedEffort: String(formData.get("perceivedEffort") ?? ""),
    });

    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      if (fieldErrors.date?.[0]) {
        setError("date", { type: "manual", message: fieldErrors.date[0] });
      }
      if (fieldErrors.time?.[0]) {
        setError("time", { type: "manual", message: fieldErrors.time[0] });
      }
      if (fieldErrors.perceivedEffort?.[0]) {
        setError("perceivedEffort", {
          type: "manual",
          message: fieldErrors.perceivedEffort[0],
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
        <Button type="button">
          <Plus className="mr-2 h-4 w-4" />
          New Session
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New workout session</DialogTitle>
          <DialogDescription>
            Record a new workout session.
          </DialogDescription>
        </DialogHeader>

        <form action={submitAction} noValidate className="px-4 pb-4">
          <FieldGroup>
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="session-date">Date</FieldLabel>
                <Input
                  id="session-date"
                  type="date"
                  aria-invalid={errors.date ? true : undefined}
                  disabled={isPending}
                  {...register("date")}
                />
                <FieldError>{errors.date?.message}</FieldError>
              </Field>

              <Field>
                <FieldLabel htmlFor="session-time">Time</FieldLabel>
                <Input
                  id="session-time"
                  type="time"
                  aria-invalid={errors.time ? true : undefined}
                  disabled={isPending}
                  {...register("time")}
                />
                <FieldError>{errors.time?.message}</FieldError>
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="session-notes">Notes</FieldLabel>
              <Input
                id="session-notes"
                placeholder="e.g. Upper body focus, felt strong"
                aria-invalid={errors.notes ? true : undefined}
                disabled={isPending}
                {...register("notes")}
              />
              <FieldError>{errors.notes?.message}</FieldError>
            </Field>

            <Field>
              <FieldLabel htmlFor="session-effort">
                Perceived Effort (1–10)
              </FieldLabel>
              <Input
                id="session-effort"
                type="number"
                min={1}
                max={10}
                placeholder="e.g. 7"
                aria-invalid={errors.perceivedEffort ? true : undefined}
                disabled={isPending}
                {...register("perceivedEffort")}
              />
              <FieldError>{errors.perceivedEffort?.message}</FieldError>
            </Field>

            {!errors.date &&
            !errors.time &&
            !errors.perceivedEffort &&
            state.message ? (
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
              {isPending ? "Saving..." : "Save session"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
