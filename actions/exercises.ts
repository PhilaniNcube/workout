"use server";

import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { fetchAuthMutation } from "@/lib/auth-server";

type ExerciseActionSuccess = {
	success: true;
	exerciseId: Id<"exercises">;
};

type ExerciseActionFailure = {
	success: false;
	message: string;
};

export type ExerciseActionResult =
	| ExerciseActionSuccess
	| ExerciseActionFailure;

function getErrorMessage(error: unknown): string {
	if (error instanceof Error && error.message) {
		return error.message;
	}

	return "Unable to save exercise.";
}

export async function addExerciseAction(
	name: string,
	muscleGroup?: Id<"muscleGroups"> | null,
	equipment?: string | null,
): Promise<ExerciseActionResult> {
	try {
		const exerciseId = await fetchAuthMutation(api.exercises.create, {
			name,
			...(muscleGroup !== undefined ? { muscleGroup } : {}),
			...(equipment !== undefined ? { equipment } : {}),
		});

		return {
			success: true,
			exerciseId,
		};
	} catch (error) {
		return {
			success: false,
			message: getErrorMessage(error),
		};
	}
}
