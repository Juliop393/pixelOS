import Sidebar from "@/components/dashboard/Sidebar"
import Topbar from "@/components/dashboard/Topbar"
import MobileBlock from "@/components/dashboard/MobileBlock"
import { CreditsProvider } from "@/lib/credits-context"
import { createClient } from "@/lib/supabase-server"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <CreditsProvider initialCredits={10}>
      {/* Desktop */}
      <div className="hidden md:flex min-h-screen bg-[#1E1C1A] text-[#E8E6E1]">
        <Sidebar userEmail={user?.email ?? null} />
        <div className="flex-1 flex flex-col min-w-0">
          <Topbar />
          <main className="flex-1 p-6 overflow-auto">
            {children}
          </main>
        </div>
      </div>

      {/* Móvil */}
      <MobileBlock />
    </CreditsProvider>
  )
}
