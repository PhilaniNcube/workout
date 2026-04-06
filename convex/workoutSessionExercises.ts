import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { assertOwner, requireTokenIdentifier } from "./lib/authz";

const nullableString = v.optional(v.union(v.null(), v.string()));
const nullableNumber = v.optional(v.union(v.null(), v.number()));

export const add = mutation({
	args: {
		sessionId: v.id("workoutSessions"),
		exerciseId: v.id("exercises"),
		order: v.optional(v.number()),
		notes: nullableString,
	},
	handler: async (ctx, args) => {
		const tokenIdentifier = await requireTokenIdentifier(ctx);

		const session = await ctx.db.get(args.sessionId);
		if (!session) {
			throw new Error("Workout session not found");
		}
		assertOwner(session.ownerTokenIdentifier, tokenIdentifier);

		const exercise = await ctx.db.get(args.exerciseId);
		if (!exercise) {
			throw new Error("Exercise not found");
		}

		const existing = await ctx.db
			.query("workoutSessionExercises")
			.withIndex("by_ownerTokenIdentifier_and_workoutSessionId", (q) =>
				q
					.eq("ownerTokenIdentifier", tokenIdentifier)
					.eq("workoutSessionId", args.sessionId),
			)
			.take(200);

		return await ctx.db.insert("workoutSessionExercises", {
			ownerTokenIdentifier: tokenIdentifier,
			workoutSessionId: args.sessionId,
			exerciseId: args.exerciseId,
			order: args.order ?? existing.length + 1,
			notes: args.notes ?? null,
			createdAt: Date.now(),
		});
	},
});

export const addWithSet = mutation({
	args: {
		sessionId: v.id("workoutSessions"),
		exerciseId: v.id("exercises"),
		notes: nullableString,
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

		const session = await ctx.db.get(args.sessionId);
		if (!session) {
			throw new Error("Workout session not found");
		}
		assertOwner(session.ownerTokenIdentifier, tokenIdentifier);

		const exercise = await ctx.db.get(args.exerciseId);
		if (!exercise) {
			throw new Error("Exercise not found");
		}

		// Check if this exercise already exists in the session
		const existingEntries = await ctx.db
			.query("workoutSessionExercises")
			.withIndex("by_ownerTokenIdentifier_and_workoutSessionId", (q) =>
				q
					.eq("ownerTokenIdentifier", tokenIdentifier)
					.eq("workoutSessionId", args.sessionId),
			)
			.take(200);

		let sessionExerciseId = existingEntries.find(
			(e) => e.exerciseId === args.exerciseId,
		)?._id;

		// If exercise not yet in session, create it
		if (!sessionExerciseId) {
			sessionExerciseId = await ctx.db.insert("workoutSessionExercises", {
				ownerTokenIdentifier: tokenIdentifier,
				workoutSessionId: args.sessionId,
				exerciseId: args.exerciseId,
				order: existingEntries.length + 1,
				notes: args.notes ?? null,
				createdAt: Date.now(),
			});
		}

		// Count existing sets to determine the set number
		const existingSets = await ctx.db
			.query("sets")
			.withIndex("by_ownerTokenIdentifier_and_workoutSessionExerciseId", (q) =>
				q
					.eq("ownerTokenIdentifier", tokenIdentifier)
					.eq("workoutSessionExerciseId", sessionExerciseId),
			)
			.take(200);

		const setId = await ctx.db.insert("sets", {
			ownerTokenIdentifier: tokenIdentifier,
			workoutSessionExerciseId: sessionExerciseId,
			setNumber: existingSets.length + 1,
			reps: args.reps ?? null,
			weight: args.weight ?? null,
			durationSeconds: args.durationSeconds ?? null,
			distance: args.distance ?? null,
			restSeconds: args.restSeconds ?? null,
			rir: args.rir ?? null,
			effortLevel: args.effortLevel ?? null,
			isWarmup: args.isWarmup ?? false,
			createdAt: Date.now(),
		});

		return { sessionExerciseId, setId };
	},
});

export const listForSession = query({
	args: {
		sessionId: v.id("workoutSessions"),
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const tokenIdentifier = await requireTokenIdentifier(ctx);
		const session = await ctx.db.get(args.sessionId);
		if (!session) {
			return [];
		}
		assertOwner(session.ownerTokenIdentifier, tokenIdentifier);
		const limit = Math.min(Math.max(args.limit ?? 100, 1), 200);
		return await ctx.db
			.query("workoutSessionExercises")
			.withIndex("by_ownerTokenIdentifier_and_workoutSessionId", (q) =>
				q
					.eq("ownerTokenIdentifier", tokenIdentifier)
					.eq("workoutSessionId", args.sessionId),
			)
			.take(limit);
	},
});

export const remove = mutation({
	args: {
		sessionExerciseId: v.id("workoutSessionExercises"),
	},
	handler: async (ctx, args) => {
		const tokenIdentifier = await requireTokenIdentifier(ctx);
		const sessionExercise = await ctx.db.get(args.sessionExerciseId);
		if (!sessionExercise) {
			throw new Error("Session exercise not found");
		}
		assertOwner(sessionExercise.ownerTokenIdentifier, tokenIdentifier);

		// Delete all associated sets
		const sets = await ctx.db
			.query("sets")
			.withIndex("by_ownerTokenIdentifier_and_workoutSessionExerciseId", (q) =>
				q
					.eq("ownerTokenIdentifier", tokenIdentifier)
					.eq("workoutSessionExerciseId", args.sessionExerciseId),
			)
			.collect();
		for (const set of sets) {
			await ctx.db.delete(set._id);
		}

		await ctx.db.delete(args.sessionExerciseId);
	},
});
