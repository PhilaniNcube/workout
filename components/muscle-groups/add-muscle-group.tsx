"use client";

import { useActionState, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

import { addMuscleGroupAction } from "@/actions/muscle-groups"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

const addMuscleGroupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Muscle group name is required")
    .max(80, "Name must be 80 characters or fewer"),
})

type AddMuscleGroupValues = z.infer<typeof addMuscleGroupSchema>

type AddMuscleGroupState = {
  success: boolean
  message: string | null
}

const initialState: AddMuscleGroupState = {
  success: false,
  message: null,
}

async function submitAddMuscleGroup(
  _prevState: AddMuscleGroupState,
  formData: FormData
): Promise<AddMuscleGroupState> {
  const values = {
    name: String(formData.get("name") ?? ""),
  }

  const parsed = addMuscleGroupSchema.safeParse(values)
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.flatten().fieldErrors.name?.[0] ?? "Invalid input.",
    }
  }

  const result = await addMuscleGroupAction(parsed.data.name)
  if (!result.success) {
    return {
      success: false,
      message: result.message,
    }
  }

  return {
    success: true,
    message: "Muscle group created.",
  }
}

const AddMuscleGroup = () => {
  const [open, setOpen] = useState(false)
  const [state, formAction, isPending] = useActionState(
    submitAddMuscleGroup,
    initialState
  )

  const {
    register,
    clearErrors,
    setError,
    formState: { errors },
  } = useForm<AddMuscleGroupValues>({
    resolver: zodResolver(addMuscleGroupSchema),
    defaultValues: {
      name: "",
    },
  })

  const submitAction = async (formData: FormData) => {
    const parsed = addMuscleGroupSchema.safeParse({
      name: String(formData.get("name") ?? ""),
    })

    if (!parsed.success) {
      setError("name", {
        type: "manual",
        message:
          parsed.error.flatten().fieldErrors.name?.[0] ?? "Invalid input.",
      })
      return
    }

    clearErrors("name")
    formAction(formData)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button">Add muscle group</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add muscle group</DialogTitle>
          <DialogDescription>
            Create a muscle group to organize your exercises.
          </DialogDescription>
        </DialogHeader>

        <form action={submitAction} noValidate className="px-4 pb-4">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="muscle-group-name">Name</FieldLabel>
              <Input
                id="muscle-group-name"
                placeholder="e.g. Chest"
                aria-invalid={errors.name ? true : undefined}
                disabled={isPending}
                {...register("name")}
              />
              <FieldError>{errors.name?.message}</FieldError>
            </Field>

            {!errors.name && state.message ? (
              <FieldError className={state.success ? "text-green-600" : undefined}>
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
              {isPending ? "Saving..." : "Save muscle group"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default AddMuscleGroup