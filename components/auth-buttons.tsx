import AuthUserMenu from "@/components/auth-user-menu"
import { isAuthenticated } from "@/lib/auth-server"
import { redirect } from "next/navigation"

const AuthButtons = async () => {
  const authenticated = await isAuthenticated()

  if (!authenticated) {
    redirect("/sign-in")
  }

  return <AuthUserMenu />
}

export default AuthButtons
