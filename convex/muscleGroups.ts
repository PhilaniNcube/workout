import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";

function normalizeName(name: string): string {
	return name.trim();
}

export const generateIllustrationUploadUrl = mutation({
	args: {},
	handler: async (ctx) => {
		return await ctx.storage.generateUploadUrl();
	},
});

export const list = query({
	args: { limit: v.optional(v.number()) },
	handler: async (ctx, args) => {
		const limit = Math.min(Math.max(args.limit ?? 50, 1), 200);
		const muscleGroups = await ctx.db
			.query("muscleGroups")
			.withIndex("by_name")
			.take(limit);

		return await Promise.all(
			muscleGroups.map(async (muscleGroup) => ({
				...muscleGroup,
				illustrationUrl: muscleGroup.illustrationStorageId
					? await ctx.storage.getUrl(muscleGroup.illustrationStorageId)
					: null,
			})),
		);
	},
});

export const getById = query({
	args: {
		muscleGroupId: v.id("muscleGroups"),
	},
	handler: async (ctx, args) => {
		const muscleGroup = await ctx.db.get(args.muscleGroupId);
		if (!muscleGroup) {
			return null;
		}

		return {
			...muscleGroup,
			illustrationUrl: muscleGroup.illustrationStorageId
				? await ctx.storage.getUrl(muscleGroup.illustrationStorageId)
				: null,
		};
	},
});

export const create = mutation({
	args: {
		name: v.string(),
		illustrationStorageId: v.optional(v.union(v.null(), v.id("_storage"))),
	},
	handler: async (ctx, args) => {
		const name = normalizeName(args.name);
		if (!name) {
			throw new Error("Muscle group name is required");
		}

		const existing = await ctx.db
			.query("muscleGroups")
			.withIndex("by_name", (q) => q.eq("name", name))
			.unique();

		if (existing) {
			throw new Error("A muscle group with this name already exists");
		}

		const now = Date.now();
		return await ctx.db.insert("muscleGroups", {
			name,
			...(args.illustrationStorageId !== undefined
				? { illustrationStorageId: args.illustrationStorageId }
				: {}),
			createdAt: now,
			updatedAt: now,
		});
	},
});

export const update = mutation({
	args: {
		muscleGroupId: v.id("muscleGroups"),
		name: v.string(),
		illustrationStorageId: v.optional(v.union(v.null(), v.id("_storage"))),
	},
	handler: async (ctx, args) => {
		const name = normalizeName(args.name);
		if (!name) {
			throw new Error("Muscle group name is required");
		}

		const muscleGroup = await ctx.db.get(args.muscleGroupId);
		if (!muscleGroup) {
			throw new Error("Muscle group not found");
		}

		const existing = await ctx.db
			.query("muscleGroups")
			.withIndex("by_name", (q) => q.eq("name", name))
			.unique();

		if (existing && existing._id !== args.muscleGroupId) {
			throw new Error("A muscle group with this name already exists");
		}

		const patch: {
			name: string;
			updatedAt: number;
			illustrationStorageId?: Id<"_storage"> | null;
		} = {
			name,
			updatedAt: Date.now(),
		};

		if (args.illustrationStorageId !== undefined) {
			patch.illustrationStorageId = args.illustrationStorageId;
		}

		await ctx.db.patch(args.muscleGroupId, patch);

		return args.muscleGroupId;
	},
});

// One-time migration helper: remove legacy ownerTokenIdentifier from global muscle groups.
export const removeLegacyOwnerTokenIdentifier = mutation({
	args: {
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const limit = Math.min(Math.max(args.limit ?? 200, 1), 500);
		const muscleGroups = await ctx.db.query("muscleGroups").take(limit);

		let updated = 0;
		for (const muscleGroup of muscleGroups) {
			if (!("ownerTokenIdentifier" in muscleGroup)) {
				continue;
			}

			await ctx.db.replace(muscleGroup._id, {
				name: muscleGroup.name,
				...(muscleGroup.illustrationStorageId !== undefined
					? { illustrationStorageId: muscleGroup.illustrationStorageId }
					: {}),
				createdAt: muscleGroup.createdAt,
				updatedAt: muscleGroup.updatedAt,
			});
			updated += 1;
		}

		return {
			processed: muscleGroups.length,
			updated,
			hasMore: muscleGroups.length === limit,
		};
	},
});