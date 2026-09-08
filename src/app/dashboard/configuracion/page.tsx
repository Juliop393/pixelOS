"use client"

import Link from "next/link"
import { FormEvent, useEffect, useState } from "react"
import { CreditCard, KeyRound, Mail, TriangleAlert, User } from "lucide-react"
import { supabase } from "@/lib/supabase"

type StatusMessage = {
  type: "success" | "error"
  text: string
}

export default function ConfiguracionPage() {
  const [fullName, setFullName] = useState("")
  const [agencyName, setAgencyName] = useState("")
  const [email, setEmail] = useState("")
  const [plan, setPlan] = useState("")
  const [credits, setCredits] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<StatusMessage | null>(null)

  useEffect(() => {
    const loadAccount = async () => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        setMessage({ type: "error", text: "No pudimos cargar los datos de tu cuenta." })
        setLoading(false)
        return
      }

      const metadata = user.user_metadata
      setFullName(typeof metadata.full_name === "string" ? metadata.full_name : "")
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
        setCredits(typeof data?.credits === "number" ? data.credits : 0)
      }

      setLoading(false)
    }

    loadAccount()
  }, [])

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setMessage(null)

    const normalizedFullName = fullName.trim()
    const normalizedAgencyName = agencyName.trim()
    const { error } = await supabase.auth.updateUser({
      data: {
        full_name: normalizedFullName,
        agency_name: normalizedAgencyName,
      },
    })

    if (error) {
      setMessage({ type: "error", text: "No pudimos guardar los datos de tu cuenta." })
    } else {
      setFullName(normalizedFullName)
      setAgencyName(normalizedAgencyName)
      setMessage({ type: "success", text: "Datos de cuenta actualizados correctamente." })
    }

    setSaving(false)
  }

  const openBillingPortal = async () => {
    setMessage(null)
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.access_token) {
      setMessage({ type: "error", text: "Tu sesión expiró. Vuelve a iniciar sesión." })
      return
    }

    try {
      const response = await fetch("/api/paddle/portal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + session.access_token,
        },
      })
      const data = await response.json()

      if (data.success && data.portalUrl) {
        window.open(data.portalUrl, "_blank", "noopener,noreferrer")
      } else {
        setMessage({ type: "error", text: data.error || "No se pudo abrir el portal." })
      }
    } catch {
      setMessage({ type: "error", text: "Error al conectar con el portal." })
    }
  }

  const planLabel = plan ? plan.charAt(0).toUpperCase() + plan.slice(1) : "Cargando..."

  return (
    <div
      id="dashboard-settings"
      className="mx-auto h-full max-w-6xl overflow-y-auto scroll-smooth px-1 pb-12"
    >
      <header className="mb-9 pt-1">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#D97757]">
          Tu espacio
        </p>
        <h1 className="mb-2 text-3xl font-bold tracking-tight text-[#F2EEE8]">Configuración</h1>
        <p className="text-[#9A9893]">Administra tu cuenta, plan y accesos desde un solo lugar.</p>
      </header>

      {message && (
        <p
          role="status"
          className={
            "mb-5 rounded-xl border px-4 py-3 text-sm " +
            (message.type === "success"
              ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
              : "border-red-400/20 bg-red-400/10 text-red-300")
          }
        >
          {message.text}
        </p>
      )}

      <div className="space-y-6">
        <form
          id="cuenta"
          onSubmit={handleSave}
          className="scroll-mt-6 rounded-2xl border border-[#3A3833] bg-[#2A2826] p-6"
        >
          <div className="mb-6 flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#D97757]/25 bg-[#D97757]/10 text-[#E58A68]">
              <User className="h-5 w-5" strokeWidth={1.6} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#F2EEE8]">Cuenta</h2>
              <p className="text-sm text-[#9A9893]">Tu identidad dentro de PixelFM.</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm text-[#B8B4AE]" htmlFor="fullName">
              Nombre
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                disabled={loading || saving}
                placeholder={loading ? "Cargando..." : "Tu nombre"}
                autoComplete="name"
                className="w-full rounded-xl border border-[#3A3833] bg-[#1E1C1A] px-4 py-3 text-sm text-[#F2EEE8] outline-none transition-colors placeholder:text-[#6F6B65] focus:border-[#D97757]/60 disabled:opacity-60"
              />
            </label>

            <label className="space-y-2 text-sm text-[#B8B4AE]" htmlFor="agencyName">
              Nombre de la agencia
              <input
                id="agencyName"
                type="text"
                value={agencyName}
                onChange={(event) => setAgencyName(event.target.value)}
                disabled={loading || saving}
                placeholder={loading ? "Cargando..." : "Nombre de tu agencia"}
                className="w-full rounded-xl border border-[#3A3833] bg-[#1E1C1A] px-4 py-3 text-sm text-[#F2EEE8] outline-none transition-colors placeholder:text-[#6F6B65] focus:border-[#D97757]/60 disabled:opacity-60"
              />
            </label>

            <label className="space-y-2 text-sm text-[#B8B4AE] md:col-span-2" htmlFor="accountEmail">
              Email
              <input
                id="accountEmail"
                type="email"
                value={email}
                disabled
                className="w-full rounded-xl border border-[#3A3833] bg-[#1E1C1A]/70 px-4 py-3 text-sm text-[#9A9893] disabled:cursor-not-allowed"
              />
            </label>
          </div>

          <div className="mt-5 flex justify-end">
            <button
              type="submit"
              disabled={loading || saving}
              className="rounded-xl bg-[#D97757] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#D97757]/15 transition-all hover:bg-[#C96949] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </form>

        <section className="rounded-2xl border border-[#3A3833] bg-[#2A2826] p-6">
          <div className="mb-6 flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#D97757]/25 bg-[#D97757]/10 text-[#E58A68]">
              <CreditCard className="h-5 w-5" strokeWidth={1.6} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#F2EEE8]">Plan y facturación</h2>
              <p className="text-sm text-[#9A9893]">Consulta tu plan, créditos y suscripción.</p>
            </div>
          </div>

          <div className="mb-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-[#3A3833] bg-[#1E1C1A] p-4">
              <p className="mb-1 text-xs uppercase tracking-[0.16em] text-[#77736D]">Plan actual</p>
              <p className="text-lg font-bold text-[#E58A68]">{planLabel}</p>
            </div>
            <div className="rounded-xl border border-[#3A3833] bg-[#1E1C1A] p-4">
              <p className="mb-1 text-xs uppercase tracking-[0.16em] text-[#77736D]">Créditos disponibles</p>
              <p className="text-lg font-bold text-[#F2EEE8]">{loading ? "—" : credits ?? 0}</p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/pricing"
              className="flex flex-1 items-center justify-center rounded-xl border border-[#4A4640] bg-[#1E1C1A] px-4 py-3 text-sm font-semibold text-[#E8E6E1] transition-colors hover:border-[#D97757]/45 hover:text-white"
            >
              Ver planes
            </Link>
            <button
              type="button"
              onClick={openBillingPortal}
              className="flex flex-1 items-center justify-center rounded-xl bg-[#D97757] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-[#D97757]/15 transition-all hover:bg-[#C96949] active:scale-[0.98]"
            >
              Gestionar suscripción
            </button>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-[#3A3833] bg-[#2A2826] p-6">
            <div className="mb-4 flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#3A3833] bg-[#1E1C1A] text-[#D97757]">
                <Mail className="h-5 w-5" strokeWidth={1.5} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#F2EEE8]">Soporte</h2>
                <p className="text-sm text-[#9A9893]">Ayuda directa del equipo PixelFM.</p>
              </div>
            </div>
            <a
              href="mailto:team@pixelfm.com?subject=Soporte%20PixelFM&body=Hola%20equipo%20de%20PixelFM%2C%0A%0ANecesito%20ayuda%20con%3A%0A"
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#4A4640] bg-[#1E1C1A] px-4 py-3 text-sm font-semibold text-[#E8E6E1] transition-colors hover:border-[#D97757]/45 hover:text-white"
            >
              <Mail className="h-4 w-4" strokeWidth={1.5} />
              team@pixelfm.com
            </a>
          </section>

          <section className="rounded-2xl border border-[#3A3833] bg-[#2A2826] p-6">
            <div className="mb-4 flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#3A3833] bg-[#1E1C1A] text-[#D97757]">
                <KeyRound className="h-5 w-5" strokeWidth={1.5} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#F2EEE8]">API y conexiones</h2>
                <p className="text-sm text-[#9A9893]">Accesos para futuras integraciones.</p>
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-[#3A3833] pt-4">
              <span className="text-sm text-[#9A9893]">API Keys</span>
              <span className="rounded-full border border-[#D97757]/20 bg-[#D97757]/10 px-3 py-1 text-xs font-semibold text-[#D97757]">
                Próximamente
              </span>
            </div>
          </section>
        </div>

        <section className="rounded-2xl border border-red-400/20 bg-red-400/5 p-6">
          <div className="mb-5 flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-400/20 bg-red-400/10 text-red-300">
              <TriangleAlert className="h-5 w-5" strokeWidth={1.5} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#F2EEE8]">Zona de peligro</h2>
              <p className="text-sm text-[#9A9893]">Acciones permanentes sobre tu cuenta.</p>
            </div>
          </div>
          <div className="flex flex-col gap-4 border-t border-red-400/15 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-[#E8E6E1]">Eliminar cuenta</p>
              <p className="mt-1 text-xs text-[#85817B]">Esta opción estará disponible próximamente.</p>
            </div>
            <button
              type="button"
              disabled
              className="cursor-not-allowed rounded-xl border border-red-400/20 px-4 py-2.5 text-sm font-semibold text-red-300 opacity-55"
            >
              Eliminar cuenta · Próximamente
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}
