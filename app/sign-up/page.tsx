import { SignupForm } from "@/components/signup-form"
import React from "react"

const page = () => {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md">
        <SignupForm />
      </div>
    </div>
  )
}

export default page
