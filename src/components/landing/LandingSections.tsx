import Image from "next/image"
import Link from "next/link"
import type { CSSProperties } from "react"
import { ArrowRight, Check, Clapperboard, ImageIcon, Plus, SlidersHorizontal, Sparkles, Zap } from "lucide-react"
import LandingVideo from "./LandingVideo"
import SessionCta from "./SessionCta"
import { Logo } from "./LandingNav"
import { CREDIT_RATES, SUBSCRIPTION_PLANS, formatPrice, planOutcome } from "@/lib/pricing-plans"
import { ANGLES, FAQS, MEDIA, posterOf, type MediaKey } from "./landing-data"
import s from "./Landing.module.css"

const delay = (ms: number) => ({ "--rd": `${ms}ms` }) as CSSProperties

export function FormatsSection() {
  return (
    <section id="producto" className={s.section} aria-labelledby="formats-title">
      <header className={s.intro} data-reveal>
        <span className={s.kicker}>UN ESTUDIO</span>
        <h2 id="formats-title">Un estudio, <em>dos formatos.</em></h2>
        <p>La misma dirección creativa, en la pieza que tu campaña necesita.</p>
      </header>

      <div className={s.formats}>
        <article className={s.format} data-reveal>
          <header>
            <span className={s.formatIcon}><ImageIcon aria-hidden="true" /></span>
            <div><h3>Imagen</h3><p>De una referencia a un creativo listo para el feed.</p></div>
          </header>
          <div className={s.formatFlow}>
            <div className={s.formatSteps}>
              <figure className={s.formatRef}>
                <Image src={MEDIA.audifonos.image} alt="" fill sizes="170px" style={{ objectPosition: "50% 30%" }} />
                <figcaption>Referencia</figcaption>
              </figure>
              <ArrowRight className={s.formatArrow} aria-hidden="true" />
              <ul className={s.formatDirection}>
                <li><small>Ángulo</small>Beneficio principal</li>
                <li><small>Estilo</small>Premium editorial</li>
              </ul>
            </div>
            <figure className={s.formatOutput}>
              <Image src={MEDIA.audifonos.image} alt={MEDIA.audifonos.alt} fill sizes="(max-width: 760px) 60vw, 280px" />
              <figcaption>Creativo final</figcaption>
            </figure>
          </div>
        </article>

        <article className={s.format} data-reveal style={delay(90)}>
          <header>
            <span className={s.formatIcon}><Clapperboard aria-hidden="true" /></span>
            <div><h3>Video</h3><p>Tu imagen toma vida en un clip de 6 segundos.</p></div>
          </header>
          <div className={s.formatFlow}>
            <div className={s.formatSteps}>
              <figure className={s.formatRef}>
                <Image src={MEDIA.carro.image} alt="" fill sizes="170px" style={{ objectPosition: "50% 86%" }} />
                <figcaption>Referencia</figcaption>
              </figure>
              <ArrowRight className={s.formatArrow} aria-hidden="true" />
              <ul className={s.formatDirection}>
                <li><small>Enfoque</small>Producto en acción</li>
                <li><small>Duración</small>6 segundos</li>
              </ul>
            </div>
            <figure className={s.formatOutput}>
              <LandingVideo src={MEDIA.carro.video} poster={posterOf("carro")} label={`Video: ${MEDIA.carro.alt}`} />
              <figcaption><i aria-hidden="true" />Video final</figcaption>
            </figure>
          </div>
        </article>
      </div>
    </section>
  )
}

export function PixelIaSection() {
  return (
    <section className={`${s.section} ${s.ai}`} aria-labelledby="ai-title">
      <i className={s.aiGlow} aria-hidden="true" />
      <div className={s.aiCopy} data-reveal>
        <span className={s.kicker}>PIXELIA</span>
        <h2 id="ai-title">No empiezas con un prompt perfecto. <em>Empiezas con una idea.</em></h2>
        <p>PixelIA es tu estratega creativo dentro del estudio: conversa contigo y ordena lo que tienes en la cabeza antes de generar.</p>
      </div>

      <div className={s.aiBoard} data-reveal style={delay(80)}>
        <p className={s.aiIdea}><small>Tu idea</small>Vendo comida natural para perros y quiero que se note la energía.</p>

        <div className={s.aiPanel}>
          <header><span aria-hidden="true"><Sparkles /></span><div><b>PixelIA</b><small>Estrategia creativa para tus anuncios</small></div></header>
          <ol>
            <li data-reveal style={delay(160)}><small>Encuentra el ángulo</small><b>Beneficio principal: energía que se nota</b></li>
            <li data-reveal style={delay(260)}><small>Convierte tu intención en brief</small><b>Perro y producto en escena, un titular corto y un CTA claro</b></li>
            <li data-reveal style={delay(360)}><small>Decide cómo presentarlo</small><b>Lifestyle · Formato 9:16</b></li>
          </ol>
        </div>

        <figure className={s.aiResult} data-parallax="-0.04">
          <Image src={MEDIA.perro.image} alt={MEDIA.perro.alt} fill sizes="200px" />
        </figure>
      </div>
    </section>
  )
}

export function ModesSection() {
  return (
    <section className={s.section} aria-labelledby="modes-title">
      <header className={s.intro} data-reveal>
        <span className={s.kicker}>TU RITMO</span>
        <h2 id="modes-title">Rápido cuando quieres. <em>Preciso cuando lo necesitas.</em></h2>
      </header>

      <div className={s.modes}>
        <article className={`${s.mode} ${s.modeSimple}`} data-reveal>
          <span className={s.modeBadge}><Zap aria-hidden="true" />Simple · velocidad</span>
          <h3>Dinos qué quieres lograr. PixelFM prepara el resto.</h3>
          <div className={s.simpleMock} aria-hidden="true">
            <p>Quiero un anuncio premium de mis audífonos para Stories.<i /></p>
            <div><span>IA decide</span><b>Generar imagen <ArrowRight /></b></div>
          </div>
        </article>

        <article className={`${s.mode} ${s.modePro}`} data-reveal style={delay(90)}>
          <span className={s.modeBadge}><SlidersHorizontal aria-hidden="true" />Pro · control</span>
          <h3>Controla escenas, dirección y composición cuando lo necesites.</h3>
          <div className={s.proMock} aria-hidden="true">
            <div className={s.proControls}>
              <span><small>Ángulo</small>Demostración</span>
              <span><small>Estilo</small>Minimalista tecnológico</span>
              <span><small>Formato</small><em>1:1</em><em>4:5</em><em data-on>9:16</em></span>
              <span><small>Zona Segura</small><u /></span>
            </div>
            <div className={s.proTimeline}>
              {([["carro", "50% 58%"], ["carro", "30% 52%"], ["carro", "70% 24%"]] as const).map(([key, position], index) => (
                <figure key={position} data-on={index === 1 ? "" : undefined}>
                  <Image src={MEDIA[key].image} alt="" fill sizes="150px" style={{ objectPosition: position }} />
                  <figcaption>Escena {index + 1}</figcaption>
                </figure>
              ))}
              <span className={s.proAdd}><Plus /></span>
              <i className={s.proPlayhead} />
            </div>
          </div>
          <small className={s.modeNote}>Modo Pro está disponible en escritorio.</small>
        </article>
      </div>
    </section>
  )
}

type Tile = { key: MediaKey; ratio: string; position?: string; video?: "inview" | "hover"; hideOnPhone?: boolean; cropTop?: boolean }

const LIBRARY: { speed: string; tiles: Tile[] }[] = [
  { speed: "-0.03", tiles: [{ key: "perro", ratio: "4 / 5", position: "50% 62%" }, { key: "carro", ratio: "9 / 16", video: "hover" }] },
  { speed: "0.04", tiles: [{ key: "audifonos", ratio: "9 / 16", video: "inview" }, { key: "zapatillas", ratio: "1 / 1", position: "50% 55%", hideOnPhone: true }] },
  { speed: "-0.06", tiles: [{ key: "scooter", ratio: "4 / 5", position: "50% 92%" }, { key: "perro", ratio: "9 / 16", video: "hover", hideOnPhone: true }] },
  { speed: "0.03", tiles: [{ key: "zapatillas", ratio: "9 / 16", video: "hover" }, { key: "carro", ratio: "4 / 5", position: "50% 62%", hideOnPhone: true }] },
  { speed: "-0.04", tiles: [{ key: "audifonos", ratio: "1 / 1", position: "50% 30%", hideOnPhone: true }, { key: "scooter", ratio: "9 / 16", video: "inview", cropTop: true }] },
]

export function LibrarySection() {
  return (
    <section id="ejemplos" className={`${s.section} ${s.library}`} aria-labelledby="library-title">
      <header className={s.intro} data-reveal>
        <span className={s.kicker}>BIBLIOTECA</span>
        <h2 id="library-title">Autos, mascotas, audio. <em>Un solo estudio.</em></h2>
        <p>Piezas reales creadas con PixelFM. Todo lo que generas queda en tu biblioteca, listo para volver a usar.</p>
      </header>

      <div className={s.libraryGrid}>
        {LIBRARY.map(({ speed, tiles }, column) => (
          <div className={s.libraryColumn} data-parallax={speed} key={speed}>
            {tiles.map(({ key, ratio, position, video, hideOnPhone, cropTop }, row) => (
              <figure key={`${key}-${ratio}`} className={s.tile} data-video-host data-hide-phone={hideOnPhone ? "" : undefined} data-crop-top={cropTop ? "" : undefined} data-reveal style={{ ...delay((column + row) * 60), aspectRatio: ratio }}>
                {video
                  ? <LandingVideo src={MEDIA[key].video} poster={posterOf(key)} label={`Video: ${MEDIA[key].alt}`} mode={video} />
                  : <Image src={MEDIA[key].image} alt={MEDIA[key].alt} fill sizes="(max-width: 760px) 46vw, 240px" style={position ? { objectPosition: position } : undefined} />}
                <figcaption><b>{MEDIA[key].category}</b><span>{video ? "Video" : "Imagen"} · {ratio.replace(/ /g, "")}</span></figcaption>
              </figure>
            ))}
          </div>
        ))}
      </div>
    </section>
  )
}

export function DirectionSection() {
  return (
    <section className={`${s.section} ${s.direction}`} aria-labelledby="direction-title">
      <div className={s.directionCopy} data-reveal>
        <span className={s.kicker}>DIRECCIÓN CREATIVA</span>
        <h2 id="direction-title">Una idea, <em>pensada para Meta.</em></h2>
        <p>Elige el enfoque y adapta la pieza a cada ubicación sin empezar de cero.</p>
        <ul className={s.angleChips}>
          {ANGLES.map((angle, index) => <li key={angle} data-on={index === 1 ? "" : undefined}>{angle}</li>)}
        </ul>
      </div>

      <div className={s.frames} data-reveal style={delay(90)}>
        <figure style={{ aspectRatio: "1 / 1" }}>
          <Image src={MEDIA.carro.image} alt="" fill sizes="190px" style={{ objectPosition: "50% 56%" }} />
          <figcaption><b>1:1</b>Feed</figcaption>
        </figure>
        <figure style={{ aspectRatio: "4 / 5" }}>
          <Image src={MEDIA.carro.image} alt="" fill sizes="210px" style={{ objectPosition: "50% 50%" }} />
          <figcaption><b>4:5</b>Feed vertical</figcaption>
        </figure>
        <figure style={{ aspectRatio: "9 / 16" }}>
          <Image src={MEDIA.carro.image} alt="" fill sizes="220px" />
          <i className={s.safeZone} aria-hidden="true"><span>Zona Segura</span></i>
          <figcaption><b>9:16</b>Stories y Reels</figcaption>
        </figure>
      </div>
    </section>
  )
}

export function PricingSection() {
  return (
    <section id="precios" className={s.section} aria-labelledby="pricing-title">
      <header className={s.intro} data-reveal>
        <span className={s.kicker}>PRECIOS SIMPLES</span>
        <h2 id="pricing-title">Empieza pequeño. <em>Crece cuando quieras.</em></h2>
        <p>Todos los planes incluyen Modo Simple, Modo Pro, PixelIA, imagen y video. Cambia cuánto produces, no lo que puedes hacer.</p>
      </header>

      <div className={s.plans}>
        {SUBSCRIPTION_PLANS.map((plan, index) => (
          <article key={plan.id} className={`${s.plan} ${plan.recommended ? s.planFeatured : ""}`} data-reveal style={delay(index * 80)}>
            {plan.recommended && <span className={s.planBadge}>Recomendado</span>}
            <h3>{plan.name}</h3>
            <p>{plan.audience}</p>
            <div className={s.planPrice}>
              <strong>{formatPrice(plan.monthlyPrice)}</strong>
              <span>USD / mes</span>
            </div>
            {plan.note && <small className={s.planEdge}>{plan.note}</small>}
            <ul>{[`${plan.monthlyCredits} créditos al mes`, planOutcome(plan), ...plan.highlights].map((feature) => <li key={feature}><i aria-hidden="true"><Check /></i>{feature}</li>)}</ul>
            <Link href="/pricing" className={plan.recommended ? s.ctaPrimary : s.ctaGhostSolid}>{plan.landingCta} <ArrowRight aria-hidden="true" /></Link>
          </article>
        ))}
      </div>
      <p className={s.planNote}>Un solo saldo para imágenes y videos · {CREDIT_RATES.join(" · ")}</p>
      <p className={s.planExtra}><b>¿Necesitas más créditos?</b> Puedes añadir packs a tu saldo sin cambiar de plan. Disponibles para suscriptores.</p>
    </section>
  )
}

export function FaqSection() {
  return (
    <section className={`${s.section} ${s.faq}`} aria-labelledby="faq-title">
      <header className={s.faqIntro} data-reveal>
        <span className={s.kicker}>PREGUNTAS</span>
        <h2 id="faq-title">Lo importante, <em>sin vueltas.</em></h2>
      </header>
      <div className={s.faqList} data-reveal style={delay(80)}>
        {FAQS.map(({ q, a }) => (
          <details key={q}>
            <summary>{q}<Plus aria-hidden="true" /></summary>
            <p>{a}</p>
          </details>
        ))}
      </div>
    </section>
  )
}

export function FinalSection() {
  return (
    <section className={s.final} aria-labelledby="final-title">
      <div className={s.finalBackdrop} aria-hidden="true"><i /><i /></div>
      <figure className={`${s.finalCard} ${s.finalCardLeft}`} data-parallax="-0.05" aria-hidden="true">
        <Image src={MEDIA.scooter.image} alt="" fill sizes="220px" style={{ objectPosition: "50% 92%" }} />
      </figure>
      <figure className={`${s.finalCard} ${s.finalCardRight}`} data-parallax="-0.08" aria-hidden="true">
        <Image src={MEDIA.audifonos.image} alt="" fill sizes="220px" style={{ objectPosition: "50% 45%" }} />
      </figure>
      <div className={s.finalCopy} data-reveal>
        <h2 id="final-title">Tu próxima campaña puede empezar con <em>una sola idea.</em></h2>
        <SessionCta />
      </div>
    </section>
  )
}

export function LandingFooter() {
  return (
    <footer className={s.footer}>
      <div className={s.footerMain}>
        <div><Logo /><p>Dirección creativa e IA para crear anuncios que se sienten pensados.</p></div>
        <nav aria-label="Pie de página">
          <div><b>Producto</b><a href="#producto">Características</a><a href="#como-funciona">Cómo funciona</a><a href="#ejemplos">Ejemplos</a><a href="#precios">Precios</a></div>
          <div><b>Legal</b><Link href="/terms">Términos</Link><Link href="/privacy">Privacidad</Link><a href="mailto:team@pixelfm.com?subject=Soporte%20PixelFM&body=Hola%20equipo%20de%20PixelFM%2C%0A%0ANecesito%20ayuda%20con%3A%0A">Soporte</a></div>
        </nav>
      </div>
      <small>© 2026 AFM Estudio · PixelFM</small>
    </footer>
  )
}
