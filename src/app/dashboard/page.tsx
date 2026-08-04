"use client"

import { CSSProperties, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useCreativeGenerator } from "@/hooks/useCreativeGenerator"
import { supabase } from "@/lib/supabase"
import { ANGLES } from "@/lib/angles-data"
import PixelAdvisor from "@/components/dashboard/PixelAdvisor"
import s from "@/components/dashboard/GeneratorWorkspace.module.css"

const FORMAT_LABELS: Record<string, string> = {
  square: "1:1", story: "9:16", "4:5": "4:5",
}

type Format = "1:1" | "4:5" | "9:16"
const formatToId: Record<Format, string> = { "1:1": "square", "4:5": "4:5", "9:16": "story" }
const idToFormat: Record<string, Format> = { square: "1:1", story: "9:16", "4:5": "4:5" }

type Tab = "Producto" | "Ángulo" | "Diseño"

const ANGLE_ACCENTS: Record<string, string> = {
  "comparison": "#8d79d6", "problem-solution": "#d9a62e", "primary-benefit": "#df7652",
  "social-proof": "#6fa58a", "product-demo": "#5e98c7", "usage-experience": "#55a7a4",
  "offer-convenience": "#d86d70", "unique-mechanism": "#c08a62",
}

export default function DashboardPage() {
  const g = useCreativeGenerator()
  const [tab, setTab] = useState<Tab>("Producto")
  const [advisorToken, setAdvisorToken] = useState<string | undefined>()
  const [highlightProduct, setHighlightProduct] = useState(false)
  const [showGuides, setShowGuides] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [formatOpen, setFormatOpen] = useState(false)
  const [referenceName, setReferenceName] = useState("")
  const [referencePreview, setReferencePreview] = useState("")

  const currentFormat = idToFormat[g.aspectRatio] ?? "1:1"

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAdvisorToken(session?.access_token)
    })
  }, [])

  useEffect(() => {
    if (highlightProduct) {
      const timer = setTimeout(() => setHighlightProduct(false), 2000)
      return () => clearTimeout(timer)
    }
  }, [highlightProduct])

  const handleApplyRecommendation = (rec: {
    angleId: string; styleId: string; format: string; safeZoneMeta: boolean; productDescription?: string
  }) => {
    g.handleSelectAngle(rec.angleId)
    g.setAspectRatio(rec.format)
    g.setVisualStyle(rec.styleId)
    g.setSafeZoneMeta(rec.safeZoneMeta)
    if (rec.productDescription) {
      const current = g.producto.trim()
      if (!current || current.length < 30) {
        g.setProducto(rec.productDescription)
        setTab("Producto")
        setHighlightProduct(true)
      }
    }
  }

  const updateFormat = (nextFormat: Format) => {
    g.setAspectRatio(formatToId[nextFormat])
    setFormatOpen(false)
  }

  const canGenerate = !!g.producto.trim() && !!g.selectedAngle && !g.loading && g.credits >= g.cantidad

  const selectedAngleName = useMemo(() => g.selectedAngle || "", [g.selectedAngle])

  const handleReference = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setReferenceName(file.name)
    const reader = new FileReader()
    reader.onload = () => setReferencePreview(String(reader.result || ""))
    reader.readAsDataURL(file)

    // Upload to real backend
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) return
    const formData = new FormData()
    formData.append("file", file)
    try {
      const res = await fetch("/api/upload", { method: "POST", headers: { Authorization: `Bearer ${session.access_token}` }, body: formData })
      const data = await res.json()
      if (data.success) {
        g.setImagenReferencia(data.publicUrl)
        g.setNombreImagenReferencia(data.fileName)
      }
    } catch { /* upload failed silently */ }
  }

  // Credit/plan data from Topbar logic
  const [userEmail, setUserEmail] = useState("")
  const [fullName, setFullName] = useState("")
  const [plan, setPlan] = useState("Gratis")

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      setUserEmail(user.email ?? "")
      setFullName(typeof user.user_metadata.full_name === "string" ? user.user_metadata.full_name : "")
      supabase.from("user_credits").select("plan").eq("user_id", user.id).maybeSingle().then(({ data }) => {
        if (data?.plan) setPlan(data.plan)
      })
    })
  }, [])

  const displayName = fullName || userEmail.split("@")[0] || "Usuario"
  const avatarLetter = (displayName[0] ?? "U").toUpperCase()
  const planLabel = plan.charAt(0).toUpperCase() + plan.slice(1)

  return (
    <main className={s.generatorPage}>
      <div className={s.ambient} aria-hidden="true"><i /><i /></div>

      {/* === NAVBAR (real data, v2 visual style) === */}
      <header className={s.topbar}>
        <Link className={s.brand} href="/" aria-label="Volver a PixelFM">
          <img src="/pixelfm-logo.png" alt="" />
          <span>Pixel<b>FM</b></span>
        </Link>
        <nav className={s.mainNav} aria-label="Navegación del producto">
          <Link href="/dashboard" className={s.navActive}><span>✦</span>Generador</Link>
          <Link href="/dashboard/campanas"><span>◫</span>Identidad</Link>
          <Link href="/dashboard/assets"><span>▧</span>Mis creativos</Link>
          <Link href="/dashboard/configuracion"><span>⚙</span>Configuración</Link>
        </nav>
        <div className={s.accountArea}>
          <Link href="/pricing" className={s.credits}><span>ϟ</span><b>{g.credits}</b><small>créditos</small></Link>
          <Link href="/pricing" className={s.recharge}>Recargar</Link>
          <span className={s.accountDivider} />
          <Link href="/dashboard/perfil" className={s.profile}>
            <i>{avatarLetter}</i>
            <span><b>{displayName}</b><small>Plan {planLabel}</small></span>
          </Link>
          <button className={s.logout} onClick={async () => { await supabase.auth.signOut(); window.location.href = "/login" }}>Salir</button>
        </div>
      </header>

      <section className={s.workspace}>
        {/* ===== LEFT PANEL (v2) ===== */}
        <aside className={s.builderPanel}>
          <div className={s.panelIntro}>
            <span className={s.eyebrow}>NUEVO CREATIVO</span>
            <h1>Construye tu anuncio</h1>
            <p>Define el producto y deja que Pixel IA ordene el resto.</p>
          </div>
          <div className={s.stepTabs} role="tablist" aria-label="Pasos del generador">
            {(["Producto", "Ángulo", "Diseño"] as Tab[]).map((item, index) => (
              <button key={item} role="tab" aria-selected={tab === item} className={tab === item ? s.stepActive : ""} onClick={() => setTab(item)}>
                <span>0{index + 1}</span>{item}
              </button>
            ))}
          </div>

          <div className={s.formScroll}>
            {tab === "Producto" && <div className={s.tabContent}>
              <section className={s.formCard}>
                <div className={s.formHeading}><span>01</span><div><h2>Tu producto</h2><p>La base para construir una estrategia relevante.</p></div></div>
                <label htmlFor="product">¿Qué vendes y para quién?</label>
                <textarea id="product" value={g.producto} onChange={(e) => g.setProducto(e.target.value)} placeholder="Ej. Sérum facial para personas con piel sensible…" style={highlightProduct ? { borderColor: "#d76b45" } : {}} />
                <div className={s.helper}><span>✦</span> Pixel IA usará esta descripción para recomendar el mejor ángulo.</div>
              </section>
              <section className={s.formCard}>
                <div className={s.formHeading}><span>02</span><div><h2>Texto del anuncio</h2><p>Opcional · Pixel IA puede proponerlo.</p></div></div>
                <label htmlFor="headline">Título principal</label>
                <input id="headline" value={g.titulo} onChange={(e) => g.setTitulo(e.target.value)} placeholder="Menos rutina. Más calma." />
                <label htmlFor="subtitle">Texto de apoyo</label>
                <input id="subtitle" value={g.subtitulo} onChange={(e) => g.setSubtitulo(e.target.value)} placeholder="Resultados visibles con una rutina simple." />
                <label htmlFor="cta">Llamada a la acción</label>
                <input id="cta" value={g.ctaContacto} onChange={(e) => g.setCtaContacto(e.target.value)} placeholder="Descubrir producto" />
              </section>
              <section className={`${s.formCard} ${s.quantityCard}`}>
                <div className={s.formHeading}><span>03</span><div><h2>Cantidad de creativos</h2><p>Elige cuántas versiones necesitas.</p></div></div>
                <div className={s.quantityGrid}>
                  {[1, 3, 5, 10].map((n) => (
                    <button onClick={() => g.setCantidad(n)} className={g.cantidad === n ? s.selected : ""} key={n}>
                      <b>{n}</b><small>{n === 1 ? "creativo" : "creativos"}</small>
                    </button>
                  ))}
                </div>
                <div className={s.quantityMeta}><span>{g.cantidad} {g.cantidad === 1 ? "crédito" : "créditos"}</span><b>·</b><span>{g.cantidad} {g.cantidad === 1 ? "creativo" : "creativos"}</span></div>
              </section>
              <section className={s.formCard}>
                <div className={s.formHeading}><span>04</span><div><h2>Imagen de referencia</h2><p>Opcional · Ayuda a respetar producto y marca.</p></div></div>
                <label className={s.uploadField}>
                  {g.imagenReferencia || referencePreview ? (
                    <img src={g.imagenReferencia || referencePreview} alt="Referencia cargada" />
                  ) : (
                    <span>＋</span>
                  )}
                  <div>
                    <b>{g.nombreImagenReferencia || referenceName || "Sube una imagen"}</b>
                    <small>PNG o JPG · Máx. 5 MB</small>
                  </div>
                  <input type="file" accept="image/png,image/jpeg" onChange={handleReference} />
                </label>
              </section>
            </div>}

            {tab === "Ángulo" && <div className={s.tabContent}>
              <div className={s.sectionIntro}><span>ESTRATEGIA</span><h2>Ángulos de venta</h2><p>Elige la idea persuasiva que guiará el anuncio.</p></div>
              <div className={s.angleGrid}>
                  {ANGLES.map((angle) => (
                    <button
                      key={angle.id}
                      style={{ "--angle-accent": ANGLE_ACCENTS[angle.id] || "#df7652" } as CSSProperties}
                      aria-pressed={g.selectedAngle === angle.id}
                      className={g.selectedAngle === angle.id ? s.angleSelected : ""}
                      onClick={() => g.handleSelectAngle(angle.id)}
                    >
                      <div className={s.angleTop}><span className={s.angleIcon}>{angle.icon}</span><i>{g.selectedAngle === angle.id ? "✓" : ""}</i></div>
                      <b>{angle.title}</b>
                      <p>{angle.description}</p>
                      <small>Enfoque: {angle.badges[0]?.value || "—"}</small>
                    </button>
                  ))
                }
              </div>
            </div>}

            {tab === "Diseño" && <div className={s.tabContent}>
              <section className={s.formCard}>
                <div className={s.formHeading}><span>01</span><div><h2>Formato</h2><p>Adapta el creativo a cada ubicación de Meta.</p></div></div>
                <div className={s.formatChoices}>
                  {(["1:1", "4:5", "9:16"] as Format[]).map((item) => (
                    <button key={item} className={currentFormat === item ? s.selected : ""} onClick={() => updateFormat(item)}>
                      <i data-ratio={item} />
                      <b>{item}</b>
                      <small>{item === "1:1" ? "Feed" : item === "4:5" ? "Feed vertical" : "Stories · Reels"}</small>
                    </button>
                  ))}
                </div>
                {currentFormat === "9:16" && (
                  <button className={s.toggleRow} onClick={() => g.setSafeZoneMeta(!g.safeZoneMeta)} aria-pressed={g.safeZoneMeta}>
                    <span><b>Zona Segura Meta</b><small>Protege textos y CTA en Stories y Reels.</small></span>
                    <i className={g.safeZoneMeta ? s.toggleOn : ""}><em /></i>
                  </button>
                )}
              </section>
              <section className={s.formCard}>
                <div className={s.formHeading}><span>02</span><div><h2>Estilo visual</h2><p>Define el lenguaje visual sin depender de prompts.</p></div></div>
                <div className={s.styleGrid}>
                  {(() => {
                    const STYLES = [
                      { id: "premium-editorial", name: "Premium editorial", trait: "Elegante · aspiracional", icon: "◇", swatch: "linear-gradient(145deg,#f0d8c9,#8e4f35)" },
                      { id: "minimal-tech", name: "Minimalista tecnológico", trait: "Limpio · preciso", icon: "—", swatch: "linear-gradient(145deg,#f3eee7,#9d9994)" },
                      { id: "product-action", name: "Producto en acción", trait: "Dinámico · demostrativo", icon: "▶", swatch: "linear-gradient(145deg,#7e8a5f,#1b2119)" },
                      { id: "lifestyle", name: "Lifestyle y contexto", trait: "Humano · natural", icon: "◌", swatch: "linear-gradient(145deg,#ddc49f,#6d816d)" },
                      { id: "direct-offer", name: "Oferta directa", trait: "Impacto · conversión", icon: "%", swatch: "linear-gradient(145deg,#e67550,#6b2d20)" },
                      { id: "b2b", name: "Comercial B2B", trait: "Serio · confiable", icon: "▦", swatch: "linear-gradient(145deg,#49697e,#122432)" },
                      { id: "benefits-infographic", name: "Infografía de beneficios", trait: "Moderno · funcional", icon: "⌁", swatch: "linear-gradient(145deg,#92938f,#24282a)" },
                      { id: "white-bg", name: "Fondo de estudio", trait: "Cercano · artesanal", icon: "☼", swatch: "linear-gradient(145deg,#d9b78f,#755038)" },
                    ]
                    return STYLES.map((item) => (
                      <button key={item.id} className={g.visualStyle === item.id ? s.styleSelected : ""} onClick={() => g.setVisualStyle(item.id)}>
                        <i style={{ background: item.swatch }}><em>{item.icon}</em></i>
                        <span><b>{item.name}</b><small>{item.trait}</small></span>
                        <strong>{g.visualStyle === item.id ? "✓" : ""}</strong>
                      </button>
                    ))
                  })()}
                </div>
              </section>
              <section className={s.formCard}>
                <div className={s.formHeading}><span>03</span><div><h2>Color de marca</h2><p>Opcional · Añade un acento reconocible.</p></div></div>
                <label className={s.colorField}>
                  <input type="color" value={g.brandColor || "#D76B45"} onChange={(e) => g.setBrandColor(e.target.value)} />
                  <span><b>{(g.brandColor || "#D76B45").toUpperCase()}</b><small>Color principal</small></span>
                </label>
              </section>
            </div>}
          </div>

          <div className={s.generateDock}>
            <button className={s.generateButton} onClick={g.handleGenerate} disabled={!canGenerate}>
              <span>✦</span> {g.loading ? "Generando..." : `Generar ${g.cantidad > 1 ? `${g.cantidad} creativos` : "creativo"}`}<b>→</b>
            </button>
            <div><span>Coste estimado: {g.cantidad} {g.cantidad === 1 ? "crédito" : "créditos"}</span><span>{g.credits} disponible{g.credits === 1 ? "" : "s"}</span></div>
          </div>
        </aside>

        {/* ===== RIGHT PANEL (v2) ===== */}
        <section className={`${s.canvasPanel} ${isFullscreen ? s.canvasFullscreen : ""}`}>
          <header className={s.canvasHeader}>
            <div><span className={s.liveDot} /><div><b>Vista previa</b><small>Tu creativo se actualizará aquí</small></div></div>
            <div className={s.canvasTools}>
              <div className={s.formatMenu}>
                <button className={s.formatButton} onClick={() => setFormatOpen(!formatOpen)} aria-expanded={formatOpen}>{currentFormat} <span>⌄</span></button>
                {formatOpen && (
                  <div role="menu">
                    {(["1:1", "4:5", "9:16"] as Format[]).map((item) => (
                      <button role="menuitem" className={currentFormat === item ? s.activeFormat : ""} key={item} onClick={() => updateFormat(item)}>
                        <span>{item}</span><small>{item === "1:1" ? "Feed" : item === "4:5" ? "Feed vertical" : "Stories y Reels"}</small><b>{currentFormat === item ? "✓" : ""}</b>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button className={showGuides ? s.toolActive : ""} onClick={() => setShowGuides(!showGuides)} aria-label={showGuides ? "Ocultar guías" : "Mostrar guías"} aria-pressed={showGuides}>⌗</button>
              <button onClick={() => setIsFullscreen(!isFullscreen)} aria-label={isFullscreen ? "Salir de pantalla completa" : "Expandir vista"} aria-pressed={isFullscreen}>⛶</button>
            </div>
          </header>

          <CreativeWorkspace
            format={currentFormat}
            quantity={g.cantidad}
            safeZone={g.safeZoneMeta}
            productProvided={!!g.producto.trim()}
            angle={selectedAngleName}
            showGuides={showGuides}
            phase={g.phase}
            errorMessage={g.error || "Revisa la configuración antes de generar."}
            results={g.generatedImages}
            credits={g.credits}
            cantidad={g.cantidad}
            safeZoneMeta={g.safeZoneMeta}
            aspectRatio={g.aspectRatio}
            selectedAngle={g.selectedAngle}
            onRetry={() => { g.handleRetry() }}
            onDownload={g.handleDownload}
            onDownloadAll={g.handleDownloadAll}
            onSelectFromGenerated={g.handleSelectFromGenerated}
            onSelectFromHistory={g.handleSelectFromHistory}
            progress={g.progress}
            onOpenAi={() => document.querySelector<HTMLButtonElement>("[title='Abrir Pixel IA']")?.click()}
          />
        </section>
      </section>

      <PixelAdvisorAsHidden accessToken={advisorToken} onApplyRecommendation={handleApplyRecommendation} />
    </main>
  )
}

/* CreativeWorkspace — pure presentation, ported from v2 */

function CreativeWorkspace(props: {
  format: Format; quantity: number; safeZone: boolean; productProvided: boolean;
  angle: string; showGuides: boolean; phase: string; errorMessage: string;
  results: Array<{ imageUrl: string; angle: string }>; credits: number; cantidad: number;
  safeZoneMeta: boolean; aspectRatio: string; selectedAngle: string | null;
  onRetry: () => void; onDownload: () => void; onDownloadAll: () => void;
  onSelectFromGenerated: (img: { imageUrl: string; angle: string }, copy: string) => void;
  onSelectFromHistory: (item: { imageUrl: string; angle: string }) => void;
  progress: { completed: number; total: number }; onOpenAi: () => void;
}) {
  const { format, quantity, safeZone, productProvided, angle, showGuides, phase, errorMessage, results, credits, cantidad, safeZoneMeta, aspectRatio, selectedAngle, onRetry, onDownload, onDownloadAll, onSelectFromGenerated, onSelectFromHistory, progress, onOpenAi } = props
  const [activeIndex, setActiveIndex] = useState(0)
  const safeIndex = Math.min(activeIndex, Math.max(0, results.length - 1))
  const activeResult = results[safeIndex]
  const hasResults = phase === "result" && results.length > 0
  const currentStatus = phase === "loading" ? "Generando" : phase === "error" ? "Requiere atención" : hasResults ? "Creativo generado" : !productProvided ? "Completa el producto" : !angle ? "Selecciona un ángulo" : "Listo para generar"

  return (
    <div className={s.canvasStage}>
      <div className={s.previewArea}>
        {phase === "loading" ? (
          <div className={s.generatingState} role="status" aria-live="polite">
            <div className={s.generatingMark}><img src="/pixelfm-logo.png" alt="" /><i /></div>
            <span className={s.previewKicker}>PIXELFM ESTÁ CREANDO</span>
            <h2>Construyendo una dirección<br />visual para tu producto.</h2>
            <p>Pixel IA está convirtiendo tu estrategia en un creativo listo para Meta Ads.</p>
            <div className={s.loadingTrack}><i /></div>
            <div className={s.loadingStages}>
              <span className={s.stageComplete}><i>✓</i> Analizando el producto</span>
              <span className={s.stageActive}><i /> Construyendo la dirección</span>
              <span><i /> Generando el creativo</span>
            </div>
          </div>
        ) : phase === "error" ? (
          <div className={s.errorState} role="alert">
            <div className={s.errorIcon}>!</div>
            <span className={s.previewKicker}>NO PUDIMOS CONTINUAR</span>
            <h2>Revisa la configuración<br />antes de generar.</h2>
            <p>{errorMessage}</p>
            <button onClick={onRetry}>Volver al generador <span>→</span></button>
          </div>
        ) : hasResults && activeResult ? (
          <div className={s.resultState}>
            <div className={s.resultMeta}>
              <span><i /> Resultado {safeIndex + 1} de {results.length}</span>
              {results.length > 1 && (
                <div>
                  <button onClick={() => setActiveIndex(Math.max(0, safeIndex - 1))} disabled={safeIndex === 0} aria-label="Creativo anterior">←</button>
                  <button onClick={() => setActiveIndex(Math.min(results.length - 1, safeIndex + 1))} disabled={safeIndex === results.length - 1} aria-label="Creativo siguiente">→</button>
                </div>
              )}
            </div>
            <div className={s.resultViewport}>
              <div className={s.resultFrame} data-format={format}>
                <img src={activeResult.imageUrl} alt={`Creativo generado ${safeIndex + 1}`} />
                {showGuides && <div className={`${s.guideOverlay} ${format === "9:16" && safeZone ? s.metaSafeGuide : ""}`} aria-hidden="true"><i /><b /></div>}
              </div>
            </div>
            <div className={s.resultActions}>
              <span><b>{format}</b> · Creativo completo</span>
              <div>
                <a href={activeResult.imageUrl} target="_blank" rel="noreferrer">Ampliar ↗</a>
                <button onClick={results.length > 1 ? onDownloadAll : onDownload}>Descargar ↓</button>
              </div>
            </div>
          </div>
        ) : (
          <div className={s.previewEmpty}>
            <div className={s.formatHints} aria-hidden="true"><i /><i /><i /></div>
            {showGuides && <div className={`${s.guideOverlay} ${format === "9:16" && safeZone ? s.metaSafeGuide : ""}`} aria-hidden="true"><i /><b /></div>}
            <div className={s.previewIcon} aria-hidden="true">✦</div>
            <span className={s.previewKicker}>LISTO PARA CREAR</span>
            <h2>Tu producto está a una estrategia<br />de convertirse en anuncio.</h2>
            <p>Completa la información y Pixel IA preparará el enfoque antes de generar.</p>
            <div className={s.progressSteps}>
              <span className={productProvided ? s.done : ""}><i>1</i> Producto</span><b />
              <span className={angle ? s.done : ""}><i>2</i> Estrategia</span><b />
              <span><i>3</i> Creativo</span>
            </div>
          </div>
        )}
      </div>

      <div className={s.workspaceDock}>
        <div className={s.contextRail}>
          {hasResults ? (
            <>
              <div className={s.railLabel}><span>Resultados</span><small>{results.length} {results.length === 1 ? "creativo" : "creativos"} en esta sesión</small></div>
              <div className={s.thumbnailRail}>
                {results.map((result, index) => (
                  <button className={index === safeIndex ? s.thumbnailActive : ""} onClick={() => setActiveIndex(index)} key={index} aria-label={`Seleccionar creativo ${index + 1}`}>
                    <img src={result.imageUrl} alt="" /><span>{index + 1}</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className={s.railLabel}><span>Resumen del creativo</span><small>Configuración actual antes de generar</small></div>
              <div className={s.summaryGrid}>
                <span><small>Ángulo</small><b>{angle || "Sin seleccionar"}</b></span>
                <span><small>Formato</small><b>{format}</b></span>
                <span><small>Cantidad</small><b>{cantidad} {cantidad === 1 ? "creativo" : "creativos"}</b></span>
                <span><small>Zona Segura</small><b>{safeZoneMeta ? "Activada" : "Desactivada"}</b></span>
                <span className={s.summaryStatus}><small>Estado</small><b><i />{currentStatus}</b></span>
              </div>
            </>
          )}
        </div>
        <aside className={s.aiCard}>
          <div className={s.aiHead}><span>✦</span><div><b>Pixel IA</b><small>Asistente estratégico</small></div><i /></div>
          <p>Piensa la estrategia antes de generar y recomienda el mejor ángulo.</p>
          <button onClick={onOpenAi}>Iniciar con Pixel IA <span>→</span></button>
        </aside>
      </div>
    </div>
  )
}

/* Hidden PixelAdvisor wrapper — keeps bubble in DOM for aiCard querySelector */
function PixelAdvisorAsHidden(props: { accessToken?: string; onApplyRecommendation?: (rec: { angleId: string; styleId: string; format: string; safeZoneMeta: boolean; productDescription?: string }) => void }) {
  return (
    <div style={{ position: "fixed", bottom: "-100px", right: "-100px", pointerEvents: "none", opacity: 0 }}>
      <PixelAdvisor {...props as any} />
    </div>
  )
}