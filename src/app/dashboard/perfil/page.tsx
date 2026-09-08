import { redirect } from "next/navigation"

export default function ProfilePage() {
  redirect("/dashboard/configuracion#cuenta")
}
