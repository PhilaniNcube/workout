"use client"

import { useRef, useState } from "react"
import { useMutation } from "convex/react"
import Image from "next/image"
import { RiImageAddLine, RiDeleteBinLine } from "@remixicon/react"

import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { revalidateMuscleGroupPath } from "@/actions/muscle-groups"
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

type MuscleGroupData = {
  _id: Id<"muscleGroups">
  name: string
  illustrationUrl: string | null
  illustrationStorageId?: Id<"_storage"> | null
}

export default function UpdateMuscleGroup({
  muscleGroup,
}: {
  muscleGroup: MuscleGroupData
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(muscleGroup.name)
  const [nameError, setNameError] = useState<string | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  // Illustration state
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    muscleGroup.illustrationUrl,
  )
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [removeIllustration, setRemoveIllustration] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const generateUploadUrl = useMutation(
    api.muscleGroups.generateIllustrationUploadUrl,
  )
  const updateMuscleGroup = useMutation(api.muscleGroups.update)

  function resetForm() {
    setName(muscleGroup.name)
    setNameError(null)
    setServerError(null)
    setPreviewUrl(muscleGroup.illustrationUrl)
    setSelectedFile(null)
    setRemoveIllustration(false)
  }

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      resetForm()
    }
    setOpen(nextOpen)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      setServerError("Please select an image file.")
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setServerError("Image must be smaller than 5 MB.")
      return
    }

    setSelectedFile(file)
    setRemoveIllustration(false)
    setServerError(null)
    setPreviewUrl(URL.createObjectURL(file))
  }

  function handleRemoveIllustration() {
    setSelectedFile(null)
    setRemoveIllustration(true)
    setPreviewUrl(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setNameError(null)
    setServerError(null)

    const trimmed = name.trim()
    if (!trimmed) {
      setNameError("Muscle group name is required.")
      return
    }
    if (trimmed.length > 80) {
      setNameError("Name must be 80 characters or fewer.")
      return
    }

    setIsPending(true)

    try {
      let illustrationStorageId: Id<"_storage"> | null | undefined

      if (selectedFile) {
        const uploadUrl = await generateUploadUrl()
        const uploadRes = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": selectedFile.type },
          body: selectedFile,
        })

        if (!uploadRes.ok) {
          throw new Error("Failed to upload illustration.")
        }

        const { storageId } = (await uploadRes.json()) as {
          storageId: Id<"_storage">
        }
        illustrationStorageId = storageId
      } else if (removeIllustration) {
        illustrationStorageId = null
      }

      await updateMuscleGroup({
        muscleGroupId: muscleGroup._id,
        name: trimmed,
        ...(illustrationStorageId !== undefined
          ? { illustrationStorageId }
          : {}),
      })

      await revalidateMuscleGroupPath(muscleGroup._id)

      setOpen(false)
    } catch (error) {
      setServerError(
        error instanceof Error
          ? error.message
          : "Unable to update muscle group.",
      )
    } finally {
      setIsPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update muscle group</DialogTitle>
          <DialogDescription>
            Change the name or upload an illustration for this muscle group.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} noValidate className="px-4 pb-4">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="update-mg-name">Name</FieldLabel>
              <Input
                id="update-mg-name"
                placeholder="e.g. Chest"
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  setNameError(null)
                }}
                aria-invalid={nameError ? true : undefined}
                disabled={isPending}
              />
              {nameError && <FieldError>{nameError}</FieldError>}
            </Field>

            <Field>
              <FieldLabel htmlFor="update-mg-illustration">
                Illustration
              </FieldLabel>

              {previewUrl ? (
                <div className="relative w-full">
                  <Image
                    src={previewUrl}
                    alt="Illustration preview"
                    width={400}
                    height={400}
                    unoptimized
                    className="h-auto max-h-56 w-full rounded-md border object-contain"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon-sm"
                    className="absolute top-2 right-2"
                    onClick={handleRemoveIllustration}
                    disabled={isPending}
                  >
                    <RiDeleteBinLine className="size-4" />
                    <span className="sr-only">Remove illustration</span>
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isPending}
                  className="flex h-36 w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
                >
                  <RiImageAddLine className="size-8" />
                  <span className="text-xs">Click to upload an image</span>
                </button>
              )}

              <input
                ref={fileInputRef}
                id="update-mg-illustration"
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={handleFileChange}
                disabled={isPending}
              />

              {previewUrl && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isPending}
                >
                  <RiImageAddLine className="mr-2 size-4" />
                  Replace illustration
                </Button>
              )}
            </Field>

            {serverError && <FieldError>{serverError}</FieldError>}
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
  )
}