import { v } from "convex/values"
import { Id } from "./_generated/dataModel"
import { mutation, query } from "./_generated/server"

function normalizeName(name: string): string {
  return name.trim()
}

export const generateIllustrationUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl()
  },
})

export const list = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 50, 1), 200)
    const muscleGroups = await ctx.db
      .query("muscleGroups")
      .withIndex("by_name")
      .take(limit)

    return await Promise.all(
      muscleGroups.map(async (muscleGroup) => ({
        ...muscleGroup,
        illustrationUrl: muscleGroup.illustrationStorageId
          ? await ctx.storage.getUrl(muscleGroup.illustrationStorageId)
          : null,
      }))
    )
  },
})

export const getById = query({
  args: {
    muscleGroupId: v.id("muscleGroups"),
  },
  handler: async (ctx, args) => {
    const muscleGroup = await ctx.db.get(args.muscleGroupId)
    if (!muscleGroup) {
      return null
    }

    return {
      ...muscleGroup,
      illustrationUrl: muscleGroup.illustrationStorageId
        ? await ctx.storage.getUrl(muscleGroup.illustrationStorageId)
        : null,
    }
  },
})

export const create = mutation({
  args: {
    name: v.string(),
    illustrationStorageId: v.optional(v.union(v.null(), v.id("_storage"))),
    category: v.optional(v.union(v.null(), v.string())),
    region: v.optional(v.union(v.null(), v.string())),
  },
  handler: async (ctx, args) => {
    const name = normalizeName(args.name)
    if (!name) {
      throw new Error("Muscle group name is required")
    }

    const existing = await ctx.db
      .query("muscleGroups")
      .withIndex("by_name", (q) => q.eq("name", name))
      .unique()

    if (existing) {
      throw new Error("A muscle group with this name already exists")
    }

    const now = Date.now()
    return await ctx.db.insert("muscleGroups", {
      name,
      ...(args.illustrationStorageId !== undefined
        ? { illustrationStorageId: args.illustrationStorageId }
        : {}),
      category: args.category ?? null,
      region: args.region ?? null,
      createdAt: now,
      updatedAt: now,
    })
  },
})

export const update = mutation({
  args: {
    muscleGroupId: v.id("muscleGroups"),
    name: v.string(),
    illustrationStorageId: v.optional(v.union(v.null(), v.id("_storage"))),
    category: v.optional(v.union(v.null(), v.string())),
    region: v.optional(v.union(v.null(), v.string())),
  },
  handler: async (ctx, args) => {
    const name = normalizeName(args.name)
    if (!name) {
      throw new Error("Muscle group name is required")
    }

    const muscleGroup = await ctx.db.get(args.muscleGroupId)
    if (!muscleGroup) {
      throw new Error("Muscle group not found")
    }

    const existing = await ctx.db
      .query("muscleGroups")
      .withIndex("by_name", (q) => q.eq("name", name))
      .unique()

    if (existing && existing._id !== args.muscleGroupId) {
      throw new Error("A muscle group with this name already exists")
    }

    const patch: {
      name: string
      updatedAt: number
      illustrationStorageId?: Id<"_storage"> | null
      category?: string | null
      region?: string | null
    } = {
      name,
      updatedAt: Date.now(),
    }

    if (args.illustrationStorageId !== undefined) {
      patch.illustrationStorageId = args.illustrationStorageId
    }
    if (args.category !== undefined) {
      patch.category = args.category
    }
    if (args.region !== undefined) {
      patch.region = args.region
    }

    await ctx.db.patch(args.muscleGroupId, patch)

    return args.muscleGroupId
  },
})

// One-time migration helper: remove legacy ownerTokenIdentifier from global muscle groups.
export const removeLegacyOwnerTokenIdentifier = mutation({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 200, 1), 500)
    const muscleGroups = await ctx.db.query("muscleGroups").take(limit)

    let updated = 0
    for (const muscleGroup of muscleGroups) {
      if (!("ownerTokenIdentifier" in muscleGroup)) {
        continue
      }

      await ctx.db.replace(muscleGroup._id, {
        name: muscleGroup.name,
        ...(muscleGroup.illustrationStorageId !== undefined
          ? { illustrationStorageId: muscleGroup.illustrationStorageId }
          : {}),
        createdAt: muscleGroup.createdAt,
        updatedAt: muscleGroup.updatedAt,
      })
      updated += 1
    }

    return {
      processed: muscleGroups.length,
      updated,
      hasMore: muscleGroups.length === limit,
    }
  },
})

const MUSCLE_CATEGORY_MAP: Record<
  string,
  { category: string; region: string }
> = {
  chest: { category: "push", region: "upper" },
  "upper chest": { category: "push", region: "upper" },
  shoulders: { category: "push", region: "upper" },
  "front delts": { category: "push", region: "upper" },
  "side delts": { category: "push", region: "upper" },
  "lateral delts": { category: "push", region: "upper" },
  triceps: { category: "push", region: "upper" },
  back: { category: "pull", region: "upper" },
  lats: { category: "pull", region: "upper" },
  "upper back": { category: "pull", region: "upper" },
  "mid back": { category: "pull", region: "upper" },
  "rear delts": { category: "pull", region: "upper" },
  traps: { category: "pull", region: "upper" },
  biceps: { category: "pull", region: "upper" },
  forearms: { category: "pull", region: "upper" },
  "lower back": { category: "pull", region: "core" },
  quads: { category: "legs", region: "lower" },
  quadriceps: { category: "legs", region: "lower" },
  hamstrings: { category: "legs", region: "lower" },
  glutes: { category: "legs", region: "lower" },
  calves: { category: "legs", region: "lower" },
  "hip abductors": { category: "legs", region: "lower" },
  "hip adductors": { category: "legs", region: "lower" },
  abs: { category: "core", region: "core" },
  abdominals: { category: "core", region: "core" },
  obliques: { category: "core", region: "core" },
  core: { category: "core", region: "core" },
  cardio: { category: "cardio", region: "full" },
  "full body": { category: "full", region: "full" },
  neck: { category: "pull", region: "upper" },
}

export const populateCategories = mutation({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 200, 1), 500)
    const muscleGroups = await ctx.db.query("muscleGroups").take(limit)

    let updated = 0
    let skipped = 0
    for (const muscleGroup of muscleGroups) {
      const lower = muscleGroup.name.toLowerCase().trim()
      const mapping = MUSCLE_CATEGORY_MAP[lower]

      if (mapping) {
        await ctx.db.patch(muscleGroup._id, {
          category: mapping.category,
          region: mapping.region,
          updatedAt: Date.now(),
        })
        updated += 1
      } else {
        skipped += 1
      }
    }

    return {
      processed: muscleGroups.length,
      updated,
      skipped,
      hasMore: muscleGroups.length === limit,
    }
  },
})
