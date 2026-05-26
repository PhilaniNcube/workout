import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { assertOwner, requireTokenIdentifier } from "./lib/authz";

const nullableString = v.optional(v.union(v.null(), v.string()));

export const list = query({
	args: {},
	handler: async (ctx) => {
		const tokenIdentifier = await requireTokenIdentifier(ctx);
		return await ctx.db
			.query("workoutTemplates")
			.withIndex("by_ownerTokenIdentifier", (q) =>
				q.eq("ownerTokenIdentifier", tokenIdentifier),
			)
			.order("desc")
			.take(50);
	},
});

export const getWithExercises = query({
	args: { templateId: v.id("workoutTemplates") },
	handler: async (ctx, args) => {
		const tokenIdentifier = await requireTokenIdentifier(ctx);
		const template = await ctx.db.get(args.templateId);
		if (!template) return null;
		assertOwner(template.ownerTokenIdentifier, tokenIdentifier);

		const entries = await ctx.db
			.query("workoutTemplateExercises")
			.withIndex("by_ownerTokenIdentifier_and_templateId", (q) =>
				q
					.eq("ownerTokenIdentifier", tokenIdentifier)
					.eq("templateId", args.templateId),
			)
			.order("asc")
			.take(50);

		return { template, exercises: entries };
	},
});

export const create = mutation({
	args: {
		name: v.string(),
		notes: nullableString,
		exerciseIds: v.array(v.id("exercises")),
	},
	handler: async (ctx, args) => {
		const tokenIdentifier = await requireTokenIdentifier(ctx);
		const now = Date.now();

		const templateId = await ctx.db.insert("workoutTemplates", {
			ownerTokenIdentifier: tokenIdentifier,
			name: args.name,
			notes: args.notes ?? null,
			createdAt: now,
			updatedAt: now,
		});

		for (let i = 0; i < args.exerciseIds.length; i++) {
			await ctx.db.insert("workoutTemplateExercises", {
				ownerTokenIdentifier: tokenIdentifier,
				templateId,
				exerciseId: args.exerciseIds[i],
				order: i,
				notes: null,
				createdAt: now,
			});
		}

		return templateId;
	},
});

export const createFromSession = mutation({
	args: {
		name: v.string(),
		notes: nullableString,
		sessionId: v.id("workoutSessions"),
	},
	handler: async (ctx, args) => {
		const tokenIdentifier = await requireTokenIdentifier(ctx);
		const session = await ctx.db.get(args.sessionId);
		if (!session) throw new Error("Session not found");
		assertOwner(session.ownerTokenIdentifier, tokenIdentifier);

		const entries = await ctx.db
			.query("workoutSessionExercises")
			.withIndex("by_ownerTokenIdentifier_and_workoutSessionId", (q) =>
				q
					.eq("ownerTokenIdentifier", tokenIdentifier)
					.eq("workoutSessionId", args.sessionId),
			)
			.order("asc")
			.take(50);

		const now = Date.now();
		const templateId = await ctx.db.insert("workoutTemplates", {
			ownerTokenIdentifier: tokenIdentifier,
			name: args.name,
			notes: args.notes ?? session.notes,
			createdAt: now,
			updatedAt: now,
		});

		for (let i = 0; i < entries.length; i++) {
			await ctx.db.insert("workoutTemplateExercises", {
				ownerTokenIdentifier: tokenIdentifier,
				templateId,
				exerciseId: entries[i].exerciseId,
				order: i,
				notes: entries[i].notes,
				createdAt: now,
			});
		}

		return templateId;
	},
});

export const remove = mutation({
	args: { templateId: v.id("workoutTemplates") },
	handler: async (ctx, args) => {
		const tokenIdentifier = await requireTokenIdentifier(ctx);
		const template = await ctx.db.get(args.templateId);
		if (!template) throw new Error("Template not found");
		assertOwner(template.ownerTokenIdentifier, tokenIdentifier);

		const entries = await ctx.db
			.query("workoutTemplateExercises")
			.withIndex("by_ownerTokenIdentifier_and_templateId", (q) =>
				q
					.eq("ownerTokenIdentifier", tokenIdentifier)
					.eq("templateId", args.templateId),
			)
			.take(100);

		for (const entry of entries) {
			await ctx.db.delete(entry._id);
		}
		await ctx.db.delete(args.templateId);
	},
});

export const startFromTemplate = mutation({
	args: {
		templateId: v.id("workoutTemplates"),
		startedAt: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const tokenIdentifier = await requireTokenIdentifier(ctx);
		const template = await ctx.db.get(args.templateId);
		if (!template) throw new Error("Template not found");
		assertOwner(template.ownerTokenIdentifier, tokenIdentifier);

		const entries = await ctx.db
			.query("workoutTemplateExercises")
			.withIndex("by_ownerTokenIdentifier_and_templateId", (q) =>
				q
					.eq("ownerTokenIdentifier", tokenIdentifier)
					.eq("templateId", args.templateId),
			)
			.order("asc")
			.take(50);

		const now = Date.now();
		const sessionId = await ctx.db.insert("workoutSessions", {
			ownerTokenIdentifier: tokenIdentifier,
			startedAt: args.startedAt ?? now,
			endedAt: null,
			notes: template.notes,
			perceivedEffort: null,
			createdAt: now,
			updatedAt: now,
		});

		for (let i = 0; i < entries.length; i++) {
			await ctx.db.insert("workoutSessionExercises", {
				ownerTokenIdentifier: tokenIdentifier,
				workoutSessionId: sessionId,
				exerciseId: entries[i].exerciseId,
				order: i,
				notes: entries[i].notes,
				createdAt: now,
			});
		}

		return sessionId;
	},
});
