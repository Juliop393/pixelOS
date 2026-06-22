export type Angle = {
  id: string
  title: string
  description: string
  icon: string
  badges: { label: string; value: string; color: string }[]
}

export const ANGLES: Angle[] = [
  {
    id: "problem-solution",
    title: "Problema y Solución",
    description: "Identifica el dolor del cliente y posiciona tu producto como la solución obvia. Alto CTR en frío.",
    icon: "⚡",
    badges: [
      { label: "CTR", value: "Alto", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
      { label: "Formato", value: "Letrero", color: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
    ],
  },
  {
    id: "social-proof",
    title: "Prueba Social (Reseñas)",
    description: "Simula testimonios reales. Genera confianza inmediata y reduce la fricción de compra.",
    icon: "💬",
    badges: [
      { label: "Conversión", value: "Alta", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
      { label: "Formato", value: "Prueba Social", color: "bg-pink-500/10 text-pink-400 border-pink-500/20" },
    ],
  },
  {
    id: "product-demo",
    title: "Demostración de Producto",
    description: "El producto es el héroe. Ideal para mostrar características y diferenciadores visuales.",
    icon: "◎",
    badges: [
      { label: "Audiencia", value: "Tibia", color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
      { label: "Formato", value: "Producto", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
    ],
  },
  {
    id: "direct-offer",
    title: "Oferta Directa",
    description: "Precio, descuento, urgencia. Para audiencias calientes y campañas de retargeting.",
    icon: "🔥",
    badges: [
      { label: "Audiencia", value: "Caliente", color: "bg-red-500/10 text-red-400 border-red-500/20" },
      { label: "Formato", value: "Retargeting", color: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
    ],
  },
  {
    id: "comparison",
    title: "Comparación Directa",
    description: "Muestra por qué eres la mejor opción. Ideal para mercados competitivos y clientes indecisos.",
    icon: "⚡",
    badges: [
      { label: "Decisión", value: "Alta", color: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" },
      { label: "Formato", value: "Versus", color: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" },
    ],
  },
  {
    id: "scarcity",
    title: "Escasez y Urgencia",
    description: "Últimas unidades, tiempo limitado. Activa el miedo a perderse algo (FOMO) y acelera la decisión de compra.",
    icon: "🔥",
    badges: [
      { label: "FOMO", value: "Máximo", color: "bg-rose-500/10 text-rose-400 border-rose-500/20" },
      { label: "Formato", value: "Urgencia", color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" },
    ],
  },
]