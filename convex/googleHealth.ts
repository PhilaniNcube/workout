import {
  action,
  internalMutation,
  internalQuery,
  mutation,
} from "./_generated/server"
import { v } from "convex/values"
import { components } from "./_generated/api"
import { internal } from "./_generated/api"
import { authComponent } from "./auth"

/**
 * Internal query to fetch the Google account of the currently authenticated user.
 */
export const getGoogleAccount = internalQuery({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx)
    if (!user) {
      return null
    }

    const account = await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: "account",
      where: [
        { field: "userId", value: user._id },
        { field: "providerId", value: "google" },
      ],
    })

    return account
  },
})

/**
 * Internal mutation to update the access token (and optionally refresh token) in the component database.
 */
export const updateGoogleAccount = internalMutation({
  args: {
    accountId: v.string(),
    accessToken: v.string(),
    accessTokenExpiresAt: v.number(),
    refreshToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.runMutation(components.betterAuth.adapter.updateOne, {
      input: {
        model: "account",
        where: [{ field: "_id", value: args.accountId }],
        update: {
          accessToken: args.accessToken,
          accessTokenExpiresAt: args.accessTokenExpiresAt,
          ...(args.refreshToken ? { refreshToken: args.refreshToken } : {}),
          updatedAt: Date.now(),
        },
      },
    })
  },
})

/**
 * Public action to retrieve step counts and heart rates from the Google Health API.
 * Automatically refreshes the OAuth access token if expired.
 */
export const fetchGoogleHealthData = action({
  args: {},
  handler: async (ctx) => {
    // 1. Get the user's Google account tokens
    const account = await ctx.runQuery(internal.googleHealth.getGoogleAccount)
    if (!account) {
      return { status: "unlinked" }
    }

    let accessToken = account.accessToken
    const expiresAt = account.accessTokenExpiresAt ?? 0

    // Check if token is expired or expires in the next 5 minutes
    const isExpired = expiresAt - 300000 < Date.now()

    if (isExpired && account.refreshToken) {
      console.log(
        "Google Health access token expired or expiring soon. Refreshing..."
      )
      try {
        const response = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            client_id: process.env.CLIENT_ID!,
            client_secret: process.env.CLIENT_SECRET!,
            refresh_token: account.refreshToken,
            grant_type: "refresh_token",
          }),
        })

        if (!response.ok) {
          const errText = await response.text()
          throw new Error(`Failed to refresh Google OAuth token: ${errText}`)
        }

        const data = await response.json()
        accessToken = data.access_token
        const newExpiresAt = Date.now() + data.expires_in * 1000
        const newRefreshToken = data.refresh_token

        // Persist the refreshed token
        await ctx.runMutation(internal.googleHealth.updateGoogleAccount, {
          accountId: account._id,
          accessToken,
          accessTokenExpiresAt: newExpiresAt,
          refreshToken: newRefreshToken,
        })
        console.log("Google Health access token successfully refreshed.")
      } catch (err) {
        console.error("Error refreshing Google OAuth token:", err)
      }
    }

    if (!accessToken) {
      return { status: "error", message: "No access token available." }
    }

    // 2. Fetch data from the APIs
    try {
      const now = new Date()
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)

      const start = {
        date: {
          year: now.getUTCFullYear(),
          month: now.getUTCMonth() + 1,
          day: now.getUTCDate(),
        },
      }
      const end = {
        date: {
          year: tomorrow.getUTCFullYear(),
          month: tomorrow.getUTCMonth() + 1,
          day: tomorrow.getUTCDate(),
        },
      }

      // ── Steps (Google Health API) ──
      let steps = 0
      let fetchedStepsSuccessfully = false
      try {
        const response = await fetch(
          "https://health.googleapis.com/v4/users/me/dataTypes/steps/dataPoints:dailyRollUp",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              range: { start, end },
              windowSizeDays: 1,
            }),
          }
        )

        if (response.ok) {
          const data = await response.json()
          const rollupPoints =
            data.dailyRollupDataPoints || data.dataPoints || []
          if (rollupPoints.length > 0) {
            const point = rollupPoints[0]
            const rawSteps =
              point.steps?.countSum ?? point.value?.steps?.countSum ?? "0"
            steps = parseInt(rawSteps, 10)
          }
          fetchedStepsSuccessfully = true
        } else {
          const errText = await response.text()
          console.warn(
            `Steps API returned status ${response.status}: ${errText}`
          )
        }
      } catch (err: any) {
        console.warn(
          "Failed fetching steps from live Google Health API:",
          err.message
        )
      }

      // ── Heart Rate ──
      // Priority: Google Fit REST API → Google Health data sources → Google Health daily roll-up
      let heartRate = 72
      let fetchedHRSuccessfully = false

      const hrFetch = async () => {
        // Try 1: Google Fit REST API (where Mi Fitness data lives)
        try {
          const nowMs = Date.now()
          const threeDaysAgoMs = nowMs - 3 * 24 * 60 * 60 * 1000

          const fitResponse = await fetch(
            "https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                aggregateBy: [{ dataTypeName: "com.google.heart_rate.bpm" }],
                startTimeMillis: threeDaysAgoMs,
                endTimeMillis: nowMs,
              }),
            }
          )

          if (fitResponse.ok) {
            const fitData = await fitResponse.json()
            const buckets = fitData.bucket ?? []

            let allPoints: any[] = []
            for (const bucket of buckets) {
              for (const dataset of bucket.dataset ?? []) {
                for (const point of dataset.point ?? []) {
                  allPoints.push(point)
                }
              }
            }

            if (allPoints.length > 0) {
              const latest = allPoints.reduce((best: any, p: any) => {
                const pe = BigInt(p.endTimeNanos ?? "0")
                const be = BigInt(best.endTimeNanos ?? "0")
                return pe > be ? p : best
              }, allPoints[0])

              const valArr = latest.value
              if (valArr && valArr.length > 0) {
                const bpmVal = valArr[0].fpVal ?? valArr[0].intVal
                if (bpmVal != null && bpmVal > 0) {
                  heartRate = Math.round(bpmVal)
                  fetchedHRSuccessfully = true
                  console.log(
                    `Latest heart rate from Google Fit: ${heartRate} bpm`
                  )
                  return
                }
              }
            }
          } else {
            console.warn(
              `Google Fit heart rate returned status ${fitResponse.status}`
            )
          }
        } catch (err: any) {
          console.warn(
            "Could not fetch heart rate from Google Fit:",
            err.message
          )
        }

        // Try 2: Google Health data sources
        try {
          const dsResponse = await fetch(
            "https://health.googleapis.com/v4/users/me/dataSources",
            {
              headers: { Authorization: `Bearer ${accessToken}` },
            }
          )

          if (dsResponse.ok) {
            const dsData = await dsResponse.json()
            const sources = dsData.dataSource ?? []

            const hrSources = sources.filter(
              (ds: any) =>
                ds.dataType?.name === "com.google.heart_rate.bpm" &&
                ds.dataStreamId
            )

            const nowNs = BigInt(Date.now()) * BigInt("1000000")
            const threeDaysAgoNs =
              BigInt(Date.now() - 3 * 24 * 60 * 60 * 1000) * BigInt("1000000")

            for (const ds of hrSources.slice(0, 5)) {
              try {
                const dsUrl = `https://health.googleapis.com/v4/users/me/dataSources/${ds.dataStreamId}/datasets/${threeDaysAgoNs}-${nowNs}`
                const dsFetch = await fetch(dsUrl, {
                  headers: { Authorization: `Bearer ${accessToken}` },
                })

                if (!dsFetch.ok) continue
                const dataset = await dsFetch.json()
                const points = dataset.point ?? []
                if (points.length === 0) continue

                const latest = points.reduce((best: any, p: any) => {
                  const thisEnd = BigInt(p.endTimeNanos ?? "0")
                  const bestEnd = BigInt(best.endTimeNanos ?? "0")
                  return thisEnd > bestEnd ? p : best
                }, points[0])

                const valArr = latest.value
                if (valArr && valArr.length > 0) {
                  const bpmVal = valArr[0].fpVal ?? valArr[0].intVal
                  if (bpmVal != null && bpmVal > 0) {
                    heartRate = Math.round(bpmVal)
                    fetchedHRSuccessfully = true
                    console.log(
                      `Latest heart rate from Health source ${ds.dataStreamId}: ${heartRate} bpm`
                    )
                    return
                  }
                }
              } catch {
                continue
              }
            }
          }
        } catch (err: any) {
          console.warn(
            "Could not fetch heart rate from Google Health data sources:",
            err.message
          )
        }
      }

      await hrFetch()

      // Try 3: Google Health daily roll-up (last resort)
      if (!fetchedHRSuccessfully) {
        try {
          const hrResponse = await fetch(
            "https://health.googleapis.com/v4/users/me/dataTypes/heart-rate/dataPoints:dailyRollUp",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                range: { start, end },
                windowSizeDays: 1,
              }),
            }
          )

          if (hrResponse.ok) {
            const hrData = await hrResponse.json()
            const rollupPoints =
              hrData.dailyRollupDataPoints || hrData.dataPoints || []
            if (rollupPoints.length > 0) {
              const point = rollupPoints[0]
              const rollupVal =
                point.heartRateRollup ?? point.value?.heartRateRollup
              if (rollupVal) {
                heartRate = Math.round(
                  rollupVal.averageHeartRate ?? rollupVal.restingHeartRate ?? 72
                )
                fetchedHRSuccessfully = true
              }
            }
          } else {
            const errText = await hrResponse.text()
            console.warn(
              `Heart rate API returned status ${hrResponse.status}: ${errText}`
            )
          }
        } catch (hrErr: any) {
          console.warn("Could not fetch heart rate from API:", hrErr.message)
        }
      }

      if (!fetchedStepsSuccessfully && !fetchedHRSuccessfully) {
        throw new Error(
          "Could not fetch any data from the live Google Health API"
        )
      }

      // Persist heart rate reading to database
      if (fetchedHRSuccessfully) {
        try {
          await ctx.runMutation(internal.heartRate.logInternal, {
            bpm: heartRate,
            source: "google_health",
            isResting: true,
          })
        } catch (err) {
          console.warn("Failed to persist heart rate reading:", err)
        }
      }

      console.log(
        `Google Health API fetch success. Steps: ${steps}, Heart Rate: ${heartRate}`
      )

      return {
        status: "success",
        steps,
        heartRate,
        isDemo: false,
      }
    } catch (err: any) {
      console.warn(
        "Failed fetching from live Google Health API, using sandbox fallback:",
        err.message
      )

      return {
        status: "success",
        steps: 8754,
        heartRate: 67,
        isDemo: true,
        warning: "Showing demo/sandbox health data (Google API mock fallback)",
      }
    }
  },
})

/**
 * Public mutation to clear/unlink the user's Google account to allow re-authenticating with new scopes.
 */
export const unlinkGoogleAccount = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.getAuthUser(ctx)
    const account = await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: "account",
      where: [
        { field: "userId", value: user._id },
        { field: "providerId", value: "google" },
      ],
    })
    if (account) {
      await ctx.runMutation(components.betterAuth.adapter.deleteOne, {
        input: {
          model: "account",
          where: [{ field: "_id", value: account._id }],
        },
      })
      return { success: true }
    }
    return { success: false, message: "No Google account linked" }
  },
})
