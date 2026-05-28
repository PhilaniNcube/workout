"use client"

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
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"

const addMuscleGroupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Muscle group name is required")
    .max(80, "Name must be 80 characters or fewer"),
  category: z.string().optional(),
  region: z.string().optional(),
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
    category: String(formData.get("category") ?? ""),
    region: String(formData.get("region") ?? ""),
  }

  const parsed = addMuscleGroupSchema.safeParse(values)
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.flatten().fieldErrors.name?.[0] ?? "Invalid input.",
    }
  }

  const category = parsed.data.category || null
  const region = parsed.data.region || null

  const result = await addMuscleGroupAction(
    parsed.data.name,
    undefined,
    category,
    region
  )
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
      category: "",
      region: "",
    },
  })

  const submitAction = async (formData: FormData) => {
    const parsed = addMuscleGroupSchema.safeParse({
      name: String(formData.get("name") ?? ""),
      category: String(formData.get("category") ?? ""),
      region: String(formData.get("region") ?? ""),
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

            <Field>
              <FieldLabel htmlFor="muscle-group-category">
                Movement Category
              </FieldLabel>
              <select
                id="muscle-group-category"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm ring-offset-background transition-colors placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isPending}
                {...register("category")}
              >
                <option value="">Uncategorized</option>
                <option value="push">Push</option>
                <option value="pull">Pull</option>
                <option value="legs">Legs</option>
                <option value="core">Core</option>
                <option value="cardio">Cardio</option>
                <option value="full">Full Body</option>
              </select>
            </Field>

            <Field>
              <FieldLabel htmlFor="muscle-group-region">Body Region</FieldLabel>
              <select
                id="muscle-group-region"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm ring-offset-background transition-colors placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isPending}
                {...register("region")}
              >
                <option value="">Uncategorized</option>
                <option value="upper">Upper Body</option>
                <option value="lower">Lower Body</option>
                <option value="core">Core</option>
                <option value="full">Full Body</option>
              </select>
            </Field>

            {!errors.name && state.message ? (
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
              {isPending ? "Saving..." : "Save muscle group"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default AddMuscleGroup
