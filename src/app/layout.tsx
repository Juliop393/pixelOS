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
  title: "PixelOS - Generador de Creativos con IA",
  description: "Rompe la ceguera del scroll. Escala tu ROAS. Genera ángulos de venta, copy persuasivo y creativos de alto contraste en 10 minutos.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className={inter.variable}>
      <head>
        <link rel="icon" href="/logo_PixelOS.png" />
      </head>
      <body className="min-h-screen antialiased">
        {children}
        <Toaster
          position="top-center"
          expand={false}
          theme="dark"
          toastOptions={{
            style: {
              background: "#2A2826",
              border: "1px solid #3A3833",
              color: "#E8E6E1",
            },
          }}
        />
      </body>
    </html>
  )
}
