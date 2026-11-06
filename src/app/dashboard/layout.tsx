import Topbar from "@/components/dashboard/Topbar"
import DashboardNavigation from "@/components/dashboard/DashboardNavigation"
import DashboardBackdrop from "@/components/dashboard/DashboardBackdrop"
import { AuthGuard } from "@/components/dashboard/AuthGuard"
import { CreditsProvider } from "@/lib/credits-context"
import styles from "@/components/dashboard/DashboardShell.module.css"

export const dynamic = "force-dynamic"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <CreditsProvider initialCredits={0}>
      <div className={styles.desktopRoot}>
        <DashboardBackdrop />

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

    </CreditsProvider>
  )
}
