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
        {/* Glow terracota animado — respiración sutil detrás del dashboard */}
        <div
          aria-hidden="true"
          className="absolute pointer-events-none animate-dash-glow-1"
          style={{
            top: "-10%",
            left: "-5%",
            width: "55%",
            height: "60%",
            background:
              "radial-gradient(ellipse at center, rgba(217,119,87,0.05) 0%, transparent 70%)",
            filter: "blur(80px)",
          }}
        />
        <div
          aria-hidden="true"
          className="absolute pointer-events-none animate-dash-glow-2"
          style={{
            bottom: "-15%",
            right: "-8%",
            width: "50%",
            height: "55%",
            background:
              "radial-gradient(ellipse at center, rgba(217,119,87,0.035) 0%, transparent 70%)",
            filter: "blur(90px)",
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