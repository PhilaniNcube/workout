import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { requireTokenIdentifier } from "./lib/authz";

const nullableString = v.optional(v.union(v.null(), v.string()));
const nullableMuscleGroupId = v.optional(v.union(v.null(), v.id("muscleGroups")));

export const list = query({
	args: {
		includeArchived: v.optional(v.boolean()),
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		await requireTokenIdentifier(ctx);
		const limit = Math.min(Math.max(args.limit ?? 50, 1), 100);

		if (args.includeArchived) {
			return await ctx.db
				.query("exercises")
				.withIndex("by_name")
				.take(limit);
		}

		return await ctx.db
			.query("exercises")
			.withIndex("by_isArchived", (q) => q.eq("isArchived", false))
			.take(limit);
	},
});

export const get = query({
	args: { exerciseId: v.id("exercises") },
	handler: async (ctx, args) => {
		await requireTokenIdentifier(ctx);
		const exercise = await ctx.db.get(args.exerciseId);
		if (!exercise) {
			return null;
		}
		return exercise;
	},
});

export const create = mutation({
	args: {
		name: v.string(),
		muscleGroup: nullableMuscleGroupId,
		equipment: nullableString,
	},
	handler: async (ctx, args) => {
		await requireTokenIdentifier(ctx);
		const now = Date.now();
		return await ctx.db.insert("exercises", {
			name: args.name,
			muscleGroup: args.muscleGroup ?? null,
			equipment: args.equipment ?? null,
			isArchived: false,
			createdAt: now,
			updatedAt: now,
		});
	},
});

export const update = mutation({
	args: {
		exerciseId: v.id("exercises"),
		name: v.optional(v.string()),
		muscleGroup: nullableMuscleGroupId,
		equipment: nullableString,
	},
	handler: async (ctx, args) => {
		await requireTokenIdentifier(ctx);
		const exercise = await ctx.db.get(args.exerciseId);
		if (!exercise) {
			throw new Error("Exercise not found");
		}

		const patch: {
			name?: string;
			muscleGroup?: Id<"muscleGroups"> | null;
			equipment?: string | null;
			updatedAt: number;
		} = {
			updatedAt: Date.now(),
		};

		if (args.name !== undefined) {
			patch.name = args.name;
		}
		if (args.muscleGroup !== undefined) {
			patch.muscleGroup = args.muscleGroup;
		}
		if (args.equipment !== undefined) {
			patch.equipment = args.equipment;
		}

		await ctx.db.patch(args.exerciseId, patch);
		return args.exerciseId;
	},
});

export const archive = mutation({
	args: {
		exerciseId: v.id("exercises"),
		isArchived: v.boolean(),
	},
	handler: async (ctx, args) => {
		await requireTokenIdentifier(ctx);
		const exercise = await ctx.db.get(args.exerciseId);
		if (!exercise) {
			throw new Error("Exercise not found");
		}
		await ctx.db.patch(args.exerciseId, {
			isArchived: args.isArchived,
			updatedAt: Date.now(),
		});
		return args.exerciseId;
	},
});
