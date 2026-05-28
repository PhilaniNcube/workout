"use server"

import type { Id } from "@/convex/_generated/dataModel"
import { api } from "@/convex/_generated/api"
import { fetchAuthMutation } from "@/lib/auth-server"

type ExerciseActionSuccess = {
  success: true
  exerciseId: Id<"exercises">
}

type ExerciseActionFailure = {
  success: false
  message: string
}

export type ExerciseActionResult = ExerciseActionSuccess | ExerciseActionFailure

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message
  }

  return "Unable to save exercise."
}

export async function addExerciseAction(
  name: string,
  muscleGroup?: Id<"muscleGroups"> | null,
  equipment?: string | null,
  exerciseType?: string,
  machineNotes?: string | null,
  setupNotes?: string | null,
  photoStorageId?: Id<"_storage"> | null
): Promise<ExerciseActionResult> {
  try {
    const exerciseId = await fetchAuthMutation(api.exercises.create, {
      name,
      ...(muscleGroup !== undefined ? { muscleGroup } : {}),
      ...(equipment !== undefined ? { equipment } : {}),
      exerciseType: exerciseType ?? "strength",
      ...(machineNotes !== undefined ? { machineNotes } : {}),
      ...(setupNotes !== undefined ? { setupNotes } : {}),
      ...(photoStorageId !== undefined ? { photoStorageId } : {}),
    })

    return {
      success: true,
      exerciseId,
    }
  } catch (error) {
    return {
      success: false,
      message: getErrorMessage(error),
    }
  }
}

export async function updateExerciseAction(
  exerciseId: Id<"exercises">,
  updates: {
    name?: string
    muscleGroup?: Id<"muscleGroups"> | null
    equipment?: string | null
    exerciseType?: string
    photoStorageId?: Id<"_storage"> | null
    machineNotes?: string | null
    setupNotes?: string | null
  }
): Promise<ExerciseActionResult> {
  try {
    await fetchAuthMutation(api.exercises.update, {
      exerciseId,
      ...updates,
    })

    return {
      success: true,
      exerciseId,
    }
  } catch (error) {
    return {
      success: false,
      message: getErrorMessage(error),
    }
  }
}

export async function generatePhotoUploadUrlAction(): Promise<string> {
  return await fetchAuthMutation(api.exercises.generatePhotoUploadUrl, {})
}
