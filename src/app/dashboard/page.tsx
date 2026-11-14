"use client"

import { Fraunces } from "next/font/google"
import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { ArrowUpRight, FolderOpen, Image as ImageIcon, Video } from "lucide-react"
import PixelAiIcon from "@/components/dashboard/PixelAiIcon"
import PixelAiDrawer from "@/components/dashboard/PixelAiDrawer"
import { usePixelAiHost } from "@/lib/pixel-ai-context"
import { supabase } from "@/lib/supabase"
import type { PixelAiInitialRequest } from "@/components/dashboard/PixelAdvisor"
import { ImageCreationVisual, VideoCreationVisual } from "@/components/dashboard/home/CreationVisuals"
import IdeaPreview, { type IdeaPreviewKind } from "@/components/dashboard/home/IdeaPreview"
import styles from "@/components/dashboard/DashboardHome.module.css"

const display = Fraunces({ subsets: ["latin"], weight: "variable", axes: ["SOFT", "WONK", "opsz"], display: "swap", variable: "--font-display" })

interface Creative {
  id: string
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

const inspirations: { title: string; description: string; label: string; preview: IdeaPreviewKind }[] = [
  {
    title: "Anuncio UGC para redes",
    description: "Una idea cercana que se sienta creada por una persona real.",
    label: "Autenticidad",
    preview: "ugc",
  },
  {
    title: "Story 9:16 de producto",
    description: "Una pieza vertical rápida para captar atención desde el primer segundo.",
    label: "Formato",
    preview: "story",
  },
  {
    title: "Comparación contra una alternativa",
    description: "Haz evidente por qué tu propuesta es la elección más conveniente.",
    label: "Ángulo",
    preview: "compare",
  },
  {
    title: "Demostración visual del producto",
    description: "Muestra el resultado, el uso y el beneficio dentro de una sola escena.",
    label: "Producto",
    preview: "demo",
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
  usePixelAiHost(pixelAiOpen, setPixelAiOpen)
  const [pixelAiInput, setPixelAiInput] = useState("")
  const [initialRequest, setInitialRequest] = useState<PixelAiInitialRequest | null>(null)
  const [recentCreatives, setRecentCreatives] = useState<Creative[]>([])
  const [creativesLoaded, setCreativesLoaded] = useState(false)

  // Recent creatives come from the signed-in user's own library (RLS on creative_assets), like
  // "Mis creativos". The old browser-wide "afm_creativos" list mixed accounts on a shared browser.
  useEffect(() => {
    let active = true
    // Account whose creatives are shown (or loading); a different account clears them first.
    let shownFor: string | null = null
    let request = 0
    try { localStorage.removeItem("afm_creativos") } catch { /* storage unavailable */ }

    const load = async (userId: string) => {
      const current = ++request
      const { data, error } = await supabase.from("creative_assets")
        .select("id,public_url,title,format,metadata,created_at")
        .eq("user_id", userId)
        .eq("media_type", "image")
        .not("public_url", "is", null)
        .order("created_at", { ascending: false })
        .limit(4)
      // A response for an account that is no longer signed in is dropped.
      if (!active || current !== request) return
      setRecentCreatives(error || !data ? [] : data.flatMap((row): Creative[] => {
        if (typeof row.public_url !== "string" || !row.public_url) return []
        const metadata = row.metadata && typeof row.metadata === "object" ? row.metadata as Record<string, unknown> : {}
        return [{
          id: String(row.id),
          imageUrl: row.public_url,
          producto: typeof row.title === "string" ? row.title : "",
          angulo: typeof metadata.angle === "string" ? metadata.angle : "",
          formato: typeof row.format === "string" ? row.format : "",
          fecha: typeof row.created_at === "string" ? row.created_at : "",
        }]
      }))
      setCreativesLoaded(true)
    }

    // Fires with the current session on subscribe and again on every sign-in, sign-out or account change.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const userId = session?.user.id ?? null
      if (userId === shownFor) return
      shownFor = userId
      request += 1
      setRecentCreatives([])
      setCreativesLoaded(false)
      // Deferred: Supabase calls must not run inside the auth callback itself.
      if (userId) setTimeout(() => { void load(userId).catch(() => { if (active) { setRecentCreatives([]); setCreativesLoaded(true) } }) }, 0)
    })
    return () => {
      active = false
      subscription.unsubscribe()
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
    <div id="dashboard-home" className={`${styles.homePage} ${display.variable}`}>

      <main className={styles.homeContent}>
        <section className={styles.hero} aria-labelledby="home-title">
          <span className={styles.heroGlow} aria-hidden="true" />

          <header className={styles.intro}>
            <span className={styles.eyebrow}>
              <i aria-hidden="true" />
              ESPACIO CREATIVO
            </span>
            <h1 id="home-title">¿Qué quieres <span className={styles.accent}>crear hoy?</span></h1>
            <p>
              Empieza con una imagen que venda una idea o construye una secuencia en movimiento.
              PixelFM te acompaña desde el enfoque hasta la pieza final.
            </p>

            <div className={styles.heroLinks}>
              <span><PixelAiIcon aria-hidden="true" /> PixelIA piensa la estrategia antes de generar.</span>
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
                <span className={styles.cardLight} aria-hidden="true" />
                <div className={styles.creationCopy}>
                  <div className={styles.creationHead}>
                    <span className={styles.creationIcon} aria-hidden="true"><Icon /></span>
                    <span className={styles.actionMeta}>{eyebrow}</span>
                  </div>
                  <h2>{title}</h2>
                  <p>{description}</p>
                  <span className={styles.actionLink}>
                    {cta}
                    <ArrowUpRight aria-hidden="true" />
                  </span>
                </div>

                {tone === "image" ? <ImageCreationVisual /> : <VideoCreationVisual />}
              </Link>
            ))}
          </div>
        </section>

        <section className={styles.recentSection} aria-labelledby="recent-title">
          <header className={styles.sectionHeader}>
            <div>
              <span>TU BIBLIOTECA</span>
              <h2 id="recent-title">Creativos recientes</h2>
              <p>Retoma tus últimas piezas o entra a la biblioteca completa.</p>
            </div>
            <Link href="/dashboard/assets" className={styles.viewAll}>
              Ver todos
              <ArrowUpRight aria-hidden="true" />
            </Link>
          </header>

          {!creativesLoaded ? (
            <div className={styles.recentGrid} data-count={4} aria-label="Cargando creativos recientes">
              {[0, 1, 2, 3].map((item) => <span key={item} className={styles.creativeSkeleton} />)}
            </div>
          ) : recentCreatives.length > 0 ? (
            <div className={styles.recentGrid} data-count={recentCreatives.length}>
              {recentCreatives.map((creative) => (
                <Link
                  key={creative.id}
                  href="/dashboard/assets"
                  className={styles.creativeCard}
                  aria-label={"Ver creativo " + (creative.producto || "sin título")}
                >
                  <img src={creative.imageUrl} alt="" loading="lazy" />
                  <b className={styles.creativeFormat}>{formatNames[creative.formato] || creative.formato}</b>
                  <span className={styles.creativeDetails}>
                    <small>{formatCreativeDate(creative.fecha)}</small>
                    <strong>{creative.producto || "Creativo sin título"}</strong>
                    <span>{angleNames[creative.angulo] || creative.angulo}</span>
                  </span>
                  <span className={styles.creativeOpen} aria-hidden="true"><ArrowUpRight /></span>
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
              <article key={idea.title} className={styles.ideaCard} data-kind={idea.preview}>
                <IdeaPreview kind={idea.preview} />
                <div className={styles.ideaBody}>
                  <div className={styles.ideaMeta}>
                    <span className={styles.ideaIndex}>0{index + 1}</span>
                    <span className={styles.ideaLabel}>{idea.label}</span>
                  </div>
                  <h3>{idea.title}</h3>
                  <p>{idea.description}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.pixelAiCard} aria-labelledby="pixel-ai-home-title">
          <span className={styles.pixelAiAura} aria-hidden="true" />
          <span className={styles.pixelAiAuraWarm} aria-hidden="true" />
          <div className={styles.pixelAiIntro}>
            <span className={styles.pixelAiMark} aria-hidden="true"><PixelAiIcon /></span>
            <div className={styles.pixelAiCopy}>
              <span>PIXELIA · BRIEF RÁPIDO</span>
              <h2 id="pixel-ai-home-title">¿No sabes por dónde empezar? <em>Habla con PixelIA.</em></h2>
              <p>Cuéntale qué quieres anunciar: tu producto, la idea o el objetivo. PixelIA te ayuda a ordenar el punto de partida.</p>
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
              aria-label="Brief para PixelIA"
              placeholder="Ej. Quiero anunciar una crema facial para mujeres de 30 a 45 años y destacar su efecto hidratante…"
            />
            <div className={styles.pixelAiActions}>
              <small>PixelIA se abre a un lado, sin salir de tu estudio.</small>
              <button type="submit" aria-label="Abrir PixelIA con este brief">
                <PixelAiIcon aria-hidden="true" />
                Pensar con PixelIA
              </button>
            </div>
          </form>
        </section>

        <footer className={styles.homeClosing}>
          <i aria-hidden="true" />
          <span>PixelFM · Tu estudio creativo</span>
          <i aria-hidden="true" />
        </footer>
      </main>

      <PixelAiDrawer
        open={pixelAiOpen}
        onOpenChange={setPixelAiOpen}
        initialRequest={initialRequest}
      />
    </div>
  )
}
