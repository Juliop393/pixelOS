import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { Toaster } from "sonner"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})

export const metadata: Metadata = {
  title: "PixelFM - Imágenes y videos publicitarios con IA",
  description: "PixelFM es una plataforma para crear imágenes y videos publicitarios con IA y dirección creativa incluida, listos para llevar a Meta Ads.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className={inter.variable}>
      <head>
        <link rel="icon" href="/pixelfm-logo-mark.png" />
      </head>
      <body className="min-h-screen antialiased">
        {children}
        <Toaster
          position="top-center"
          expand={false}
          theme="dark"
          gap={10}
          // Below the page header when one is anchored (useToastAnchor); otherwise Sonner's defaults.
          offset={{ top: "var(--pf-toast-top, 24px)" }}
          mobileOffset={{ top: "var(--pf-toast-top, 16px)" }}
          style={{ "--width": "340px" } as React.CSSProperties}
          toastOptions={{
            // Liquid glass look lives in globals.css (.pf-toast).
            classNames: {
              toast: "pf-toast",
              title: "pf-toast-title",
              description: "pf-toast-description",
              icon: "pf-toast-icon",
            },
          }}
        />
      </body>
    </html>
  )
}
