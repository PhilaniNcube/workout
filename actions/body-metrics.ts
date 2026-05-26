"use server";

import type { Id } from "@/convex/_generated/dataModel";
import { fetchAuthMutation } from "@/lib/auth-server";
import { api } from "@/convex/_generated/api";

export async function logBodyMetricAction(formData: FormData) {
	const recordedAt = formData.get("recordedAt");
	const bodyWeight = formData.get("bodyWeight");
	const bodyFatPercent = formData.get("bodyFatPercent");
	const heightCm = formData.get("heightCm");
	const waistCm = formData.get("waistCm");
	const chestCm = formData.get("chestCm");
	const notes = formData.get("notes");

	try {
		await fetchAuthMutation(api.bodyMetrics.log, {
			recordedAt: recordedAt && String(recordedAt) !== "" ? Number(recordedAt) : undefined,
			bodyWeight: bodyWeight && String(bodyWeight) !== "" ? Number(bodyWeight) : null,
			bodyFatPercent: bodyFatPercent && String(bodyFatPercent) !== "" ? Number(bodyFatPercent) : null,
			heightCm: heightCm && String(heightCm) !== "" ? Number(heightCm) : null,
			waistCm: waistCm && String(waistCm) !== "" ? Number(waistCm) : null,
			chestCm: chestCm && String(chestCm) !== "" ? Number(chestCm) : null,
			notes: notes && String(notes) !== "" ? String(notes) : null,
		});
		return { success: true, message: "Body metric logged." };
	} catch (error) {
		return {
			success: false,
			message: error instanceof Error ? error.message : "Failed to log body metric.",
		};
	}
}

export async function deleteBodyMetricAction(metricId: string) {
	try {
		await fetchAuthMutation(api.bodyMetrics.remove, { metricId: metricId as Id<"bodyMetrics"> });
		return { success: true };
	} catch (error) {
		return {
			success: false,
			message: error instanceof Error ? error.message : "Failed to delete body metric.",
		};
	}
}
