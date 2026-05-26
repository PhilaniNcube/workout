"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { z } from "zod"

import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"

const signInSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
})

type SignInSchema = z.infer<typeof signInSchema>

type SignInFormState = {
  fields: SignInSchema
  fieldErrors: Partial<Record<keyof SignInSchema, string>>
  message: string | null
}

const initialState: SignInFormState = {
  fields: {
    email: "",
    password: "",
  },
  fieldErrors: {},
  message: null,
}

export function SignInForm({ ...props }: React.ComponentProps<typeof Card>) {
  const router = useRouter()
  const [state, setState] = useState<SignInFormState>(initialState)
  const [isPending, setIsPending] = useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)
    const values: SignInSchema = {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
    }

    const parsed = signInSchema.safeParse(values)
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors
      setState({
        fields: values,
        fieldErrors: {
          email: fieldErrors.email?.[0],
          password: fieldErrors.password?.[0],
        },
        message: null,
      })
      return
    }

    setIsPending(true)
    setState((prev) => ({ ...prev, fieldErrors: {}, message: null }))

    try {
      const { error } = await authClient.signIn.email({
        email: parsed.data.email,
        password: parsed.data.password,
      })

      if (error) {
        setState({
          fields: values,
          fieldErrors: {},
          message: error.message ?? "Authentication failed.",
        })
        return
      }

      router.replace("/dashboard")
      router.refresh()
    } finally {
      setIsPending(false)
    }
  }

  return (
    <Card {...props}>
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>
          Enter your email and password to continue
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} noValidate>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="m@example.com"
                autoComplete="email"
                value={state.fields.email}
                onChange={(event) =>
                  setState((prev) => ({
                    ...prev,
                    fields: {
                      ...prev.fields,
                      email: event.target.value,
                    },
                  }))
                }
              />
              <FieldError>{state.fieldErrors.email}</FieldError>
            </Field>
            <Field>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={state.fields.password}
                onChange={(event) =>
                  setState((prev) => ({
                    ...prev,
                    fields: {
                      ...prev.fields,
                      password: event.target.value,
                    },
                  }))
                }
              />
              <FieldError>{state.fieldErrors.password}</FieldError>
            </Field>
            {state.message ? (
              <FieldError>{state.message}</FieldError>
            ) : null}
            <FieldGroup>
              <Field>
                <Button type="submit" className="w-full" disabled={isPending}>
                  {isPending ? "Signing in..." : "Sign in"}
                </Button>

                <div className="relative flex py-2 items-center w-full justify-center">
                  <div className="flex-grow border-t border-zinc-200 dark:border-zinc-800"></div>
                  <span className="flex-shrink mx-4 text-zinc-400 text-xs">Or continue with</span>
                  <div className="flex-grow border-t border-zinc-200 dark:border-zinc-800"></div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full flex items-center justify-center gap-2 cursor-pointer"
                  disabled={isPending}
                  onClick={async () => {
                    setIsPending(true)
                    try {
                      await authClient.signIn.social({
                        provider: "google",
                        callbackURL: "/dashboard",
                      })
                    } catch (err) {
                      console.error(err)
                    } finally {
                      setIsPending(false)
                    }
                  }}
                >
                  <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" width="16" height="16" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21.35,11.1H12v2.7h5.38c-0.24,1.28 -0.96,2.37 -2.04,3.1v2.58h3.3c1.93,-1.78 3.04,-4.4 3.04,-7.38C21.68,11.83 21.56,11.43 21.35,11.1z" fill="#4285F4" />
                    <path d="M12,20.62c2.43,0 4.47,-0.8 5.96,-2.2l-3.3,-2.58c-0.92,0.62 -2.1,0.98 -3.5,0.98 -2.69,0 -4.97,-1.82 -5.78,-4.27H2.03v2.66C3.53,18.17 7.5,20.62 12,20.62z" fill="#34A853" />
                    <path d="M6.22,12.55c-0.2,-0.62 -0.32,-1.28 -0.32,-1.97s0.12,-1.35 0.32,-1.97V5.95H2.03C1.39,7.24 1.03,8.7 1.03,10.23c0,1.53 0.36,2.99 1,4.28L6.22,12.55z" fill="#FBBC05" />
                    <path d="M12,5.77c1.32,0 2.5,0.45 3.44,1.35l2.58,-2.58C16.46,3.09 14.43,2.25 12,2.25 7.5,2.25 3.53,4.7 2.03,8.27l4.19,3.26C7.03,7.59 9.31,5.77 12,5.77z" fill="#EA4335" />
                  </svg>
                  Google
                </Button>

                <FieldDescription className="px-6 text-center mt-2">
                  Don&apos;t have an account? <Link href="/sign-up">Sign up</Link>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}
