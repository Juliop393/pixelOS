"use client"

import { useEffect } from "react"
import Link from "next/link"

const Arrow = () => <span aria-hidden="true">↗</span>
const Check = () => <span className="check" aria-hidden="true">✓</span>

function Logo() {
  return (
    <Link className="logo" href="/" aria-label="PixelFM, inicio">
      <img className="logoMark" src="/pixelfm-logo.png" alt="" aria-hidden="true" />
      <span>Pixel<span>FM</span></span>
    </Link>
  )
}

function AdCreative({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`adCreative ${compact ? "compact" : ""}`}>
      <div className="adTopline">NUEVA FÓRMULA · 2026</div>
      <div className="adCopy">
        <span>Menos rutina.</span>
        <strong>Más calma.</strong>
      </div>
      <div className="productScene">
        <div className="halo" />
        <div className="bottle">
          <i />
          <span>noa</span>
        </div>
        <div className="stone one" />
        <div className="stone two" />
      </div>
      <div className="adFooter">
        <span>Rutinas simples.<br />Resultados reales.</span>
        <b>DESCUBRIR <Arrow /></b>
      </div>
    </div>
  )
}

function AppPreview() {
  return (
    <div className="previewWrap">
      <div className="appFrame">
        <div className="appBar">
          <div className="miniLogo"><img src="/pixelfm-logo.png" alt="" aria-hidden="true" /> PixelFM</div>
          <div className="appActions"><span>3 créditos</span><i /></div>
        </div>
        <div className="appBody">
          <aside className="sideRail" aria-label="Flujo de creación">
            <div className="railStep active"><b>01</b><span>Producto</span></div>
            <div className="railStep"><b>02</b><span>Estrategia</span></div>
            <div className="railStep"><b>03</b><span>Creativo</span></div>
          </aside>
          <div className="controlPanel">
            <div className="eyebrow">CREAR ANUNCIO</div>
            <h3>Define tu creativo</h3>
            <label>Ángulo publicitario</label>
            <div className="selectBox"><span>Beneficio principal</span><b>⌄</b></div>
            <label>Formato</label>
            <div className="formatPicker">
              <button className="selected">1:1</button><button>4:5</button><button>9:16</button>
            </div>
            <label>Estilo visual</label>
            <div className="styleChoice"><i /> Premium editorial <Check /></div>
            <div className="safeToggle"><span><b>Zona Segura Meta</b><small>Protege texto y CTA</small></span><i /></div>
          </div>
          <div className="canvasPanel">
            <div className="canvasTop"><span>Vista previa</span><span>1080 × 1080</span></div>
            <AdCreative />
            <button className="generateButton"><span>✦</span> Generar creativo</button>
          </div>
        </div>
      </div>
      <div className="aiFloat glass">
        <div className="aiFloatHead"><span className="spark">✦</span><span><b>Pixel IA</b><small>Recomendación estratégica</small></span></div>
        <p>Para este producto, el ángulo de <strong>beneficio principal</strong> puede conectar mejor.</p>
        <button>Aplicar recomendación <span>→</span></button>
      </div>
    </div>
  )
}

const angles = ["Problema y solución", "Beneficio principal", "Comparación", "Prueba social", "Demostración", "Oferta y conveniencia", "Mecanismo único"]
const styles = ["Comercial B2B", "Premium editorial", "Producto en acción", "Lifestyle", "Oferta directa", "Minimalista tecnológico"]

const plans = [
  { name: "Starter", price: "$5.99", text: "Para probar ideas y lanzar rápido.", features: ["30 creativos al mes", "Todos los formatos", "Pixel IA incluido"], cta: "Empezar con Starter" },
  { name: "Pro", price: "$19.99", text: "Para marcas que crean cada semana.", features: ["150 creativos al mes", "Zona Segura Meta", "Historial de proyectos", "Prioridad de generación"], cta: "Elegir Pro", featured: true },
  { name: "Business", price: "$49.99", text: "Para equipos y más volumen.", features: ["500 creativos al mes", "Hasta 3 miembros", "Uso comercial", "Soporte prioritario"], cta: "Elegir Business" },
]

const tickerItems = ["Meta Ads Ready", "Pixel IA", "Ángulos estratégicos", "Zona Segura Meta", "Creativos listos para publicar", "1:1 · 4:5 · 9:16", "Estrategia + IA"]

export default function Home() {
  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    // Section reveal
    const sections = document.querySelectorAll(".section")
    let observer: IntersectionObserver | undefined
    if (prefersReduced) {
      sections.forEach((el) => {
        el.classList.remove("section-hidden")
        el.classList.add("section-visible")
      })
    } else {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("section-visible")
              entry.target.classList.remove("section-hidden")
              observer?.unobserve(entry.target)
            }
          })
        },
        { threshold: 0.08 }
      )

      sections.forEach((el) => {
        if (!el.classList.contains("hero")) {
          el.classList.add("section-hidden")
        }
        observer?.observe(el)
      })
    }

    // Parallax en el AppPreview
    const preview = document.querySelector<HTMLElement>(".previewWrap")
    let frame = 0
    const setParallax = (x: number, y: number) => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        preview?.style.setProperty("--parallax-x", `${x}px`)
        preview?.style.setProperty("--parallax-y", `${y}px`)
      })
    }
    const onPointerMove = (event: PointerEvent) => {
      if (!preview || prefersReduced || event.pointerType === "touch") return
      const bounds = preview.getBoundingClientRect()
      const x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 12
      const y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 12
      setParallax(x, y)
    }
    const resetParallax = () => setParallax(0, 0)
    preview?.addEventListener("pointermove", onPointerMove)
    preview?.addEventListener("pointerleave", resetParallax)

    return () => {
      observer?.disconnect()
      cancelAnimationFrame(frame)
      preview?.removeEventListener("pointermove", onPointerMove)
      preview?.removeEventListener("pointerleave", resetParallax)
    }
  }, [])

  return (
    <main id="top">
      <header className="navShell">
        <nav className="nav glass" aria-label="Navegación principal">
          <Logo />
          <div className="navLinks">
            <a href="#producto">Producto</a><a href="#como-funciona">Cómo funciona</a>
            <a href="#ejemplos">Ejemplos</a><a href="#precios">Precios</a>
          </div>
          <div className="navCtas">
            <Link className="login" href="/login">Iniciar sesión</Link>
            <Link className="button small" href="/register">Probar gratis</Link>
          </div>
          <details className="mobileMenu"><summary aria-label="Abrir menú"><span /><span /></summary><div><a href="#producto">Producto</a><a href="#como-funciona">Cómo funciona</a><a href="#ejemplos">Ejemplos</a><a href="#precios">Precios</a></div></details>
        </nav>
      </header>

      <section className="hero section container" id="producto">
        <div className="heroCopy">
          <div className="pill"><span>✦</span> Creativos estratégicos para Meta Ads</div>
          <h1>Convierte tu producto en anuncios que se sienten <em>pensados,</em> no improvisados.</h1>
          <p>PixelFM combina estrategia publicitaria e inteligencia artificial para ayudarte a elegir el enfoque correcto y generar creativos listos para publicar.</p>
          <div className="heroActions"><Link className="button" href="/register">Crear mi primer anuncio <Arrow /></Link><a className="textButton" href="#como-funciona"><span className="play">▶</span> Ver cómo funciona</a></div>
          <small className="creditNote"><Check /> 5 créditos gratis <i /> Sin tarjeta</small>
          <div className="heroTicker" aria-label="Capacidades de PixelFM">
            <div className="tickerTrack">
              {[0, 1].map((group) => <div className="tickerGroup" aria-hidden={group === 1} key={group}>{tickerItems.map((item) => <span key={`${group}-${item}`}>{item}<i /></span>)}</div>)}
            </div>
          </div>
        </div>
        <AppPreview />
      </section>

      <section className="direction section container">
        <div className="sectionIntro centered">
          <span className="kicker">UNA MEJOR DIRECCIÓN</span>
          <h2>No necesitas más prompts.<br />Necesitas una mejor dirección.</h2>
          <p>PixelFM convierte decisiones publicitarias complejas en un flujo simple.</p>
        </div>
        <div className="benefitGrid">
          <article><span className="benefitIcon">◎</span><div><b>El ángulo correcto</b><p>Elige cómo contar el valor de tu producto.</p></div><small>01</small></article>
          <article><span className="benefitIcon">◫</span><div><b>Un estilo con intención</b><p>Define una estética que refuerce el mensaje.</p></div><small>02</small></article>
          <article><span className="benefitIcon">⌗</span><div><b>El formato que necesitas</b><p>Crea en 1:1, 4:5 o 9:16 sin rehacer.</p></div><small>03</small></article>
          <article><span className="benefitIcon">⌜</span><div><b>Listo para Meta</b><p>Protege lo importante con Zona Segura.</p></div><small>04</small></article>
        </div>
      </section>

      <section className="aiSection section container">
        <div className="aiCopy">
          <span className="kicker">PIXEL IA</span>
          <h2>Primero entiende tu producto. Después recomienda.</h2>
          <p>Pixel IA conversa contigo, entiende qué vendes, a quién y qué quieres conseguir. Luego propone tres ángulos publicitarios listos para aplicar.</p>
          <div className="miniFeature"><span>✦</span><div><b>Estrategia sin complicaciones</b><small>No necesitas saber de copy ni escribir prompts perfectos.</small></div></div>
        </div>
        <div className="chatPanel glass">
          <div className="chatHeader"><div><span className="spark">✦</span><span><b>Pixel IA</b><small>Tu asistente estratégico</small></span></div><i /></div>
          <div className="chatBody">
            <div className="botMessage">Cuéntame un poco sobre tu producto. ¿Qué vendes y a quién quieres llegar?</div>
            <div className="userMessage">Vendemos café de especialidad por suscripción para personas que valoran la calidad pero tienen poco tiempo.</div>
            <div className="botMessage recommendation"><span>✦</span><div><b>Veo tres direcciones potentes:</b><ol><li><strong>Ritual sin esfuerzo</strong><small>Café excepcional sin complicar tu mañana.</small></li><li><strong>Calidad que llega a ti</strong><small>La experiencia de una cafetería, en casa.</small></li><li><strong>Descubre cada mes</strong><small>Nuevos orígenes, una suscripción.</small></li></ol></div></div>
          </div>
          <div className="chatInput"><span>Escribe tu respuesta...</span><b>↑</b></div>
        </div>
      </section>

      <section className="steps section container" id="como-funciona">
        <div className="sectionIntro"><span className="kicker">CÓMO FUNCIONA</span><h2>De producto a anuncio.<br />En tres pasos.</h2></div>
        <div className="stepLine">
          <article><span>01</span><div className="stepIcon">⌁</div><h3>Describe tu producto</h3><p>Cuéntanos qué vendes, para quién y qué buscas conseguir.</p></article>
          <article><span>02</span><div className="stepIcon">✦</div><h3>Elige una estrategia</h3><p>Selecciona un ángulo o aplica la recomendación de Pixel IA.</p></article>
          <article><span>03</span><div className="stepIcon">↓</div><h3>Genera y descarga</h3><p>Recibe tu creativo en el formato que necesitas, listo para publicar.</p></article>
        </div>
      </section>

      <section className="library section container">
        <div className="sectionIntro split"><div><span className="kicker">BIBLIOTECA ESTRATÉGICA</span><h2>Una idea. Distintas formas de hacerla relevante.</h2></div><p>Combina ángulos publicitarios y estilos visuales sin empezar desde cero.</p></div>
        <div className="libraryPanel glass">
          <div className="libraryCol"><div className="libraryHead"><span>◎</span><div><b>Ángulos publicitarios</b><small>Qué decir</small></div></div><div className="chipCloud">{angles.map((x, i) => <span className={i === 1 ? "active" : ""} key={x}>{i === 1 && "✦ "}{x}</span>)}</div></div>
          <div className="libraryDivider"><i /></div>
          <div className="libraryCol"><div className="libraryHead"><span>◫</span><div><b>Estilos visuales</b><small>Cómo mostrarlo</small></div></div><div className="chipCloud">{styles.map((x, i) => <span className={i === 1 ? "active" : ""} key={x}>{i === 1 && "✦ "}{x}</span>)}</div></div>
        </div>
      </section>

      <section className="examples section container" id="ejemplos">
        <div className="sectionIntro centered"><span className="kicker">CREATIVOS QUE SE ADAPTAN</span><h2>Una campaña. Todos los formatos.</h2><p>Genera piezas coherentes para feed, Stories y Reels.</p></div>
        <div className="creativeGallery">
          <article className="creativeCard square"><div className="formatTag">1:1</div><div className="abstractAd peach"><span>SOLEA</span><h3>Tu piel.<br />Sin filtros.</h3><div className="jar">S</div><small>NUEVO SPF 50</small></div><footer><span>Feed</span><span>1080 × 1080</span></footer></article>
          <article className="creativeCard portrait"><div className="formatTag">4:5</div><div className="abstractAd coffee"><span>ORIGEN</span><h3>Mejores<br />mañanas.</h3><div className="coffeeBag">origen<small>COLOMBIA</small></div><small>CAFÉ DE ESPECIALIDAD</small></div><footer><span>Feed vertical</span><span>1080 × 1350</span></footer></article>
          <article className="creativeCard story"><div className="formatTag">9:16</div><div className="abstractAd fitness"><span>FORMA</span><h3>20 minutos.<br />Todo tu cuerpo.</h3><div className="fitnessOrb">↗</div><small>EMPIEZA HOY</small></div><footer><span>Stories & Reels</span><span>1080 × 1920</span></footer></article>
        </div>
      </section>

      <section className="safeSection section container">
        <div className="safeVisual">
          <div className="phone">
            <div className="phoneTop"><span>9:41</span><i /></div>
            <div className="storyAd"><span>NOA</span><h3>Menos ruido.<br />Más foco.</h3><div className="storyBottle"><i /></div><button>DESCUBRIR</button><div className="safeGuides"><span>Zona segura</span></div></div>
          </div>
          <div className="safeBadge glass"><Check /><span><b>Zona Segura activa</b><small>Todo dentro del área visible</small></span></div>
        </div>
        <div className="safeCopy"><span className="kicker">ZONA SEGURA META</span><h2>Diseñado para Stories y Reels sin perder lo importante.</h2><p>PixelFM ayuda a mantener título, producto y llamada a la acción dentro de una zona segura para Meta.</p><ul><li><Check /> Título siempre visible</li><li><Check /> Producto bien encuadrado</li><li><Check /> CTA fuera de los controles</li></ul></div>
      </section>

      <section className="pricing section container" id="precios">
        <div className="sectionIntro centered"><span className="kicker">PRECIOS SIMPLES</span><h2>Empieza pequeño. Crece cuando quieras.</h2><p>Todos los planes incluyen acceso a Pixel IA y formatos para Meta Ads.</p></div>
        <div className="pricingGrid">{plans.map(plan => <article className={`priceCard ${plan.featured ? "featured" : ""}`} key={plan.name}>{plan.featured && <span className="popular">MÁS ELEGIDO</span>}<div><h3>{plan.name}</h3><p>{plan.text}</p></div><div className="price"><strong>{plan.price}</strong><span>USD<br />/ mes</span></div><div className="priceDivider" /><ul>{plan.features.map(x => <li key={x}><Check /> {x}</li>)}</ul><Link className={plan.featured ? "button" : "outlineButton"} href="/pricing">{plan.cta} <span>→</span></Link></article>)}</div>
        <p className="pricingNote"><Check /> Cancela cuando quieras <i /> Los créditos se renuevan cada mes</p>
      </section>

      <section className="finalCta section container" id="cta">
        <div className="ctaBox">
          <span className="ctaSpark">✦</span><h2>Tu próxima campaña<br />puede empezar hoy.</h2><p>Describe tu producto, prueba una estrategia y genera tu primer creativo.</p><Link className="button light" href="/register">Probar PixelFM gratis <Arrow /></Link><small>5 créditos gratis · Sin tarjeta</small>
        </div>
      </section>

      <footer className="footer container">
        <div className="footerMain"><div><Logo /><p>Estrategia e IA para crear anuncios<br />que se sienten pensados.</p></div><div className="footerLinks"><div><b>Producto</b><a href="#producto">Características</a><a href="#como-funciona">Cómo funciona</a><a href="#ejemplos">Ejemplos</a><a href="#precios">Precios</a></div><div><b>Legal</b><Link href="/terms">Términos</Link><Link href="/privacy">Privacidad</Link><a href="mailto:soporte@pixelosfm.com?subject=Soporte%20PixelFM&body=Hola%20equipo%20de%20PixelFM%2C%0A%0ANecesito%20ayuda%20con%3A%0A">Soporte</a></div></div></div>
        <div className="footerBottom"><span>© 2026 AFM Estudio · PixelFM</span><span><i /> Todos los sistemas operativos</span></div>
      </footer>
    </main>
  )
}