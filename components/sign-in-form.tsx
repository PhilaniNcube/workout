"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { z } from "zod"

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
      const response = await fetch("/api/auth/sign-in/email", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(parsed.data),
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        const message =
          (payload && typeof payload === "object" && "message" in payload
            ? String(payload.message)
            : null) ?? "Authentication failed."

        setState({
          fields: values,
          fieldErrors: {},
          message,
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
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Signing in..." : "Sign in"}
                </Button>

                <FieldDescription className="px-6 text-center">
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
