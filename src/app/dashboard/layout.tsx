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
      <div className="hidden md:flex h-screen overflow-hidden bg-[#1E1C1A] text-[#E8E6E1] flex-col relative">
        {/* Fondo decorativo sutil para que backdrop-filter produzca refracción visible */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 60% 50% at 15% 10%, rgba(217,119,87,0.06) 0%, transparent 60%), radial-gradient(ellipse 50% 40% at 85% 90%, rgba(217,119,87,0.04) 0%, transparent 55%)",
          }}
        />

        <AuthGuard>
          <Topbar />
          <main className="flex-1 px-6 pb-6 pt-2 overflow-hidden min-h-0 relative z-10">
            {children}
          </main>
        </AuthGuard>
      </div>

      {/* Móvil */}
      <MobileBlock />
    </CreditsProvider>
  )
}