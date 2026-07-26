export type Angle = {
  id: string
  title: string
  description: string
  icon: string
  badges: { label: string; value: string; color: string }[]
}

export const ANGLES: Angle[] = [
  {
    id: "comparison",
    title: "Contraste competitivo",
    description: "Compara una alternativa genérica o método tradicional frente al producto, sin mencionar marcas competidoras.",
    icon: "⚖️",
    badges: [
      { label: "Enfoque", value: "Comparación", color: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" },
    ],
  },
  {
    id: "problem-solution",
    title: "Problema y solución",
    description: "Presenta un problema real del cliente y muestra cómo el producto lo resuelve de forma práctica.",
    icon: "💡",
    badges: [
      { label: "Enfoque", value: "Problema real", color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
    ],
  },
  {
    id: "primary-benefit",
    title: "Beneficio principal",
    description: "Destaca el resultado práctico más importante que el producto ofrece al cliente.",
    icon: "⭐",
    badges: [
      { label: "Enfoque", value: "Beneficio", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
    ],
  },
  {
    id: "social-proof",
    title: "Prueba social",
    description: "Usa testimonios, reseñas, clientes o cifras reales proporcionadas por el usuario. No inventes datos.",
    icon: "💬",
    badges: [
      { label: "Enfoque", value: "Confianza", color: "bg-pink-500/10 text-pink-400 border-pink-500/20" },
    ],
  },
  {
    id: "product-demo",
    title: "Demostración del producto",
    description: "Muestra el producto funcionando o claramente presentado en su contexto real de uso.",
    icon: "◎",
    badges: [
      { label: "Enfoque", value: "Producto en uso", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
    ],
  },
  {
    id: "usage-experience",
    title: "Experiencia de uso",
    description: "Muestra cómo el producto se integra naturalmente en la rutina o experiencia del usuario.",
    icon: "🎬",
    badges: [
      { label: "Enfoque", value: "Experiencia", color: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" },
    ],
  },
  {
    id: "offer-convenience",
    title: "Oferta y conveniencia",
    description: "Destaca precio, stock, venta por mayor, entrega, ahorro de tiempo o facilidad de compra reales.",
    icon: "🏷️",
    badges: [
      { label: "Enfoque", value: "Venta / Conveniencia", color: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
    ],
  },
]
