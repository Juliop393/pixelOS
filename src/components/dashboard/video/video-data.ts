export type VideoOption = { id: string; label: string; description: string; icon: string }
export type VideoChunk = { id: number; purpose: string; duration: 6 }

export const VIDEO_ANGLES: VideoOption[] = [
  { id: "problem", label: "Problema → Solución", description: "Presenta la tensión y resuélvela.", icon: "↗" },
  { id: "benefit", label: "Beneficio principal", description: "Enfoca el resultado más valioso.", icon: "✦" },
  { id: "demo", label: "Demostración de producto", description: "Muestra el producto en acción.", icon: "▶" },
  { id: "social", label: "Prueba social", description: "Convierte confianza en decisión.", icon: "◎" },
  { id: "comparison", label: "Comparación", description: "Contrasta dos alternativas.", icon: "⇄" },
  { id: "experience", label: "Experiencia de uso", description: "Haz tangible cómo se siente.", icon: "◇" },
  { id: "offer", label: "Oferta / conveniencia", description: "Lleva la propuesta al frente.", icon: "%" },
  { id: "mechanism", label: "Mecanismo único", description: "Explica qué lo hace diferente.", icon: "⌁" },
]

export const VIDEO_HOOKS: VideoOption[] = [
  { id: "result", label: "Resultado primero", description: "Abre con la transformación.", icon: "01" },
  { id: "question", label: "Pregunta directa", description: "Activa una necesidad concreta.", icon: "?" },
  { id: "problem", label: "Problema reconocible", description: "Conecta desde una fricción real.", icon: "!" },
  { id: "interrupt", label: "Pattern interrupt", description: "Rompe el ritmo del feed.", icon: "×" },
  { id: "curiosity", label: "Curiosidad", description: "Abre una idea que pide respuesta.", icon: "…" },
  { id: "instant", label: "Demostración inmediata", description: "Actúa desde el primer segundo.", icon: "▶" },
  { id: "before", label: "Antes / después", description: "Contrasta dos estados visuales.", icon: "⇥" },
  { id: "offer", label: "Oferta directa", description: "Presenta valor y acción sin rodeos.", icon: "%" },
]

export const VIDEO_STYLES: VideoOption[] = [
  { id: "ugc", label: "UGC", description: "Natural, directo y humano.", icon: "◉" },
  { id: "cinematic", label: "Product Cinematic", description: "Luz y movimiento premium.", icon: "◈" },
  { id: "lifestyle", label: "Lifestyle", description: "Producto dentro de una escena real.", icon: "☼" },
  { id: "demo", label: "Product Demo", description: "Claridad funcional paso a paso.", icon: "▶" },
  { id: "editorial", label: "Editorial Premium", description: "Ritmo calmado y composición cuidada.", icon: "◆" },
  { id: "commercial", label: "Dynamic Commercial", description: "Energía y foco en conversión.", icon: "ϟ" },
  { id: "minimal", label: "Minimal Product", description: "Producto, espacio y mensaje esencial.", icon: "□" },
  { id: "b2b", label: "B2B / Professional", description: "Sobrio y orientado a negocio.", icon: "▦" },
]

export const CHUNK_PURPOSES = ["Gancho / apertura", "Producto / demostración", "Beneficio", "Prueba / refuerzo", "CTA"]
