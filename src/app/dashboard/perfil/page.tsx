"use client"

import { FormEvent, useEffect, useState } from "react"
import Link from "next/link"
import { CreditCard, User } from "lucide-react"
import { supabase } from "@/lib/supabase"

export default function ProfilePage() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [plan, setPlan] = useState("Gratis")
  const [credits, setCredits] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  useEffect(() => {
    const loadProfile = async () => {
      setMessage(null)

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        setMessage({ type: "error", text: "No pudimos cargar tu perfil." })
        setLoading(false)
        return
      }

      setName(
        typeof user.user_metadata.full_name === "string"
          ? user.user_metadata.full_name
          : ""
      )
      setEmail(user.email ?? "")

      const { data, error: creditsError } = await supabase
        .from("user_credits")
        .select("plan, credits")
        .eq("user_id", user.id)
        .maybeSingle()

      if (creditsError) {
        setMessage({ type: "error", text: "No pudimos cargar los datos de tu plan." })
      } else if (data) {
        setPlan(data.plan || "Gratis")
        setCredits(data.credits ?? 0)
      }

      setLoading(false)
    }

    loadProfile()
  }, [])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setMessage(null)

    const { error } = await supabase.auth.updateUser({
      data: { full_name: name.trim() },
    })

    if (error) {
      setMessage({ type: "error", text: "No pudimos guardar los cambios. Inténtalo de nuevo." })
    } else {
      setName(name.trim())
      setMessage({ type: "success", text: "Perfil actualizado correctamente." })
    }

    setSaving(false)
  }

  const planLabel = plan.charAt(0).toUpperCase() + plan.slice(1)

  if (loading) {
    return (
      <div className="min-h-[420px] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#D97757]/30 border-t-[#D97757] animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto py-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#E8E6E1]">Información personal</h2>
        <p className="text-sm text-[#9A9893] mt-1">Actualiza los datos visibles de tu cuenta.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_0.8fr] gap-6">
        <form onSubmit={handleSubmit} className="bg-[#2A2826] rounded-2xl border border-[#3A3833] p-6 space-y-5">
          <div className="w-12 h-12 rounded-xl bg-[#D97757]/15 text-[#D97757] flex items-center justify-center">
            <User className="w-6 h-6" aria-hidden="true" />
          </div>

          <div>
            <label htmlFor="fullName" className="block text-xs font-semibold text-[#9A9893] uppercase tracking-wider mb-2">
              Nombre completo
            </label>
            <input
              id="fullName"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Tu nombre completo"
              className="w-full bg-[#1E1C1A] border border-[#3A3833] px-4 py-3 rounded-xl text-sm text-[#E8E6E1] placeholder:text-[#9A9893]/50 focus:outline-none focus:border-[#D97757]/50 transition-colors"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-xs font-semibold text-[#9A9893] uppercase tracking-wider mb-2">
              Correo electrónico
            </label>
            <input
              id="email"
              type="email"
              value={email}
              disabled
              className="w-full bg-[#1E1C1A]/60 border border-[#3A3833] px-4 py-3 rounded-xl text-sm text-[#9A9893] cursor-not-allowed"
            />
            <p className="text-xs text-[#9A9893]/70 mt-2">El correo de acceso no se puede editar desde aquí.</p>
          </div>

          {message && (
            <div
              role="status"
              className={`px-4 py-3 rounded-xl border text-sm ${
                message.type === "success"
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                  : "bg-red-500/10 border-red-500/20 text-red-400"
              }`}
            >
              {message.text}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center bg-[#D97757] text-white font-semibold text-sm px-6 py-3 rounded-xl hover:bg-[#C26547] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
        </form>

        <aside className="bg-[#2A2826] rounded-2xl border border-[#3A3833] p-6 h-fit">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-5">
            <CreditCard className="w-6 h-6" aria-hidden="true" />
          </div>
          <p className="text-xs font-semibold text-[#9A9893] uppercase tracking-wider">Plan actual</p>
          <p className="text-xl font-bold text-emerald-400 mt-1">{planLabel}</p>

          <div className="my-5 border-t border-[#3A3833]" />

          <p className="text-xs font-semibold text-[#9A9893] uppercase tracking-wider">Créditos disponibles</p>
          <p className="text-3xl font-bold text-[#E8E6E1] mt-1 tabular-nums">{credits.toLocaleString()}</p>

          <Link
            href="/pricing"
            className="mt-6 flex items-center justify-center w-full px-4 py-3 rounded-xl border border-[#D97757]/40 text-[#D97757] text-sm font-semibold hover:bg-[#D97757] hover:text-white transition-colors"
          >
            Mejorar mi plan
          </Link>
        </aside>
      </div>
    </div>
  )
}
