import Topbar from "@/components/dashboard/Topbar"
import DashboardBackdrop from "@/components/dashboard/DashboardBackdrop"
import { AuthGuard } from "@/components/dashboard/AuthGuard"
import PackPurchaseCard from "@/components/PackPurchaseCard"
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
            <div className={styles.shellBody}>
              <Topbar />
              <main className={styles.content}>{children}</main>
              <PackPurchaseCard />
            </div>
          </div>
        </AuthGuard>
      </div>

    </CreditsProvider>
  )
}
