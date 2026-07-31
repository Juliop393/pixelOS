"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { Search, Copy, Check } from "lucide-react"

type UserData = {
  id: string
  email: string
  name: string
  createdAt: string | null
  credits: number
  plan: string
  subscriptionStatus: string
  paddleCustomerId: string | null
  paddleSubscriptionId: string | null
  creditsUpdatedAt: string | null
}

export default function AdminUsersPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  const copyToClipboard = (text: string | null, field: string) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    setCopied(field)
    setTimeout(() => setCopied(null), 2000)
  }

  const handleSearch = async () => {
    if (!email.trim()) return

    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
      setError("Sesión expirada. Vuelve a iniciar sesión.")
      return
    }

    setLoading(true)
    setError(null)
    setUserData(null)

    try {
      const res = await fetch("/api/admin/users/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ email: email.trim() }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Error al buscar usuario")
        return
      }

      setUserData(data.user)
    } catch {
      setError("Error al conectar con el servidor")
    } finally {
      setLoading(false)
    }
  }

  const planLabel = userData?.plan ? userData.plan.charAt(0).toUpperCase() + userData.plan.slice(1) : "—"
  const statusLabel = userData?.subscriptionStatus === "active" ? "Activa" : userData?.subscriptionStatus || "—"

  return (
    <div className="max-w-3xl mx-auto h-full overflow-y-auto pb-10">
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Usuarios</h1>
        <p className="text-[#9A9893]">Busca por correo para revisar una cuenta</p>
      </div>

      <div className="space-y-6">
        <div className="bg-[#2A2826] rounded-2xl border border-[#3A3833] p-6">
          <div className="flex gap-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="buscar@correo.com"
              className="flex-1 bg-[#1E1C1A] border border-[#3A3833] px-4 py-3 rounded-xl text-sm text-[#E8E6E1] placeholder:text-[#9A9893]/50 focus:outline-none focus:border-[#D97757]/50 transition-colors"
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <button
              onClick={handleSearch}
              disabled={loading || !email.trim()}
              className="px-6 py-3 rounded-xl bg-[#D97757] text-white font-semibold text-sm hover:bg-[#C26547] active:scale-[0.98] transition-all duration-200 shadow-lg shadow-[#D97757]/20 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Search className="w-4 h-4" strokeWidth={1.5} />
              {loading ? "Buscando..." : "Buscar usuario"}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {userData && (
          <div className="bg-[#2A2826] rounded-2xl border border-[#3A3833] p-6">
            <h2 className="text-lg font-bold mb-6">Resultado</h2>
            <div className="space-y-4">
              <Row label="Nombre" value={userData.name} />
              <Row label="Correo" value={userData.email} />
              <div className="flex items-center justify-between py-2 border-b border-[#3A3833]">
                <span className="text-sm text-[#9A9893]">UUID</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-[#E8E6E1] font-mono text-xs max-w-[260px] truncate">{userData.id}</span>
                  <button onClick={() => copyToClipboard(userData.id, "uuid")} className="text-[#9A9893] hover:text-[#F5F0E8] transition-colors">
                    {copied === "uuid" ? <Check className="w-4 h-4 text-emerald-400" strokeWidth={1.5} /> : <Copy className="w-4 h-4" strokeWidth={1.5} />}
                  </button>
                </div>
              </div>
              <Row label="Créditos" value={String(userData.credits)} />
              <Row label="Plan" value={planLabel} />
              <Row label="Estado" value={statusLabel} />
              <div className="flex items-center justify-between py-2 border-b border-[#3A3833]">
                <span className="text-sm text-[#9A9893]">Paddle Customer ID</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-[#E8E6E1] font-mono text-xs max-w-[200px] truncate">{userData.paddleCustomerId || "No disponible"}</span>
                  {userData.paddleCustomerId && (
                    <button onClick={() => copyToClipboard(userData.paddleCustomerId, "pcid")} className="text-[#9A9893] hover:text-[#F5F0E8] transition-colors">
                      {copied === "pcid" ? <Check className="w-4 h-4 text-emerald-400" strokeWidth={1.5} /> : <Copy className="w-4 h-4" strokeWidth={1.5} />}
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-[#3A3833]">
                <span className="text-sm text-[#9A9893]">Paddle Subscription ID</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-[#E8E6E1] font-mono text-xs max-w-[200px] truncate">{userData.paddleSubscriptionId || "No disponible"}</span>
                  {userData.paddleSubscriptionId && (
                    <button onClick={() => copyToClipboard(userData.paddleSubscriptionId, "psid")} className="text-[#9A9893] hover:text-[#F5F0E8] transition-colors">
                      {copied === "psid" ? <Check className="w-4 h-4 text-emerald-400" strokeWidth={1.5} /> : <Copy className="w-4 h-4" strokeWidth={1.5} />}
                    </button>
                  )}
                </div>
              </div>
              <Row label="Creado" value={userData.createdAt ? new Date(userData.createdAt).toLocaleString("es-PE") : "No disponible"} />
              <Row label="Actualizado" value={userData.creditsUpdatedAt ? new Date(userData.creditsUpdatedAt).toLocaleString("es-PE") : "No disponible"} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-[#3A3833]">
      <span className="text-sm text-[#9A9893]">{label}</span>
      <span className="text-sm text-[#E8E6E1]">{value}</span>
    </div>
  )
}