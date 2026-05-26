/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as bodyMetrics from "../bodyMetrics.js";
import type * as exercises from "../exercises.js";
import type * as goals from "../goals.js";
import type * as http from "../http.js";
import type * as lib_authz from "../lib/authz.js";
import type * as muscleGroups from "../muscleGroups.js";
import type * as personalRecords from "../personalRecords.js";
import type * as search from "../search.js";
import type * as sets from "../sets.js";
import type * as stats from "../stats.js";
import type * as workoutSessionExercises from "../workoutSessionExercises.js";
import type * as workoutSessions from "../workoutSessions.js";
import type * as workoutTemplates from "../workoutTemplates.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  bodyMetrics: typeof bodyMetrics;
  exercises: typeof exercises;
  goals: typeof goals;
  http: typeof http;
  "lib/authz": typeof lib_authz;
  muscleGroups: typeof muscleGroups;
  personalRecords: typeof personalRecords;
  search: typeof search;
  sets: typeof sets;
  stats: typeof stats;
  workoutSessionExercises: typeof workoutSessionExercises;
  workoutSessions: typeof workoutSessions;
  workoutTemplates: typeof workoutTemplates;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  betterAuth: import("@convex-dev/better-auth/_generated/component.js").ComponentApi<"betterAuth">;
};
