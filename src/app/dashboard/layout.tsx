import Topbar from "@/components/dashboard/Topbar"
import MobileBlock from "@/components/dashboard/MobileBlock"
import DashboardParticles from "@/components/dashboard/DashboardParticles"
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
        {/* Glow principal — claro cálido/champagne para luminosidad premium */}
        <div
          aria-hidden="true"
          className="absolute pointer-events-none animate-dash-glow-1"
          style={{
            top: "0%",
            left: "0%",
            width: "65%",
            height: "80%",
            background:
              "radial-gradient(ellipse at 40% 40%, rgba(245,240,232,0.07) 0%, transparent 72%)",
            filter: "blur(60px)",
          }}
        />
        {/* Glow secundario — neutro/humo cálido para profundidad sin tinte */}
        <div
          aria-hidden="true"
          className="absolute pointer-events-none animate-dash-glow-2"
          style={{
            bottom: "-5%",
            right: "-3%",
            width: "60%",
            height: "75%",
            background:
              "radial-gradient(ellipse at 60% 60%, rgba(120,116,112,0.06) 0%, transparent 72%)",
            filter: "blur(65px)",
          }}
        />
        {/* Glow de acento — terracota sutil para identidad de marca */}
        <div
          aria-hidden="true"
          className="absolute pointer-events-none animate-dash-glow-1"
          style={{
            top: "30%",
            left: "35%",
            width: "40%",
            height: "45%",
            background:
              "radial-gradient(ellipse at center, rgba(217,119,87,0.05) 0%, transparent 70%)",
            filter: "blur(70px)",
            animationDelay: "8s",
          }}
        />

        {/* Partículas terracota sutiles */}
        <DashboardParticles />

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