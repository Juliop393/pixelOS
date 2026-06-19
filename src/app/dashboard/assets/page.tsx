export default function AssetsPage() {
  return (
    <div className="min-h-screen bg-[#1E1C1A] text-[#E8E6E1] p-6 lg:p-10">
      <div className="max-w-5xl mx-auto">
        <div className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Biblioteca de Assets</h1>
          <p className="text-[#9A9893]">Gestiona los recursos visuales de tu marca</p>
        </div>

        <div className="bg-[#2A2826] rounded-2xl border border-[#3A3833] p-12 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#1E1C1A] border border-[#3A3833] flex items-center justify-center mb-5">
            <svg className="w-8 h-8 text-[#9A9893]/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-[#9A9893] font-medium mb-1">Sube tus logos y productos para entrenar a la IA.</p>
          <p className="text-[#9A9893]/50 text-sm">Los assets mejorarán la precisión de tus creativos generados.</p>
        </div>
      </div>
    </div>
  )
}
