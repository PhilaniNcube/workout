import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { assertOwner, requireTokenIdentifier } from "./lib/authz";
import {
	recomputeSetDerivedRecordsForExercise,
	upsertSetDerivedRecords,
} from "./personalRecords";

const nullableNumber = v.optional(v.union(v.null(), v.number()));

export const add = mutation({
	args: {
		workoutSessionExerciseId: v.id("workoutSessionExercises"),
		setNumber: v.number(),
		reps: nullableNumber,
		weight: nullableNumber,
		durationSeconds: nullableNumber,
		distance: nullableNumber,
		restSeconds: nullableNumber,
		rir: nullableNumber,
		effortLevel: nullableNumber,
		isWarmup: v.optional(v.boolean()),
	},
	handler: async (ctx, args) => {
		const tokenIdentifier = await requireTokenIdentifier(ctx);
		const sessionExercise = await ctx.db.get(args.workoutSessionExerciseId);
		if (!sessionExercise) {
			throw new Error("Workout session exercise not found");
		}
		assertOwner(sessionExercise.ownerTokenIdentifier, tokenIdentifier);

		const createdAt = Date.now();
		const setId = await ctx.db.insert("sets", {
			ownerTokenIdentifier: tokenIdentifier,
			workoutSessionExerciseId: args.workoutSessionExerciseId,
			setNumber: args.setNumber,
			reps: args.reps ?? null,
			weight: args.weight ?? null,
			durationSeconds: args.durationSeconds ?? null,
			distance: args.distance ?? null,
			restSeconds: args.restSeconds ?? null,
			rir: args.rir ?? null,
			effortLevel: args.effortLevel ?? null,
			isWarmup: args.isWarmup ?? false,
			createdAt,
		});

		await upsertSetDerivedRecords(ctx, {
			tokenIdentifier,
			exerciseId: sessionExercise.exerciseId,
			setId,
			createdAt,
			weight: args.weight ?? null,
			reps: args.reps ?? null,
		});

		return setId;
	},
});

export const listForSessionExercise = query({
	args: {
		workoutSessionExerciseId: v.id("workoutSessionExercises"),
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const tokenIdentifier = await requireTokenIdentifier(ctx);
		const sessionExercise = await ctx.db.get(args.workoutSessionExerciseId);
		if (!sessionExercise) {
			return [];
		}
		assertOwner(sessionExercise.ownerTokenIdentifier, tokenIdentifier);
		const limit = Math.min(Math.max(args.limit ?? 100, 1), 200);
		return await ctx.db
			.query("sets")
			.withIndex("by_ownerTokenIdentifier_and_workoutSessionExerciseId", (q) =>
				q
					.eq("ownerTokenIdentifier", tokenIdentifier)
					.eq("workoutSessionExerciseId", args.workoutSessionExerciseId),
			)
			.take(limit);
	},
});


export const remove = mutation({
	args: {
		setId: v.id("sets"),
	},
	handler: async (ctx, args) => {
		const tokenIdentifier = await requireTokenIdentifier(ctx);
		const set = await ctx.db.get(args.setId);
		if (!set) {
			throw new Error("Set not found");
		}
		assertOwner(set.ownerTokenIdentifier, tokenIdentifier);
		const sessionExercise = await ctx.db.get(set.workoutSessionExerciseId);
		if (!sessionExercise) {
			throw new Error("Workout session exercise not found");
		}
		await ctx.db.delete(args.setId);

		await recomputeSetDerivedRecordsForExercise(ctx, {
			tokenIdentifier,
			exerciseId: sessionExercise.exerciseId,
		});
	},
});
