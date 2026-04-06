import { SignInForm } from "@/components/sign-in-form"
import React from "react"

const SignInPage = () => {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <SignInForm />
      </div>
    </div>
  )
}

export default SignInPage
