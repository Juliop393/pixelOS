"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { ArrowUpRight, FolderOpen, Image as ImageIcon, Sparkles, Video } from "lucide-react"
import PixelAiDrawer from "@/components/dashboard/PixelAiDrawer"
import type { PixelAiInitialRequest } from "@/components/dashboard/PixelAdvisor"
import styles from "@/components/dashboard/DashboardHome.module.css"

interface Creative {
  id: number
  imageUrl: string
  producto: string
  angulo: string
  formato: string
  fecha: string
}

const creationActions = [
  {
    title: "Crear imagen",
    description: "Convierte tu producto en una pieza lista para Feed, Stories o Reels.",
    href: "/dashboard/imagenes",
    icon: ImageIcon,
    eyebrow: "IMAGEN",
    cta: "Abrir generador",
    tone: "image",
  },
  {
    title: "Crear video",
    description: "Construye una secuencia visual con ritmo, intención y foco publicitario.",
    href: "/dashboard/videos",
    icon: Video,
    eyebrow: "VIDEO",
    cta: "Abrir editor",
    tone: "video",
  },
]

const inspirations = [
  {
    title: "Anuncio UGC para redes",
    description: "Una idea cercana que se sienta creada por una persona real.",
    label: "Autenticidad",
  },
  {
    title: "Story 9:16 de producto",
    description: "Una pieza vertical rápida para captar atención desde el primer segundo.",
    label: "Formato",
  },
  {
    title: "Comparación contra una alternativa",
    description: "Haz evidente por qué tu propuesta es la elección más conveniente.",
    label: "Ángulo",
  },
  {
    title: "Demostración visual del producto",
    description: "Muestra el resultado, el uso y el beneficio dentro de una sola escena.",
    label: "Producto",
  },
]

const angleNames: Record<string, string> = {
  comparison: "Contraste competitivo",
  "problem-solution": "Problema y solución",
  "primary-benefit": "Beneficio principal",
  "social-proof": "Prueba social",
  "product-demo": "Demostración del producto",
  "usage-experience": "Experiencia de uso",
  "offer-convenience": "Oferta y conveniencia",
  "unique-mechanism": "Mecanismo único",
  "direct-offer": "Oferta directa",
  scarcity: "Escasez y urgencia",
}

const formatNames: Record<string, string> = {
  square: "1:1",
  story: "9:16",
  "4:5": "4:5",
}

function formatCreativeDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""

  return date.toLocaleDateString("es-PE", {
    day: "numeric",
    month: "short",
  })
}

export default function DashboardHomePage() {
  const requestId = useRef(0)
  const [pixelAiOpen, setPixelAiOpen] = useState(false)
  const [pixelAiInput, setPixelAiInput] = useState("")
  const [initialRequest, setInitialRequest] = useState<PixelAiInitialRequest | null>(null)
  const [recentCreatives, setRecentCreatives] = useState<Creative[]>([])
  const [creativesLoaded, setCreativesLoaded] = useState(false)

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("afm_creativos") || "[]")
      const creatives = Array.isArray(saved)
        ? saved
            .filter((creative): creative is Creative =>
              Boolean(creative && typeof creative.imageUrl === "string" && creative.imageUrl)
            )
            .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
            .slice(0, 4)
        : []

      setRecentCreatives(creatives)
    } catch {
      setRecentCreatives([])
    } finally {
      setCreativesLoaded(true)
    }
  }, [])

  const openPixelAi = () => {
    const message = pixelAiInput.trim()
    setPixelAiOpen(true)

    if (message) {
      requestId.current += 1
      setInitialRequest({ id: requestId.current, message })
      setPixelAiInput("")
    }
  }

  return (
    <div id="dashboard-home" className={styles.homePage}>
      <main className={styles.homeContent}>
        <section className={styles.hero} aria-labelledby="home-title">
          <span className={styles.heroGlow} aria-hidden="true" />

          <header className={styles.intro}>
            <span className={styles.eyebrow}>
              <i aria-hidden="true" />
              ESPACIO CREATIVO
            </span>
            <h1 id="home-title">¿Qué quieres crear hoy?</h1>
            <p>
              Empieza con una imagen que venda una idea o construye una secuencia en movimiento.
              PixelFM te acompaña desde el enfoque hasta la pieza final.
            </p>

            <div className={styles.heroLinks}>
              <span><Sparkles aria-hidden="true" /> Pixel IA piensa la estrategia antes de generar.</span>
              <Link href="/dashboard/assets">
                <FolderOpen aria-hidden="true" />
                Mis creativos
                <ArrowUpRight aria-hidden="true" />
              </Link>
            </div>
          </header>

          <div className={styles.creationGrid} aria-label="Herramientas de creación">
            {creationActions.map(({ title, description, href, icon: Icon, eyebrow, cta, tone }) => (
              <Link key={href} href={href} className={styles.creationCard} data-tone={tone}>
                <div className={styles.creationCopy}>
                  <span className={styles.creationIcon} aria-hidden="true"><Icon /></span>
                  <span className={styles.actionMeta}>{eyebrow}</span>
                  <h2>{title}</h2>
                  <p>{description}</p>
                  <span className={styles.actionLink}>
                    {cta}
                    <ArrowUpRight aria-hidden="true" />
                  </span>
                </div>

                {tone === "image" ? (
                  <span className={styles.imageCanvas} aria-hidden="true">
                    <i />
                    <i />
                    <i />
                    <b>1:1</b>
                  </span>
                ) : (
                  <span className={styles.videoCanvas} aria-hidden="true">
                    <i className={styles.videoFrame}>
                      <b />
                      <b />
                      <b />
                    </i>
                    <i className={styles.videoTrack}>
                      <b />
                      <b />
                      <b />
                    </i>
                  </span>
                )}
              </Link>
            ))}
          </div>
        </section>

        <section className={styles.pixelAiCard} aria-labelledby="pixel-ai-home-title">
          <span className={styles.pixelAiAura} aria-hidden="true" />
          <div className={styles.pixelAiIntro}>
            <span className={styles.pixelAiMark} aria-hidden="true"><Sparkles /></span>
            <div className={styles.pixelAiCopy}>
              <span>PIXEL IA · BRIEF RÁPIDO</span>
              <h2 id="pixel-ai-home-title">Cuéntame qué quieres anunciar</h2>
              <p>Describe tu producto, la idea o el objetivo. Pixel IA te ayudará a ordenar el punto de partida.</p>
            </div>
          </div>

          <form
            className={styles.pixelAiPrompt}
            onSubmit={(event) => {
              event.preventDefault()
              openPixelAi()
            }}
          >
            <textarea
              rows={2}
              value={pixelAiInput}
              onChange={(event) => setPixelAiInput(event.target.value)}
              aria-label="Brief para Pixel IA"
              placeholder="Ej. Quiero anunciar una crema facial para mujeres de 30 a 45 años y destacar su efecto hidratante…"
            />
            <button type="submit" aria-label="Abrir Pixel IA con este brief">
              <Sparkles aria-hidden="true" />
              Pensar con Pixel IA
            </button>
          </form>
        </section>

        <section className={styles.recentSection} aria-labelledby="recent-title">
          <header className={styles.sectionHeader}>
            <div>
              <span>TU BIBLIOTECA</span>
              <h2 id="recent-title">Creativos recientes</h2>
              <p>Retoma tus últimas piezas o entra a la biblioteca completa.</p>
            </div>
            <Link href="/dashboard/assets">
              Ver todos
              <ArrowUpRight aria-hidden="true" />
            </Link>
          </header>

          {!creativesLoaded ? (
            <div className={styles.recentGrid} aria-label="Cargando creativos recientes">
              {[0, 1, 2, 3].map((item) => <span key={item} className={styles.creativeSkeleton} />)}
            </div>
          ) : recentCreatives.length > 0 ? (
            <div className={styles.recentGrid}>
              {recentCreatives.map((creative) => (
                <Link
                  key={creative.id}
                  href="/dashboard/assets"
                  className={styles.creativeCard}
                  aria-label={"Ver creativo " + (creative.producto || "sin título")}
                >
                  <span className={styles.creativeImage}>
                    <img src={creative.imageUrl} alt="" />
                    <b>{formatNames[creative.formato] || creative.formato}</b>
                  </span>
                  <span className={styles.creativeDetails}>
                    <strong>{creative.producto || "Creativo sin título"}</strong>
                    <span>{angleNames[creative.angulo] || creative.angulo}</span>
                    <small>{formatCreativeDate(creative.fecha)}</small>
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className={styles.emptyLibrary}>
              <span aria-hidden="true"><ImageIcon /></span>
              <div>
                <h3>Tu estudio está listo para la primera pieza.</h3>
                <p>Cuando generes un creativo, aparecerá aquí para que puedas volver a él rápidamente.</p>
              </div>
              <Link href="/dashboard/imagenes">
                Crear mi primera imagen
                <ArrowUpRight aria-hidden="true" />
              </Link>
            </div>
          )}
        </section>

        <section className={styles.inspirationSection} aria-labelledby="ideas-title">
          <header className={styles.sectionHeader}>
            <div>
              <span>PUNTOS DE PARTIDA</span>
              <h2 id="ideas-title">Ideas para crear</h2>
              <p>Cuatro maneras de transformar un producto en una historia publicitaria.</p>
            </div>
          </header>

          <div className={styles.inspirationGrid}>
            {inspirations.map((idea, index) => (
              <article key={idea.title} className={styles.ideaCard}>
                <span className={styles.ideaIndex}>0{index + 1}</span>
                <span className={styles.ideaLabel}>{idea.label}</span>
                <h3>{idea.title}</h3>
                <p>{idea.description}</p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <PixelAiDrawer
        open={pixelAiOpen}
        onOpenChange={setPixelAiOpen}
        initialRequest={initialRequest}
      />
    </div>
  )
}
