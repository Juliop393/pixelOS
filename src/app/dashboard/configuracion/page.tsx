export default function ConfiguracionPage() {
  return (
    <div className="max-w-5xl mx-auto">
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
            <div className="flex items-center justify-between py-3 border-b border-[#3A3833]">
              <span className="text-sm text-[#9A9893]">Nombre de la agencia</span>
              <span className="text-sm text-[#E8E6E1]">Mi Agencia</span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-[#3A3833]">
              <span className="text-sm text-[#9A9893]">Email</span>
              <span className="text-sm text-[#E8E6E1]">user@afmstudio.com</span>
            </div>
            <div className="flex items-center justify-between py-3">
              <span className="text-sm text-[#9A9893]">Plan actual</span>
              <span className="text-sm font-semibold text-[#D97757]">Pro</span>
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
