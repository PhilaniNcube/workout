"use client"

import { useActionState, useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { useMutation, useQuery } from "convex/react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { RiImageAddLine, RiDeleteBinLine } from "@remixicon/react"
import Image from "next/image"
import { Pencil } from "lucide-react"

import { updateExerciseAction } from "@/actions/exercises"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
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
import { Textarea } from "@/components/ui/textarea"

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
})

type EditExerciseValues = z.infer<typeof editExerciseSchema>

type EditExerciseState = {
  success: boolean
  message: string | null
}

const initialState: EditExerciseState = {
  success: false,
  message: null,
}

export default function EditExercise({
  exerciseId,
  exercise,
}: {
  exerciseId: Id<"exercises">
  exercise: {
    name: string
    muscleGroup: Id<"muscleGroups"> | null
    equipment: string | null
    exerciseType: string | undefined
    machineNotes: string | null
    setupNotes: string | null
    photoUrl: string | null
    photoStorageId: Id<"_storage"> | null
  }
}) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const muscleGroups = useQuery(api.muscleGroups.list, {})
  const generateUploadUrl = useMutation(api.exercises.generatePhotoUploadUrl)

  const [previewUrl, setPreviewUrl] = useState<string | null>(exercise.photoUrl)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [uploadedPhotoStorageId, setUploadedPhotoStorageId] =
    useState<Id<"_storage"> | null>(exercise.photoStorageId)
  const [removePhoto, setRemovePhoto] = useState(false)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function resetForm() {
    setPreviewUrl(exercise.photoUrl)
    setUploadingPhoto(false)
    setUploadedPhotoStorageId(exercise.photoStorageId)
    setRemovePhoto(false)
    setPhotoError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      resetForm()
    }
    setOpen(nextOpen)
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      setPhotoError("Please select an image file.")
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setPhotoError("Image must be smaller than 5 MB.")
      return
    }

    setPhotoError(null)
    setRemovePhoto(false)
    setPreviewUrl(URL.createObjectURL(file))
    setUploadingPhoto(true)

    try {
      const uploadUrl = await generateUploadUrl()
      const uploadRes = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      })

      if (!uploadRes.ok) {
        throw new Error("Upload failed")
      }

      const { storageId } = (await uploadRes.json()) as {
        storageId: Id<"_storage">
      }
      setUploadedPhotoStorageId(storageId)
    } catch {
      setPhotoError("Failed to upload photo. Please try again.")
      setPreviewUrl(exercise.photoUrl)
      setUploadedPhotoStorageId(exercise.photoStorageId)
      setRemovePhoto(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    } finally {
      setUploadingPhoto(false)
    }
  }

  function handleRemovePhoto() {
    setPreviewUrl(null)
    setUploadedPhotoStorageId(null)
    setRemovePhoto(true)
    setPhotoError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  function getPhotoStorageIdValue(): string {
    if (removePhoto) return "__REMOVE__"
    if (
      uploadedPhotoStorageId &&
      uploadedPhotoStorageId !== exercise.photoStorageId
    ) {
      return uploadedPhotoStorageId
    }
    return ""
  }

  const boundSubmit = async (
    _prevState: EditExerciseState,
    formData: FormData
  ): Promise<EditExerciseState> => {
    const values = {
      name: String(formData.get("name") ?? ""),
      muscleGroup: String(formData.get("muscleGroup") ?? ""),
      equipment: String(formData.get("equipment") ?? ""),
      exerciseType: String(formData.get("exerciseType") ?? "strength"),
      machineNotes: String(formData.get("machineNotes") ?? ""),
      setupNotes: String(formData.get("setupNotes") ?? ""),
    }

    const parsed = editExerciseSchema.safeParse(values)
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors
      const firstError =
        fieldErrors.name?.[0] ??
        fieldErrors.equipment?.[0] ??
        fieldErrors.exerciseType?.[0] ??
        "Invalid input."
      return { success: false, message: firstError }
    }

    const muscleGroupId =
      parsed.data.muscleGroup && parsed.data.muscleGroup !== ""
        ? (parsed.data.muscleGroup as Id<"muscleGroups">)
        : null

    const equipment =
      parsed.data.equipment && parsed.data.equipment !== ""
        ? parsed.data.equipment
        : null

    const machineNotes =
      parsed.data.machineNotes && parsed.data.machineNotes !== ""
        ? parsed.data.machineNotes
        : null

    const setupNotes =
      parsed.data.setupNotes && parsed.data.setupNotes !== ""
        ? parsed.data.setupNotes
        : null

    const photoStorageIdRaw = String(formData.get("photoStorageId") ?? "")
    let photoStorageId: Id<"_storage"> | null | undefined
    if (photoStorageIdRaw === "__REMOVE__") {
      photoStorageId = null
    } else if (photoStorageIdRaw) {
      photoStorageId = photoStorageIdRaw as Id<"_storage">
    }

    const result = await updateExerciseAction(exerciseId, {
      name: parsed.data.name,
      muscleGroup: muscleGroupId,
      equipment,
      exerciseType: parsed.data.exerciseType,
      machineNotes,
      setupNotes,
      ...(photoStorageId !== undefined ? { photoStorageId } : {}),
    })

    if (!result.success) {
      return { success: false, message: result.message }
    }

    setOpen(false)
    router.refresh()
    return { success: true, message: "Exercise updated." }
  }

  const [state, formAction, isPending] = useActionState(
    boundSubmit,
    initialState
  )

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
  })

  const submitAction = async (formData: FormData) => {
    const parsed = editExerciseSchema.safeParse({
      name: String(formData.get("name") ?? ""),
      muscleGroup: String(formData.get("muscleGroup") ?? ""),
      equipment: String(formData.get("equipment") ?? ""),
      exerciseType: String(formData.get("exerciseType") ?? "strength"),
      machineNotes: String(formData.get("machineNotes") ?? ""),
      setupNotes: String(formData.get("setupNotes") ?? ""),
    })

    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors
      if (fieldErrors.name?.[0]) {
        setError("name", { type: "manual", message: fieldErrors.name[0] })
      }
      if (fieldErrors.equipment?.[0]) {
        setError("equipment", {
          type: "manual",
          message: fieldErrors.equipment[0],
        })
      }
      return
    }

    clearErrors()
    formAction(formData)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
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
          <input
            type="hidden"
            name="photoStorageId"
            value={getPhotoStorageIdValue()}
          />
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
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm ring-offset-background transition-colors placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
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
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm ring-offset-background transition-colors placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
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

            <Field>
              <FieldLabel htmlFor="edit-exercise-machine-photo">
                Machine photo
              </FieldLabel>

              {previewUrl ? (
                <div className="relative w-full">
                  <Image
                    src={previewUrl}
                    alt="Machine photo preview"
                    width={400}
                    height={300}
                    unoptimized
                    className="h-auto max-h-56 w-full rounded-md border object-contain"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon-sm"
                    className="absolute top-2 right-2"
                    onClick={handleRemovePhoto}
                    disabled={isPending || uploadingPhoto}
                  >
                    <RiDeleteBinLine className="size-4" />
                    <span className="sr-only">Remove photo</span>
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isPending || uploadingPhoto}
                  className="flex h-36 w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
                >
                  <RiImageAddLine className="size-8" />
                  {uploadingPhoto ? (
                    <span className="text-xs">Uploading...</span>
                  ) : (
                    <span className="text-xs">Click to upload a photo</span>
                  )}
                </button>
              )}

              <input
                ref={fileInputRef}
                id="edit-exercise-machine-photo"
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={handleFileChange}
                disabled={isPending || uploadingPhoto}
              />

              {previewUrl && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isPending || uploadingPhoto}
                >
                  <RiImageAddLine className="mr-2 size-4" />
                  Replace photo
                </Button>
              )}
            </Field>

            {photoError && <FieldError>{photoError}</FieldError>}

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
              disabled={isPending || uploadingPhoto}
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || uploadingPhoto}>
              {isPending || uploadingPhoto ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
