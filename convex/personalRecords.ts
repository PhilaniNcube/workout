import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { assertOwner, requireTokenIdentifier } from "./lib/authz";

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
