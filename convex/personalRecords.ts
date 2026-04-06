import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { assertOwner, requireTokenIdentifier } from "./lib/authz";

export const PR_RECORD_TYPE_MAX_WEIGHT = "max_weight";
export const PR_RECORD_TYPE_MAX_REPS = "max_reps";

async function upsertIfHigher(
	ctx: MutationCtx,
	params: {
		tokenIdentifier: string;
		exerciseId: Id<"exercises">;
		recordType: string;
		value: number;
		achievedAt: number;
		sourceSetId: Id<"sets"> | null;
	},
) {
	const existing = await ctx.db
		.query("personalRecords")
		.withIndex("by_ownerTokenIdentifier_and_exerciseId_and_recordType", (q) =>
			q
				.eq("ownerTokenIdentifier", params.tokenIdentifier)
				.eq("exerciseId", params.exerciseId)
				.eq("recordType", params.recordType),
		)
		.take(1);

	const now = Date.now();
	if (existing.length > 0) {
		const shouldUpdate =
			params.value > existing[0].value ||
			(params.value === existing[0].value && params.achievedAt >= existing[0].achievedAt);
		if (!shouldUpdate) {
			return existing[0]._id;
		}

		await ctx.db.patch(existing[0]._id, {
			value: params.value,
			achievedAt: params.achievedAt,
			sourceSetId: params.sourceSetId,
			updatedAt: now,
		});
		return existing[0]._id;
	}

	return await ctx.db.insert("personalRecords", {
		ownerTokenIdentifier: params.tokenIdentifier,
		exerciseId: params.exerciseId,
		recordType: params.recordType,
		value: params.value,
		achievedAt: params.achievedAt,
		sourceSetId: params.sourceSetId,
		createdAt: now,
		updatedAt: now,
	});
}

async function setRecordValueOrDelete(
	ctx: MutationCtx,
	params: {
		tokenIdentifier: string;
		exerciseId: Id<"exercises">;
		recordType: string;
		best: { value: number; achievedAt: number; sourceSetId: Id<"sets"> } | null;
	},
) {
	const existing = await ctx.db
		.query("personalRecords")
		.withIndex("by_ownerTokenIdentifier_and_exerciseId_and_recordType", (q) =>
			q
				.eq("ownerTokenIdentifier", params.tokenIdentifier)
				.eq("exerciseId", params.exerciseId)
				.eq("recordType", params.recordType),
		)
		.take(1);

	if (!params.best) {
		if (existing.length > 0) {
			await ctx.db.delete(existing[0]._id);
		}
		return;
	}

	const now = Date.now();
	if (existing.length > 0) {
		await ctx.db.patch(existing[0]._id, {
			value: params.best.value,
			achievedAt: params.best.achievedAt,
			sourceSetId: params.best.sourceSetId,
			updatedAt: now,
		});
		return;
	}

	await ctx.db.insert("personalRecords", {
		ownerTokenIdentifier: params.tokenIdentifier,
		exerciseId: params.exerciseId,
		recordType: params.recordType,
		value: params.best.value,
		achievedAt: params.best.achievedAt,
		sourceSetId: params.best.sourceSetId,
		createdAt: now,
		updatedAt: now,
	});
}

export async function upsertSetDerivedRecords(
	ctx: MutationCtx,
	params: {
		tokenIdentifier: string;
		exerciseId: Id<"exercises">;
		setId: Id<"sets">;
		createdAt: number;
		weight: number | null;
		reps: number | null;
	},
) {
	if (params.weight !== null) {
		await upsertIfHigher(ctx, {
			tokenIdentifier: params.tokenIdentifier,
			exerciseId: params.exerciseId,
			recordType: PR_RECORD_TYPE_MAX_WEIGHT,
			value: params.weight,
			achievedAt: params.createdAt,
			sourceSetId: params.setId,
		});
	}

	if (params.reps !== null) {
		await upsertIfHigher(ctx, {
			tokenIdentifier: params.tokenIdentifier,
			exerciseId: params.exerciseId,
			recordType: PR_RECORD_TYPE_MAX_REPS,
			value: params.reps,
			achievedAt: params.createdAt,
			sourceSetId: params.setId,
		});
	}
}

export async function recomputeSetDerivedRecordsForExercise(
	ctx: MutationCtx,
	params: {
		tokenIdentifier: string;
		exerciseId: Id<"exercises">;
	},
) {
	const sessionExerciseRows = await ctx.db
		.query("workoutSessionExercises")
		.withIndex("by_ownerTokenIdentifier_and_exerciseId", (q) =>
			q
				.eq("ownerTokenIdentifier", params.tokenIdentifier)
				.eq("exerciseId", params.exerciseId),
		)
		.take(500);

	let bestWeight: { value: number; achievedAt: number; sourceSetId: Id<"sets"> } | null = null;
	let bestReps: { value: number; achievedAt: number; sourceSetId: Id<"sets"> } | null = null;

	for (const row of sessionExerciseRows) {
		const sets = await ctx.db
			.query("sets")
			.withIndex("by_ownerTokenIdentifier_and_workoutSessionExerciseId", (q) =>
				q
					.eq("ownerTokenIdentifier", params.tokenIdentifier)
					.eq("workoutSessionExerciseId", row._id),
			)
			.take(200);

		for (const set of sets) {
			if (set.weight != null) {
				if (
					!bestWeight ||
					set.weight > bestWeight.value ||
					(set.weight === bestWeight.value && set.createdAt > bestWeight.achievedAt)
				) {
					bestWeight = {
						value: set.weight,
						achievedAt: set.createdAt,
						sourceSetId: set._id,
					};
				}
			}

			if (set.reps != null) {
				if (
					!bestReps ||
					set.reps > bestReps.value ||
					(set.reps === bestReps.value && set.createdAt > bestReps.achievedAt)
				) {
					bestReps = {
						value: set.reps,
						achievedAt: set.createdAt,
						sourceSetId: set._id,
					};
				}
			}
		}
	}

	await setRecordValueOrDelete(ctx, {
		tokenIdentifier: params.tokenIdentifier,
		exerciseId: params.exerciseId,
		recordType: PR_RECORD_TYPE_MAX_WEIGHT,
		best: bestWeight,
	});

	await setRecordValueOrDelete(ctx, {
		tokenIdentifier: params.tokenIdentifier,
		exerciseId: params.exerciseId,
		recordType: PR_RECORD_TYPE_MAX_REPS,
		best: bestReps,
	});
}

export const listByExercise = query({
	args: {
		exerciseId: v.id("exercises"),
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const tokenIdentifier = await requireTokenIdentifier(ctx);
		const exercise = await ctx.db.get(args.exerciseId);
		if (!exercise) {
			return [];
		}

		const limit = Math.min(Math.max(args.limit ?? 20, 1), 100);
		const candidates = await ctx.db
			.query("personalRecords")
			.withIndex("by_ownerTokenIdentifier_and_exerciseId_and_recordType", (q) =>
				q
					.eq("ownerTokenIdentifier", tokenIdentifier)
					.eq("exerciseId", args.exerciseId),
			)
			.take(limit);

		return candidates;
	},
});

export const listBestByMuscleGroup = query({
	args: {
		recordLimit: v.optional(v.number()),
		limitPerGroup: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const tokenIdentifier = await requireTokenIdentifier(ctx);
		const recordLimit = Math.min(Math.max(args.recordLimit ?? 300, 1), 1000);
		const limitPerGroup = Math.min(Math.max(args.limitPerGroup ?? 3, 1), 10);

		const records = await ctx.db
			.query("personalRecords")
			.withIndex("by_ownerTokenIdentifier_and_exerciseId_and_recordType", (q) =>
				q.eq("ownerTokenIdentifier", tokenIdentifier),
			)
			.take(recordLimit);

		const exerciseCache = new Map<string, Doc<"exercises"> | null>();
		const muscleGroupCache = new Map<string, Doc<"muscleGroups"> | null>();

		type BestEntry = {
			exerciseId: (typeof records)[number]["exerciseId"];
			exerciseName: string;
			recordType: string;
			value: number;
			achievedAt: number;
		};

		const grouped = new Map<string, { muscleGroupName: string; items: Map<string, BestEntry> }>();

		for (const record of records) {
			const exerciseKey = String(record.exerciseId);
			let exercise = exerciseCache.get(exerciseKey);
			if (exercise === undefined) {
				exercise = await ctx.db.get(record.exerciseId);
				exerciseCache.set(exerciseKey, exercise);
			}
			if (!exercise) {
				continue;
			}

			let muscleGroupKey = "uncategorized";
			let muscleGroupName = "Uncategorized";

			if (exercise.muscleGroup) {
				const groupKey = String(exercise.muscleGroup);
				let muscleGroup = muscleGroupCache.get(groupKey);
				if (muscleGroup === undefined) {
					muscleGroup = await ctx.db.get(exercise.muscleGroup);
					muscleGroupCache.set(groupKey, muscleGroup);
				}

				if (muscleGroup) {
					muscleGroupKey = groupKey;
					muscleGroupName = muscleGroup.name;
				}
			}

			let group = grouped.get(muscleGroupKey);
			if (!group) {
				group = {
					muscleGroupName,
					items: new Map<string, BestEntry>(),
				};
				grouped.set(muscleGroupKey, group);
			}

			const itemKey = `${String(record.exerciseId)}:${record.recordType}`;
			const existing = group.items.get(itemKey);
			if (
				!existing ||
				record.value > existing.value ||
				(record.value === existing.value && record.achievedAt > existing.achievedAt)
			) {
				group.items.set(itemKey, {
					exerciseId: record.exerciseId,
					exerciseName: exercise.name,
					recordType: record.recordType,
					value: record.value,
					achievedAt: record.achievedAt,
				});
			}
		}

		return Array.from(grouped.values())
			.map((group) => ({
				muscleGroupName: group.muscleGroupName,
				records: Array.from(group.items.values())
					.sort((a, b) => {
						if (b.value !== a.value) {
							return b.value - a.value;
						}
						return b.achievedAt - a.achievedAt;
					})
					.slice(0, limitPerGroup),
			}))
			.sort((a, b) => a.muscleGroupName.localeCompare(b.muscleGroupName));
	},
});

export const upsert = mutation({
	args: {
		exerciseId: v.id("exercises"),
		recordType: v.string(),
		value: v.number(),
		achievedAt: v.optional(v.number()),
		sourceSetId: v.optional(v.union(v.null(), v.id("sets"))),
	},
	handler: async (ctx, args) => {
		const tokenIdentifier = await requireTokenIdentifier(ctx);
		const exercise = await ctx.db.get(args.exerciseId);
		if (!exercise) {
			throw new Error("Exercise not found");
		}

		if (args.sourceSetId) {
			const sourceSet = await ctx.db.get(args.sourceSetId);
			if (!sourceSet) {
				throw new Error("Source set not found");
			}
			assertOwner(sourceSet.ownerTokenIdentifier, tokenIdentifier);
		}

		const now = Date.now();
		const existing = await ctx.db
			.query("personalRecords")
			.withIndex("by_ownerTokenIdentifier_and_exerciseId_and_recordType", (q) =>
				q
					.eq("ownerTokenIdentifier", tokenIdentifier)
					.eq("exerciseId", args.exerciseId)
					.eq("recordType", args.recordType),
			)
			.take(1);

		if (existing.length > 0) {
			const shouldUpdate =
				args.value > existing[0].value ||
				(args.value === existing[0].value &&
					(args.achievedAt ?? now) >= existing[0].achievedAt);
			if (!shouldUpdate) {
				return existing[0]._id;
			}

			await ctx.db.patch(existing[0]._id, {
				value: args.value,
				achievedAt: args.achievedAt ?? now,
				sourceSetId: args.sourceSetId ?? null,
				updatedAt: now,
			});
			return existing[0]._id;
		}

		return await ctx.db.insert("personalRecords", {
			ownerTokenIdentifier: tokenIdentifier,
			exerciseId: args.exerciseId,
			recordType: args.recordType,
			value: args.value,
			achievedAt: args.achievedAt ?? now,
			sourceSetId: args.sourceSetId ?? null,
			createdAt: now,
			updatedAt: now,
		});
	},
});
