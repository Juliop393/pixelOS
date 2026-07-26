import Topbar from "@/components/dashboard/Topbar"
import MobileBlock from "@/components/dashboard/MobileBlock"
import { AuthGuard } from "@/components/dashboard/AuthGuard"
import { CreditsProvider } from "@/lib/credits-context"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <CreditsProvider initialCredits={0}>
      {/* Desktop */}
      <div className="hidden md:flex h-screen overflow-hidden bg-[#1E1C1A] text-[#E8E6E1] flex-col">
        <AuthGuard>
          <Topbar />
          <main className="flex-1 px-6 pb-6 pt-2 overflow-hidden min-h-0">
            {children}
          </main>
        </AuthGuard>
      </div>

      {/* Móvil */}
      <MobileBlock />
    </CreditsProvider>
  )
}