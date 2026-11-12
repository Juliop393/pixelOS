import { CREDIT_COST, VIDEO_DURATION_SECONDS } from "@/lib/pricing-plans"

/**
 * Real outputs generated with PixelFM, served from public/landing. Each entry is one
 * campaign: its image and the video made from it always travel together.
 * (dron and laptop images are JPEG data despite the .png names; browsers sniff it.)
 */
export const MEDIA = {
  porsche: { image: "/landing/porsche_imagen.jpg", video: "/landing/porsche_video.mp4", category: "Automotriz", title: "Deportivo en ruta de montaña", alt: "Anuncio de un deportivo plateado en una carretera de montaña" },
  grafica: { image: "/landing/grafica_imagen.jpg", video: "/landing/grafica_video.mp4", category: "Tecnología", title: "Tarjeta gráfica de alto rendimiento", alt: "Anuncio de una tarjeta gráfica sobre un escritorio de diseño" },
  laptop: { image: "/landing/laptop_imagen.png", video: "/landing/laptop_video.mp4", category: "Tecnología", title: "Laptop para creadores", alt: "Anuncio de una laptop en un escritorio con luz natural" },
  dron: { image: "/landing/dron_imagen.png", video: "/landing/dron_video.mp4", category: "Fotografía aérea", title: "Dron al atardecer", alt: "Anuncio de un dron sobre un mirador al atardecer" },
  audifonos: { image: "/landing/audifonos-imagen.jpg", video: "/landing/audifonos-video.mp4", category: "Audio", title: "Audífonos premium", alt: "Anuncio de audífonos premium" },
  carro: { image: "/landing/carro-imagen.jpg", video: "/landing/carro-video.mp4", category: "Automotriz", title: "SUV en estudio", alt: "Anuncio de un SUV en un estudio oscuro" },
  perro: { image: "/landing/perro-imagen.jpg", video: "/landing/perro-video.mp4", category: "Mascotas", title: "Comida natural para perros", alt: "Anuncio de comida natural para perros" },
  scooter: { image: "/landing/scooter-imagen.jpg", video: "/landing/scooterelectrico-video.mp4", category: "Movilidad", title: "Scooter eléctrica urbana", alt: "Anuncio de una scooter eléctrica en la ciudad" },
  zapatillas: { image: "/landing/zapatillas-imagen.jpg", video: "/landing/zapatillas-video.mp4", category: "Deporte", title: "Zapatillas para correr", alt: "Anuncio de zapatillas para correr" },
} as const

/** Order of the campaign showcase: the featured ones open it. */
export const CAMPAIGNS = ["porsche", "grafica", "laptop", "dron", "carro", "audifonos", "zapatillas", "scooter", "perro"] as const satisfies readonly (keyof typeof MEDIA)[]

export const FEATURED_CAMPAIGNS: readonly (keyof typeof MEDIA)[] = ["porsche", "grafica"]

export type MediaKey = keyof typeof MEDIA

/** Poster through the Next image optimizer: a light WebP instead of the full JPG. */
export const posterOf = (key: MediaKey, width = 640) => `/_next/image?url=${encodeURIComponent(MEDIA[key].image)}&w=${width}&q=70`

export const ANGLES = ["Problema y solución", "Beneficio principal", "Comparación", "Prueba social", "Demostración", "Oferta y conveniencia", "Mecanismo único"]

export const FAQS = [
  { q: "¿Necesito saber diseñar?", a: "No. Describes lo que quieres lograr y PixelFM prepara la composición. Si quieres decidir más, Modo Pro te deja elegir ángulo, estilo y formato." },
  { q: "¿PixelFM crea imágenes y videos?", a: `Sí. Crea imágenes publicitarias en 1:1, 4:5 y 9:16, y clips de video de ${VIDEO_DURATION_SECONDS} segundos a partir de una imagen, en Video Rápido o Video Premium. En Modo Pro puedes construir un video por escenas.` },
  { q: "¿Qué son los créditos?", a: `Son la unidad de uso de PixelFM: cada imagen usa ${CREDIT_COST.image} crédito y cada video de ${VIDEO_DURATION_SECONDS} segundos usa ${CREDIT_COST.video} en Video Rápido o ${CREDIT_COST.premiumVideo} en Video Premium. Es un solo saldo para ambos, y puedes añadir packs si necesitas más.` },
  { q: "¿Puedo usar mis propias imágenes?", a: "Sí. Puedes subir una referencia en JPG, PNG o WEBP de hasta 5 MB para que PixelFM mantenga tu producto y tu estilo." },
  { q: "¿Puedo usar los resultados para publicidad?", a: "Sí. Según nuestros términos, los creativos generados son tuyos. Revisa cada pieza antes de publicar: los resultados se generan con IA y pueden variar." },
]
