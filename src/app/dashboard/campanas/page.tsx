export default function CampanasPage() {
  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Identidad de Marca</h1>
        <p className="text-[#9A9893]">Próximamente — Sube tu logo y colores de marca para personalizar tus creativos</p>
      </div>

      <div className="bg-[#2A2826] rounded-2xl border border-[#3A3833] p-12 flex flex-col items-center justify-center text-center">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#D97757]/20 to-[#D97757]/5 border border-[#D97757]/30 flex items-center justify-center mb-6">
          <svg className="w-10 h-10 text-[#D97757]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#D97757]/10 border border-[#D97757]/30 mb-4">
          <span className="text-xs font-semibold text-[#D97757] uppercase tracking-wider">Coming Soon</span>
        </div>
        <h2 className="text-xl font-bold text-[#E8E6E1] mb-3">Estamos trabajando en esto</h2>
        <p className="text-[#9A9893] max-w-md leading-relaxed">
          Muy pronto podrás subir tu logo, definir tu paleta de colores y establecer las directrices de tu marca para generar creativos 100% alineados con tu identidad visual.
        </p>
      </div>
    </div>
  )
}
