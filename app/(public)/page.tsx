import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  IconBarbell,
  IconChartBar,
  IconTarget,
  IconCalendar,
  IconTrophy,
  IconUsers,
} from "@tabler/icons-react"

const features = [
  {
    icon: IconBarbell,
    title: "Exercise Library",
    description:
      "Browse and manage a comprehensive library of exercises organized by muscle group.",
  },
  {
    icon: IconCalendar,
    title: "Workout Sessions",
    description:
      "Log your workouts with sets, reps, and weights. Track every session over time.",
  },
  {
    icon: IconChartBar,
    title: "Body Metrics",
    description:
      "Record body weight, measurements, and other metrics to visualize your progress.",
  },
  {
    icon: IconTarget,
    title: "Goals",
    description:
      "Set strength and fitness goals, then track your journey toward hitting them.",
  },
  {
    icon: IconTrophy,
    title: "Personal Records",
    description:
      "Automatically surface your PRs so you always know when you've hit a new best.",
  },
  {
    icon: IconUsers,
    title: "Muscle Groups",
    description:
      "Organize exercises by muscle group to build balanced training programs.",
  },
]

export default function HomePage() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="flex flex-col items-center justify-center gap-6 px-4 py-24 text-center md:py-32 lg:px-6">
        <div className="mx-auto flex max-w-2xl flex-col gap-4">
          <h1 className="text-3xl font-medium tracking-tight md:text-5xl">
            Track your workouts.
            <br />
            Crush your goals.
          </h1>
          <p className="text-muted-foreground md:text-lg">
            A simple, no-nonsense workout tracker that helps you log sessions,
            monitor progress, and stay consistent — all in one place.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button size="lg" asChild>
            <Link href="/sign-up">Get started for free</Link>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link href="/sign-in">Sign in</Link>
          </Button>
        </div>
      </section>

      {/* Features */}
      <section className="border-t bg-muted/40 px-4 py-20 lg:px-6">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-12 text-center text-2xl font-medium tracking-tight">
            Everything you need to level up
          </h2>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div key={feature.title} className="flex gap-4">
                <div className="flex size-10 shrink-0 items-center justify-center border bg-background">
                  <feature.icon className="size-5 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-medium">{feature.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="flex flex-col items-center gap-4 px-4 py-20 text-center lg:px-6">
        <h2 className="text-2xl font-medium tracking-tight">
          Ready to start tracking?
        </h2>
        <p className="text-muted-foreground">
          Create an account in seconds and log your first workout today.
        </p>
        <Button size="lg" asChild>
          <Link href="/sign-up">Create your account</Link>
        </Button>
      </section>

      {/* Footer */}
      <footer className="border-t px-4 py-6 text-center text-xs text-muted-foreground lg:px-6">
        &copy; {new Date().getFullYear()} Workout Tracker. All rights reserved.
      </footer>
    </div>
  )
}
