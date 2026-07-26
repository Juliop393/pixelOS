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
        {/* Glow terracota animado — tinte sutil pero visible detrás del dashboard */}
        <div
          aria-hidden="true"
          className="absolute pointer-events-none animate-dash-glow-1"
          style={{
            top: "5%",
            left: "0%",
            width: "50%",
            height: "65%",
            background:
              "radial-gradient(ellipse at center, rgba(217,119,87,0.14) 0%, transparent 75%)",
            filter: "blur(60px)",
          }}
        />
        <div
          aria-hidden="true"
          className="absolute pointer-events-none animate-dash-glow-2"
          style={{
            bottom: "0%",
            right: "5%",
            width: "45%",
            height: "60%",
            background:
              "radial-gradient(ellipse at center, rgba(217,119,87,0.10) 0%, transparent 75%)",
            filter: "blur(65px)",
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