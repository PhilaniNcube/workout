import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { assertOwner, requireTokenIdentifier } from "./lib/authz";

const nullableDate = v.optional(v.union(v.null(), v.number()));

export const list = query({
	args: {
		status: v.optional(v.string()),
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const tokenIdentifier = await requireTokenIdentifier(ctx);
		const limit = Math.min(Math.max(args.limit ?? 100, 1), 200);

		if (args.status) {
			return await ctx.db
				.query("goals")
				.withIndex("by_ownerTokenIdentifier_and_status", (q) =>
					q.eq("ownerTokenIdentifier", tokenIdentifier).eq("status", args.status!),
				)
				.take(limit);
		}

		return await ctx.db
			.query("goals")
			.withIndex("by_ownerTokenIdentifier_and_targetDate", (q) =>
				q.eq("ownerTokenIdentifier", tokenIdentifier),
			)
			.take(limit);
	},
});

export const create = mutation({
	args: {
		type: v.string(),
		exerciseId: v.optional(v.union(v.null(), v.id("exercises"))),
		targetValue: v.number(),
		targetDate: nullableDate,
		status: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const tokenIdentifier = await requireTokenIdentifier(ctx);
		if (args.exerciseId) {
			const exercise = await ctx.db.get(args.exerciseId);
			if (!exercise) {
				throw new Error("Exercise not found");
			}
		}

		const now = Date.now();
		return await ctx.db.insert("goals", {
			ownerTokenIdentifier: tokenIdentifier,
			type: args.type,
			exerciseId: args.exerciseId ?? null,
			targetValue: args.targetValue,
			targetDate: args.targetDate ?? null,
			status: args.status ?? "active",
			createdAt: now,
			updatedAt: now,
		});
	},
});

export const updateStatus = mutation({
	args: {
		goalId: v.id("goals"),
		status: v.string(),
	},
	handler: async (ctx, args) => {
		const tokenIdentifier = await requireTokenIdentifier(ctx);
		const goal = await ctx.db.get(args.goalId);
		if (!goal) {
			throw new Error("Goal not found");
		}
		assertOwner(goal.ownerTokenIdentifier, tokenIdentifier);
		await ctx.db.patch(args.goalId, {
			status: args.status,
			updatedAt: Date.now(),
		});
		return args.goalId;
	},
});
