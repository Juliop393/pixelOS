export type VideoOption = { id: string; label: string; description: string; icon: string; swatch?: string }
export type VideoChunkStatus = "pending" | "configured" | "generating" | "generated" | "error"
export type VideoChunk = { id: number; purpose: string; duration: 6; status: VideoChunkStatus; videoUrl?: string }

export const VIDEO_ANGLES: VideoOption[] = [
  { id: "problem", label: "Problema → Solución", description: "Presenta la tensión y resuélvela.", icon: "🧩", swatch: "linear-gradient(145deg,#d77a59,#642f25)" },
  { id: "benefit", label: "Beneficio principal", description: "Enfoca el resultado más valioso.", icon: "🏆", swatch: "linear-gradient(145deg,#d8b06d,#63502d)" },
  { id: "demo", label: "Demostración de producto", description: "Muestra el producto en acción.", icon: "🎬", swatch: "linear-gradient(145deg,#82966d,#32402f)" },
  { id: "social", label: "Prueba social", description: "Convierte confianza en decisión.", icon: "💬", swatch: "linear-gradient(145deg,#9e82a7,#44334a)" },
  { id: "comparison", label: "Comparación", description: "Contrasta dos alternativas.", icon: "⚖️", swatch: "linear-gradient(145deg,#7393a8,#253b49)" },
  { id: "experience", label: "Experiencia de uso", description: "Haz tangible cómo se siente.", icon: "✨", swatch: "linear-gradient(145deg,#c79d84,#654334)" },
  { id: "offer", label: "Oferta / conveniencia", description: "Lleva la propuesta al frente.", icon: "🏷️", swatch: "linear-gradient(145deg,#e88158,#792f22)" },
  { id: "mechanism", label: "Mecanismo único", description: "Explica qué lo hace diferente.", icon: "⚙️", swatch: "linear-gradient(145deg,#748b91,#293a3e)" },
]

export const VIDEO_HOOKS: VideoOption[] = [
  { id: "result", label: "Resultado primero", description: "Abre con la transformación.", icon: "🚀", swatch: "linear-gradient(145deg,#e18b68,#713c2e)" },
  { id: "question", label: "Pregunta directa", description: "Activa una necesidad concreta.", icon: "❓", swatch: "linear-gradient(145deg,#d7ae70,#594724)" },
  { id: "problem", label: "Problema reconocible", description: "Conecta desde una fricción real.", icon: "⚠️", swatch: "linear-gradient(145deg,#bf6e62,#592c29)" },
  { id: "interrupt", label: "Pattern interrupt", description: "Rompe el ritmo del feed.", icon: "💥", swatch: "linear-gradient(145deg,#8d7ca5,#3d344c)" },
  { id: "curiosity", label: "Curiosidad", description: "Abre una idea que pide respuesta.", icon: "👀", swatch: "linear-gradient(145deg,#718ba5,#283b4e)" },
  { id: "instant", label: "Demostración inmediata", description: "Actúa desde el primer segundo.", icon: "🎥", swatch: "linear-gradient(145deg,#7f9b77,#31452e)" },
  { id: "before", label: "Antes / después", description: "Contrasta dos estados visuales.", icon: "🔄", swatch: "linear-gradient(145deg,#c39b80,#684737)" },
  { id: "offer", label: "Oferta directa", description: "Presenta valor y acción sin rodeos.", icon: "🎯", swatch: "linear-gradient(145deg,#ed8058,#772d20)" },
]

export const VIDEO_STYLES: VideoOption[] = [
  { id: "ugc", label: "UGC", description: "Natural, directo y humano.", icon: "📱", swatch: "linear-gradient(145deg,#d9a58f,#75483d)" },
  { id: "cinematic", label: "Product Cinematic", description: "Luz y movimiento premium.", icon: "🎞️", swatch: "linear-gradient(145deg,#d2a16f,#3b261d)" },
  { id: "lifestyle", label: "Lifestyle", description: "Producto dentro de una escena real.", icon: "🌿", swatch: "linear-gradient(145deg,#a9b582,#34432f)" },
  { id: "demo", label: "Product Demo", description: "Claridad funcional paso a paso.", icon: "🎬", swatch: "linear-gradient(145deg,#7594a5,#243842)" },
  { id: "editorial", label: "Editorial Premium", description: "Ritmo calmado y composición cuidada.", icon: "✨", swatch: "linear-gradient(145deg,#f0d8c9,#985c43)" },
  { id: "commercial", label: "Dynamic Commercial", description: "Energía y foco en conversión.", icon: "⚡", swatch: "linear-gradient(145deg,#ef835e,#792e24)" },
  { id: "minimal", label: "Minimal Product", description: "Producto, espacio y mensaje esencial.", icon: "◻", swatch: "linear-gradient(145deg,#e8e5df,#6d7475)" },
  { id: "b2b", label: "B2B / Professional", description: "Sobrio y orientado a negocio.", icon: "🏢", swatch: "linear-gradient(145deg,#57778c,#172d3b)" },
]

export const CHUNK_PURPOSES = ["Gancho / apertura", "Producto / demostración", "Beneficio", "Prueba / refuerzo", "CTA"]
