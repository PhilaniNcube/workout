"use server";

import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { fetchAuthMutation } from "@/lib/auth-server";

function getErrorMessage(error: unknown): string {
	if (error instanceof Error && error.message) {
		return error.message;
	}
	return "Something went wrong.";
}

type TemplateResult =
	| { success: true; templateId: Id<"workoutTemplates"> }
	| { success: false; message: string };

export async function saveTemplateFromSessionAction(
	sessionId: Id<"workoutSessions">,
	name: string,
	notes?: string | null,
): Promise<TemplateResult> {
	try {
		const templateId = await fetchAuthMutation(
			api.workoutTemplates.createFromSession,
			{ sessionId, name, notes: notes ?? null },
		);
		return { success: true, templateId };
	} catch (error) {
		return { success: false, message: getErrorMessage(error) };
	}
}

export async function createTemplateAction(
	name: string,
	exerciseIds: Id<"exercises">[],
	notes?: string | null,
): Promise<TemplateResult> {
	try {
		const templateId = await fetchAuthMutation(api.workoutTemplates.create, {
			name,
			exerciseIds,
			notes: notes ?? null,
		});
		return { success: true, templateId };
	} catch (error) {
		return { success: false, message: getErrorMessage(error) };
	}
}

export async function deleteTemplateAction(
	templateId: Id<"workoutTemplates">,
): Promise<{ success: true } | { success: false; message: string }> {
	try {
		await fetchAuthMutation(api.workoutTemplates.remove, { templateId });
		return { success: true };
	} catch (error) {
		return { success: false, message: getErrorMessage(error) };
	}
}

export async function startFromTemplateAction(
	templateId: Id<"workoutTemplates">,
	startedAt?: number,
): Promise<TemplateResult> {
	try {
		const sessionId = await fetchAuthMutation(
			api.workoutTemplates.startFromTemplate,
			{ templateId, startedAt: startedAt ?? Date.now() },
		);
		return { success: true, templateId: sessionId as unknown as Id<"workoutTemplates"> };
	} catch (error) {
		return { success: false, message: getErrorMessage(error) };
	}
}
