export default function CampanasPage() {
  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Mis Campañas</h1>
        <p className="text-[#9A9893]">Organiza y gestiona tus creativos generados</p>
      </div>

      <div className="bg-[#2A2826] rounded-2xl border border-[#3A3833] p-12 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#1E1C1A] border border-[#3A3833] flex items-center justify-center mb-5">
          <svg className="w-8 h-8 text-[#9A9893]/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <p className="text-[#9A9893] font-medium mb-1">Tus creativos guardados aparecerán aquí.</p>
        <p className="text-[#9A9893]/50 text-sm">Genera tu primer creativo desde el panel principal.</p>
      </div>
    </div>
  )
}
