"use client"

import { FormEvent, useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { getPaddle } from "@/components/PaddleProvider"

export default function ConfiguracionPage() {
  const [agencyName, setAgencyName] = useState("")
  const [email, setEmail] = useState("")
  const [plan, setPlan] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  useEffect(() => {
    const loadProfile = async () => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        setMessage({ type: "error", text: "No pudimos cargar los datos de tu perfil." })
        setLoading(false)
        return
      }

      const metadata = user.user_metadata
      setAgencyName(
        typeof metadata.agency_name === "string"
          ? metadata.agency_name
          : typeof metadata.full_name === "string"
            ? metadata.full_name
            : ""
      )
      setEmail(user.email ?? "")

      const { data, error: planError } = await supabase
        .from("user_credits")
        .select("plan, credits")
        .eq("user_id", user.id)
        .maybeSingle()

      if (planError) {
        setMessage({ type: "error", text: "No pudimos cargar los datos de tu plan." })
      } else {
        setPlan(data?.plan || "Gratis")
      }

      setLoading(false)
    }

    loadProfile()
  }, [])

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setMessage(null)

    const normalizedAgencyName = agencyName.trim()
    const { error } = await supabase.auth.updateUser({
      data: { agency_name: normalizedAgencyName },
    })

    if (error) {
      setMessage({ type: "error", text: "No pudimos guardar el nombre de la agencia." })
    } else {
      setAgencyName(normalizedAgencyName)
      setMessage({ type: "success", text: "Nombre de la agencia actualizado correctamente." })
    }

    setSaving(false)
  }

  const planLabel = plan ? plan.charAt(0).toUpperCase() + plan.slice(1) : "Cargando..."

  return (
    <div className="max-w-5xl mx-auto h-full overflow-y-auto pb-10">
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Configuración de la Agencia</h1>
        <p className="text-[#9A9893]">Administra tu cuenta, facturación y accesos</p>
      </div>

      <div className="space-y-6">
        <div className="bg-[#2A2826] rounded-2xl border border-[#3A3833] p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 rounded-xl bg-[#1E1C1A] border border-[#3A3833] flex items-center justify-center text-[#D97757]">
              <svg className="w-5 h-5" width={20} height={20} aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold">Perfil</h2>
              <p className="text-sm text-[#9A9893]">Datos de tu agencia y preferencias</p>
            </div>
          </div>
          <div className="space-y-3">
            <form onSubmit={handleSave} className="py-3 border-b border-[#3A3833]">
              <div className="flex items-center justify-between gap-4">
                <label htmlFor="agencyName" className="text-sm text-[#9A9893] shrink-0">
                  Nombre de la agencia
                </label>
                <div className="flex items-center justify-end gap-2 flex-1">
                  <input
                    id="agencyName"
                    type="text"
                    value={agencyName}
                    onChange={(event) => setAgencyName(event.target.value)}
                    disabled={loading || saving}
                    placeholder={loading ? "Cargando..." : "Nombre de tu agencia"}
                    className="w-full max-w-xs bg-[#1E1C1A] border border-[#3A3833] px-3 py-2 rounded-lg text-sm text-[#E8E6E1] text-right placeholder:text-[#9A9893]/50 focus:outline-none focus:border-[#D97757]/50 transition-colors disabled:opacity-60"
                  />
                  <button
                    type="submit"
                    disabled={loading || saving}
                    className="px-4 py-2 rounded-lg bg-[#D97757] text-white text-sm font-semibold hover:bg-[#C26547] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? "Guardando..." : "Guardar"}
                  </button>
                </div>
              </div>
              {message && (
                <p
                  role="status"
                  className={`text-xs mt-2 text-right ${
                    message.type === "success" ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {message.text}
                </p>
              )}
            </form>
            <div className="flex items-center justify-between py-3 border-b border-[#3A3833]">
              <span className="text-sm text-[#9A9893]">Email</span>
              <span className="text-sm text-[#E8E6E1]">{email || "Cargando..."}</span>
            </div>
            <div className="flex items-center justify-between py-3">
              <span className="text-sm text-[#9A9893]">Plan actual</span>
              <span className="text-sm font-semibold text-[#D97757]">{planLabel}</span>
            </div>
          </div>
        </div>

        <div className="bg-[#2A2826] rounded-2xl border border-[#3A3833] p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 rounded-xl bg-[#1E1C1A] border border-[#3A3833] flex items-center justify-center text-[#D97757]">
              <svg className="w-5 h-5" width={20} height={20} aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold">Facturación</h2>
              <p className="text-sm text-[#9A9893]">Métodos de pago e historial de facturas</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-3 border-b border-[#3A3833]">
              <span className="text-sm text-[#9A9893]">Próximo cobro</span>
              <span className="text-sm text-[#E8E6E1]">1 de julio, 2026</span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-[#3A3833]">
              <span className="text-sm text-[#9A9893]">Método de pago</span>
              <span className="text-sm text-[#E8E6E1]">•••• 4242</span>
            </div>
            <div className="flex items-center justify-between py-3">
              <span className="text-sm text-[#9A9893]">Créditos restantes</span>
              <span className="text-sm font-semibold text-[#E8E6E1]">10</span>
            </div>
            <div className="pt-4">
              <button
                onClick={() => {
                  const paddle = getPaddle()
                  if (!paddle) return
                  paddle.Checkout.open({
                    settings: { displayMode: "overlay" },
                  } as never)
                }}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold bg-[#D97757] text-white hover:bg-[#C26547] active:scale-[0.98] transition-all duration-200 shadow-lg shadow-[#D97757]/20"
              >
                Gestionar suscripción
              </button>
            </div>
          </div>
        </div>

        <div className="bg-[#2A2826] rounded-2xl border border-[#3A3833] p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 rounded-xl bg-[#1E1C1A] border border-[#3A3833] flex items-center justify-center text-[#D97757]">
              <svg className="w-5 h-5" width={20} height={20} aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold">API Keys</h2>
              <p className="text-sm text-[#9A9893]">Accede a la API para integrar con tus herramientas</p>
            </div>
          </div>
          <div className="flex items-center justify-between py-3 border-t border-[#3A3833]">
            <span className="text-sm text-[#9A9893]">Estado</span>
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D97757]/10 border border-[#D97757]/20 text-xs font-semibold text-[#D97757]">
              Próximamente
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
