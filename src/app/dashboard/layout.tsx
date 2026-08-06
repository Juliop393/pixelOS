import Topbar from "@/components/dashboard/Topbar"
import DashboardNavigation from "@/components/dashboard/DashboardNavigation"
import MobileBlock from "@/components/dashboard/MobileBlock"
import DashboardParticles from "@/components/dashboard/DashboardParticles"
import { AuthGuard } from "@/components/dashboard/AuthGuard"
import { CreditsProvider } from "@/lib/credits-context"
import styles from "@/components/dashboard/DashboardShell.module.css"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <CreditsProvider initialCredits={0}>
      {/* Desktop */}
      <div className={styles.desktopRoot}>
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
          <div className={styles.shell}>
            <DashboardNavigation />
            <div className={styles.shellBody}>
              <Topbar />
              <main className={styles.content}>{children}</main>
            </div>
          </div>
        </AuthGuard>
      </div>

      {/* Móvil */}
      <MobileBlock />
    </CreditsProvider>
  )
}
