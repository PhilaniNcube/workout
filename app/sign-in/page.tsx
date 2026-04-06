import { SignInForm } from "@/components/sign-in-form"
import React from "react"

const SignInPage = () => {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md">
        <SignInForm />
      </div>
    </div>
  )
}

export default SignInPage
