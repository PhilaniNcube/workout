"use client"

import { useActionState } from "react"
import Link from "next/link"
import { z } from "zod"

import { signUpAction } from "@/actions/auth"
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

const signupSchema = z
  .object({
    name: z.string().trim().min(1, "Full name is required"),
    email: z.string().email("Enter a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })

type SignupSchema = z.infer<typeof signupSchema>

type SignupFormState = {
  fields: SignupSchema
  fieldErrors: Partial<Record<keyof SignupSchema, string>>
  message: string | null
  success: boolean
}

const initialState: SignupFormState = {
  fields: {
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  },
  fieldErrors: {},
  message: null,
  success: false,
}

async function submitSignup(
  _prevState: SignupFormState,
  formData: FormData
): Promise<SignupFormState> {
  const values: SignupSchema = {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? ""),
  }

  const parsed = signupSchema.safeParse(values)
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors

    return {
      fields: values,
      fieldErrors: {
        name: fieldErrors.name?.[0],
        email: fieldErrors.email?.[0],
        password: fieldErrors.password?.[0],
        confirmPassword: fieldErrors.confirmPassword?.[0],
      },
      message: null,
      success: false,
    }
  }

  const result = await signUpAction({
    name: parsed.data.name,
    email: parsed.data.email,
    password: parsed.data.password,
  })

  if (!result.success) {
    return {
      fields: values,
      fieldErrors: {},
      message: result.message,
      success: false,
    }
  }

  return {
    ...initialState,
    message: "Account created successfully.",
    success: true,
  }
}

export function SignupForm({ ...props }: React.ComponentProps<typeof Card>) {
  const [state, formAction, isPending] = useActionState(
    submitSignup,
    initialState
  )

  return (
    <Card {...props}>
      <CardHeader>
        <CardTitle>Create an account</CardTitle>
        <CardDescription>
          Enter your information below to create your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} noValidate>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="name">Full Name</FieldLabel>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="John Doe"
                autoComplete="name"
                defaultValue={state.fields.name}
              />
              <FieldError>{state.fieldErrors.name}</FieldError>
            </Field>
            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="m@example.com"
                autoComplete="email"
                defaultValue={state.fields.email}
              />
              <FieldDescription>
                We&apos;ll use this to contact you. We will not share your email
                with anyone else.
              </FieldDescription>
              <FieldError>{state.fieldErrors.email}</FieldError>
            </Field>
            <Field>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                defaultValue={state.fields.password}
              />
              <FieldDescription>
                Must be at least 8 characters long.
              </FieldDescription>
              <FieldError>{state.fieldErrors.password}</FieldError>
            </Field>
            <Field>
              <FieldLabel htmlFor="confirm-password">
                Confirm Password
              </FieldLabel>
              <Input
                id="confirm-password"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                defaultValue={state.fields.confirmPassword}
              />
              <FieldDescription>Please confirm your password.</FieldDescription>
              <FieldError>{state.fieldErrors.confirmPassword}</FieldError>
            </Field>
            {!state.success && state.message ? (
              <FieldError>{state.message}</FieldError>
            ) : null}
            {state.success && state.message ? (
              <FieldDescription className="text-green-600">
                {state.message}
              </FieldDescription>
            ) : null}
            <FieldGroup>
              <Field>
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Creating account..." : "Create Account"}
                </Button>

                <FieldDescription className="px-6 text-center">
                  Already have an account? <Link href="/sign-in">Sign in</Link>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}
