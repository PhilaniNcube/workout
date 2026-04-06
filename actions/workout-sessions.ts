"use server";

import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { fetchAuthMutation } from "@/lib/auth-server";

type SessionActionSuccess = {
	success: true;
	sessionId: Id<"workoutSessions">;
};

type SessionActionFailure = {
	success: false;
	message: string;
};

export type SessionActionResult = SessionActionSuccess | SessionActionFailure;

type SessionExerciseActionSuccess = {
	success: true;
	sessionExerciseId: Id<"workoutSessionExercises">;
};

type SessionExerciseActionFailure = {
	success: false;
	message: string;
};

export type SessionExerciseActionResult =
	| SessionExerciseActionSuccess
	| SessionExerciseActionFailure;

function getErrorMessage(error: unknown): string {
	if (error instanceof Error && error.message) {
		return error.message;
	}
	return "Unable to save workout session.";
}

export async function addSessionAction(
	startedAt: number,
	notes?: string | null,
	perceivedEffort?: number | null,
): Promise<SessionActionResult> {
	try {
		const sessionId = await fetchAuthMutation(api.workoutSessions.create, {
			startedAt,
			...(notes !== undefined ? { notes } : {}),
			...(perceivedEffort !== undefined ? { perceivedEffort } : {}),
		});

		return {
			success: true,
			sessionId,
		};
	} catch (error) {
		return {
			success: false,
			message: getErrorMessage(error),
		};
	}
}

export async function addSessionExerciseAction(
	sessionId: Id<"workoutSessions">,
	exerciseId: Id<"exercises">,
	notes?: string | null,
): Promise<SessionExerciseActionResult> {
	try {
		const sessionExerciseId = await fetchAuthMutation(
			api.workoutSessionExercises.add,
			{
				sessionId,
				exerciseId,
				...(notes !== undefined ? { notes } : {}),
			},
		);

		return {
			success: true,
			sessionExerciseId,
		};
	} catch (error) {
		return {
			success: false,
			message: getErrorMessage(error),
		};
	}
}

type AddExerciseWithSetResult =
	| { success: true; sessionExerciseId: Id<"workoutSessionExercises">; setId: Id<"sets"> }
	| { success: false; message: string };

export async function addExerciseWithSetAction(
	sessionId: Id<"workoutSessions">,
	exerciseId: Id<"exercises">,
	set: {
		reps?: number | null;
		weight?: number | null;
		durationSeconds?: number | null;
		distance?: number | null;
		rir?: number | null;
		effortLevel?: number | null;
		isWarmup?: boolean;
	},
	notes?: string | null,
): Promise<AddExerciseWithSetResult> {
	try {
		const result = await fetchAuthMutation(
			api.workoutSessionExercises.addWithSet,
			{
				sessionId,
				exerciseId,
				...(notes !== undefined ? { notes } : {}),
				...(set.reps !== undefined ? { reps: set.reps } : {}),
				...(set.weight !== undefined ? { weight: set.weight } : {}),
				...(set.durationSeconds !== undefined ? { durationSeconds: set.durationSeconds } : {}),
				...(set.distance !== undefined ? { distance: set.distance } : {}),
				...(set.rir !== undefined ? { rir: set.rir } : {}),
				...(set.effortLevel !== undefined ? { effortLevel: set.effortLevel } : {}),
				...(set.isWarmup !== undefined ? { isWarmup: set.isWarmup } : {}),
			},
		);

		return {
			success: true,
			sessionExerciseId: result.sessionExerciseId,
			setId: result.setId,
		};
	} catch (error) {
		return {
			success: false,
			message: getErrorMessage(error),
		};
	}
}

type AddSetResult =
	| { success: true; setId: Id<"sets"> }
	| { success: false; message: string };

export async function addSetAction(
	workoutSessionExerciseId: Id<"workoutSessionExercises">,
	setNumber: number,
	set: {
		reps?: number | null;
		weight?: number | null;
		durationSeconds?: number | null;
		distance?: number | null;
		rir?: number | null;
		effortLevel?: number | null;
		isWarmup?: boolean;
	},
): Promise<AddSetResult> {
	try {
		const setId = await fetchAuthMutation(api.sets.add, {
			workoutSessionExerciseId,
			setNumber,
			...(set.reps !== undefined ? { reps: set.reps } : {}),
			...(set.weight !== undefined ? { weight: set.weight } : {}),
			...(set.durationSeconds !== undefined ? { durationSeconds: set.durationSeconds } : {}),
			...(set.distance !== undefined ? { distance: set.distance } : {}),
			...(set.rir !== undefined ? { rir: set.rir } : {}),
			...(set.effortLevel !== undefined ? { effortLevel: set.effortLevel } : {}),
			...(set.isWarmup !== undefined ? { isWarmup: set.isWarmup } : {}),
		});

		return { success: true, setId };
	} catch (error) {
		return { success: false, message: getErrorMessage(error) };
	}
}

type DeleteResult = { success: true } | { success: false; message: string };

export async function deleteSetAction(
	setId: Id<"sets">,
): Promise<DeleteResult> {
	try {
		await fetchAuthMutation(api.sets.remove, { setId });
		return { success: true };
	} catch (error) {
		return { success: false, message: getErrorMessage(error) };
	}
}

export async function deleteSessionExerciseAction(
	sessionExerciseId: Id<"workoutSessionExercises">,
): Promise<DeleteResult> {
	try {
		await fetchAuthMutation(api.workoutSessionExercises.remove, { sessionExerciseId });
		return { success: true };
	} catch (error) {
		return { success: false, message: getErrorMessage(error) };
	}
}
