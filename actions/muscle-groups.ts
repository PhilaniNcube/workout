"use server";

import { revalidatePath } from "next/cache";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { fetchAuthMutation } from "@/lib/auth-server";

type MuscleGroupActionSuccess = {
	success: true;
	muscleGroupId: Id<"muscleGroups">;
};

type MuscleGroupActionFailure = {
	success: false;
	message: string;
};

export type MuscleGroupActionResult =
	| MuscleGroupActionSuccess
	| MuscleGroupActionFailure;

function getErrorMessage(error: unknown): string {
	if (error instanceof Error && error.message) {
		return error.message;
	}

	return "Unable to save muscle group.";
}

export async function addMuscleGroupAction(
	name: string,
	illustrationStorageId?: Id<"_storage"> | null,
): Promise<MuscleGroupActionResult> {
	try {
		const muscleGroupId = await fetchAuthMutation(api.muscleGroups.create, {
			name,
			...(illustrationStorageId !== undefined
				? { illustrationStorageId }
				: {}),
		});

		return {
			success: true,
			muscleGroupId,
		};
	} catch (error) {
		return {
			success: false,
			message: getErrorMessage(error),
		};
	}
}

export async function updateMuscleGroupAction(
	muscleGroupId: Id<"muscleGroups">,
	name: string,
	illustrationStorageId?: Id<"_storage"> | null,
): Promise<MuscleGroupActionResult> {
	try {
		const updatedId = await fetchAuthMutation(api.muscleGroups.update, {
			muscleGroupId,
			name,
			...(illustrationStorageId !== undefined
				? { illustrationStorageId }
				: {}),
		});

		revalidatePath(`/dashboard/muscle-groups/${muscleGroupId}`);

		return {
			success: true,
			muscleGroupId: updatedId,
		};
	} catch (error) {
		return {
			success: false,
			message: getErrorMessage(error),
		};
	}
}

export async function revalidateMuscleGroupPath(
	muscleGroupId: Id<"muscleGroups">,
) {
	revalidatePath(`/dashboard/muscle-groups/${muscleGroupId}`);
}
