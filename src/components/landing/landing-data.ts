import { CREDIT_COST, VIDEO_DURATION_SECONDS } from "@/lib/pricing-plans"

/** Real outputs generated with PixelFM, served from public/landing. */
export const MEDIA = {
  audifonos: { image: "/landing/audifonos-imagen.jpg", video: "/landing/audifonos-video.mp4", category: "Audio", alt: "Anuncio de audífonos premium" },
  carro: { image: "/landing/carro-imagen.jpg", video: "/landing/carro-video.mp4", category: "Automotriz", alt: "Anuncio de un SUV en un estudio oscuro" },
  perro: { image: "/landing/perro-imagen.jpg", video: "/landing/perro-video.mp4", category: "Mascotas", alt: "Anuncio de comida natural para perros" },
  scooter: { image: "/landing/scooter-imagen.jpg", video: "/landing/scooterelectrico-video.mp4", category: "Movilidad", alt: "Anuncio de una scooter eléctrica en la ciudad" },
  zapatillas: { image: "/landing/zapatillas-imagen.jpg", video: "/landing/zapatillas-video.mp4", category: "Deporte", alt: "Anuncio de zapatillas para correr" },
} as const

export type MediaKey = keyof typeof MEDIA

/** Poster through the Next image optimizer: a light WebP instead of the full JPG. */
export const posterOf = (key: MediaKey) => `/_next/image?url=${encodeURIComponent(MEDIA[key].image)}&w=640&q=70`

export const ANGLES = ["Problema y solución", "Beneficio principal", "Comparación", "Prueba social", "Demostración", "Oferta y conveniencia", "Mecanismo único"]

export const FAQS = [
  { q: "¿Necesito saber diseñar?", a: "No. Describes lo que quieres lograr y PixelFM prepara la composición. Si quieres decidir más, Modo Pro te deja elegir ángulo, estilo y formato." },
  { q: "¿PixelFM crea imágenes y videos?", a: `Sí. Crea imágenes publicitarias en 1:1, 4:5 y 9:16, y clips de video de ${VIDEO_DURATION_SECONDS} segundos a partir de una imagen, en calidad Rápida o Premium. En Modo Pro puedes construir un video por escenas.` },
  { q: "¿Qué son los créditos?", a: `Son la unidad de uso de PixelFM: cada imagen usa ${CREDIT_COST.image} crédito y cada video de ${VIDEO_DURATION_SECONDS} segundos usa ${CREDIT_COST.video} en calidad Rápida o ${CREDIT_COST.premiumVideo} en Premium. Es un solo saldo para ambos, y puedes añadir packs si necesitas más.` },
  { q: "¿Puedo usar mis propias imágenes?", a: "Sí. Puedes subir una referencia en JPG, PNG o WEBP de hasta 5 MB para que PixelFM mantenga tu producto y tu estilo." },
  { q: "¿Puedo usar los resultados para publicidad?", a: "Sí. Según nuestros términos, los creativos generados son tuyos. Revisa cada pieza antes de publicar: los resultados se generan con IA y pueden variar." },
]
