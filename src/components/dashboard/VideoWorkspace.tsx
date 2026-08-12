"use client"

import { useEffect, useRef, useState } from "react"
import { ArrowLeft, ArrowRight, Clapperboard, Film, Image as ImageIcon, Plus, Sparkles, Trash2, Upload, Video, WandSparkles } from "lucide-react"
import s from "./VideoWorkspace.module.css"

type Option = { id: string; label: string; description: string; icon: string }
type Chunk = { id: number; role: string }

const ANGLES: Option[] = [
  { id: "problem", label: "Problema → Solución", description: "Presenta la tensión y resuélvela.", icon: "↗" },
  { id: "benefit", label: "Beneficio principal", description: "Enfoca el resultado más valioso.", icon: "✦" },
  { id: "demo", label: "Demostración", description: "Muestra el producto en acción.", icon: "▶" },
  { id: "social", label: "Prueba social", description: "Convierte confianza en decisión.", icon: "◎" },
  { id: "comparison", label: "Comparación", description: "Contrasta antes y después.", icon: "⇄" },
  { id: "experience", label: "Experiencia de uso", description: "Haz tangible cómo se siente.", icon: "◇" },
  { id: "offer", label: "Oferta / conveniencia", description: "Lleva la propuesta al frente.", icon: "%" },
  { id: "mechanism", label: "Mecanismo único", description: "Explica qué lo hace diferente.", icon: "⌁" },
]

const HOOKS: Option[] = [
  { id: "result", label: "Resultado primero", description: "Abre con la transformación.", icon: "01" },
  { id: "question", label: "Pregunta directa", description: "Activa una necesidad concreta.", icon: "?" },
  { id: "problem", label: "Problema reconocible", description: "Conecta desde una fricción real.", icon: "!" },
  { id: "interrupt", label: "Pattern interrupt", description: "Rompe el ritmo del feed.", icon: "×" },
  { id: "curiosity", label: "Curiosidad", description: "Abre una idea que pide respuesta.", icon: "…" },
  { id: "instant", label: "Demo inmediata", description: "El producto actúa desde el segundo uno.", icon: "▶" },
  { id: "before", label: "Antes / después", description: "Contrasta dos estados visuales.", icon: "⇥" },
  { id: "offer", label: "Oferta directa", description: "Presenta valor y acción sin rodeos.", icon: "%" },
]

const STYLES: Option[] = [
  { id: "ugc", label: "UGC", description: "Natural, directo y humano.", icon: "◉" },
  { id: "cinematic", label: "Product Cinematic", description: "Luz, detalle y movimiento premium.", icon: "◈" },
  { id: "lifestyle", label: "Lifestyle", description: "Producto dentro de una escena real.", icon: "☼" },
  { id: "demo", label: "Product Demo", description: "Claridad funcional paso a paso.", icon: "▶" },
  { id: "editorial", label: "Editorial Premium", description: "Ritmo calmado y composición cuidada.", icon: "◆" },
  { id: "commercial", label: "Dynamic Commercial", description: "Energía, cortes y foco en conversión.", icon: "ϟ" },
  { id: "minimal", label: "Minimal Product", description: "Producto, espacio y mensaje esencial.", icon: "□" },
  { id: "b2b", label: "B2B / Professional", description: "Sobrio, preciso y orientado a negocio.", icon: "▦" },
]

const CHUNK_ROLES = ["Hook", "Desarrollo", "Demostración", "CTA"]

function OptionGrid({ options, selected, onSelect }: { options: Option[]; selected: string; onSelect: (id: string) => void }) {
  return <div className={s.optionGrid}>{options.map((option) => (
    <button type="button" key={option.id} className={selected === option.id ? s.optionActive : ""} onClick={() => onSelect(option.id)}>
      <i>{option.icon}</i><span><b>{option.label}</b><small>{option.description}</small></span><em>{selected === option.id ? "✓" : ""}</em>
    </button>
  ))}</div>
}

export default function VideoWorkspace() {
  const nextId = useRef(2)
  const [source, setSource] = useState<"library" | "upload">("library")
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [fileName, setFileName] = useState("")
  const [angle, setAngle] = useState("demo")
  const [hook, setHook] = useState("result")
  const [style, setStyle] = useState("cinematic")
  const [chunks, setChunks] = useState<Chunk[]>([{ id: 1, role: "Hook" }])
  const [activeChunk, setActiveChunk] = useState(1)

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl) }, [previewUrl])

  const addChunk = () => {
    if (chunks.length >= 4) return
    const chunk = { id: nextId.current++, role: CHUNK_ROLES[Math.min(chunks.length, CHUNK_ROLES.length - 1)] }
    setChunks([...chunks, chunk]); setActiveChunk(chunk.id)
  }
  const removeChunk = (id: number) => {
    if (chunks.length === 1) return
    const next = chunks.filter((chunk) => chunk.id !== id)
    setChunks(next); if (activeChunk === id) setActiveChunk(next[0].id)
  }
  const moveChunk = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= chunks.length) return
    const next = [...chunks]; [next[index], next[target]] = [next[target], next[index]]; setChunks(next)
  }
  const clearPreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null); setFileName("")
  }
  const handleUpload = (file?: File) => {
    if (!file) return
    clearPreview(); setPreviewUrl(URL.createObjectURL(file)); setFileName(file.name); setSource("upload")
  }

  const active = chunks.find((chunk) => chunk.id === activeChunk) ?? chunks[0]
  const activeIndex = chunks.findIndex((item) => item.id === activeChunk)
  const selectedAngle = ANGLES.find((item) => item.id === angle)?.label
  const selectedHook = HOOKS.find((item) => item.id === hook)?.label
  const selectedStyle = STYLES.find((item) => item.id === style)?.label

  return (
    <div className={s.page}>
      <section className={s.workspace}>
        <aside className={s.configPanel}>
          <header className={s.intro}><span>NUEVO VIDEO</span><h1>Dirige tu anuncio</h1><p>Construye una secuencia pensada para detener el scroll.</p></header>
          <div className={s.configScroll}>
            <section className={s.card}>
              <div className={s.cardTitle}><i>01</i><div><h2>Fuente visual</h2><p>Elige la imagen que dará vida al video.</p></div></div>
              <div className={s.sourceTabs}>
                <button className={source === "library" ? s.sourceActive : ""} onClick={() => setSource("library")}><ImageIcon />Mis creativos</button>
                <button className={source === "upload" ? s.sourceActive : ""} onClick={() => setSource("upload")}><Upload />Subir imagen</button>
              </div>
              {source === "library" ? (
                <div className={s.libraryEmpty}><ImageIcon /><b>Elige desde Mis creativos</b><small>La conexión con tu biblioteca llegará en la integración.</small><span>Vista previa visual</span></div>
              ) : previewUrl ? (
                <div className={s.uploadPreview}><img src={previewUrl} alt="Referencia para el video" /><div><span>{fileName}</span><button onClick={clearPreview}><Trash2 />Quitar</button></div></div>
              ) : (
                <label className={s.uploadBox}><input type="file" accept="image/*" onChange={(event) => handleUpload(event.target.files?.[0])} /><Upload /><b>Sube tu imagen de referencia</b><small>JPG, PNG o WEBP · Vista previa local</small></label>
              )}
              <div className={s.formatLock}><span><Video />Stories / Reels</span><b>9:16</b></div>
            </section>
            <section className={s.card}><div className={s.cardTitle}><i>02</i><div><h2>Ángulo</h2><p>Define la idea persuasiva de la secuencia.</p></div></div><OptionGrid options={ANGLES} selected={angle} onSelect={setAngle} /></section>
            <section className={s.card}><div className={s.cardTitle}><i>03</i><div><h2>Hook</h2><p>Decide cómo ganar el primer segundo.</p></div></div><OptionGrid options={HOOKS} selected={hook} onSelect={setHook} /></section>
            <section className={s.card}><div className={s.cardTitle}><i>04</i><div><h2>Estilo de video</h2><p>Marca el lenguaje visual y el ritmo.</p></div></div><OptionGrid options={STYLES} selected={style} onSelect={setStyle} /></section>
          </div>
          <footer className={s.generateDock}><button disabled><WandSparkles />Generar video <span>Próximamente</span></button><small>La integración está en preparación · No consume créditos</small></footer>
        </aside>

        <main className={s.stagePanel}>
          <header className={s.stageHeader}><div><span className={s.liveDot} /><span><b>Vista previa</b><small>Fragmento {activeIndex + 1} · {active.role}</small></span></div><div className={s.duration}><small>Duración estimada</small><b>{chunks.length * 6}s</b></div></header>
          <div className={s.previewStage}>
            <div className={s.phoneFrame}>
              {previewUrl ? <img src={previewUrl} alt="Preview del fragmento activo" /> : <div className={s.previewEmpty}><Film /><span>9:16</span><h2>Tu secuencia comienza aquí</h2><p>Selecciona una imagen para visualizar el fragmento activo.</p></div>}
              <div className={s.previewOverlay}><span>FRAGMENTO {activeIndex + 1}</span><b>{active.role}</b><small>6 segundos · {selectedStyle}</small></div>
            </div>
            <aside className={s.directionCard}><span><Sparkles />DIRECCIÓN ACTUAL</span><h3>{selectedHook}</h3><p>{selectedAngle} · {selectedStyle}</p><button disabled><WandSparkles />Recomendar estrategia <em>Próximamente</em></button></aside>
          </div>

          <section className={s.timeline}>
            <header><div><span>TIMELINE</span><h2>Construye tu secuencia</h2></div><p>Cada fragmento representa 6 segundos</p></header>
            <div className={s.chunkTrack}>
              {chunks.map((chunk, index) => (
                <div key={chunk.id} className={s.chunkItem}>
                  <button className={`${s.chunkCard} ${activeChunk === chunk.id ? s.chunkActive : ""}`} onClick={() => setActiveChunk(chunk.id)}><span><i>0{index + 1}</i><small>6s</small></span><div><Clapperboard /><span><b>{chunk.role}</b><small>{index === 0 ? selectedHook : "Continuidad narrativa"}</small></span></div></button>
                  <div className={s.chunkActions}><button onClick={() => moveChunk(index, -1)} disabled={index === 0} aria-label="Mover fragmento a la izquierda"><ArrowLeft /></button><button onClick={() => moveChunk(index, 1)} disabled={index === chunks.length - 1} aria-label="Mover fragmento a la derecha"><ArrowRight /></button><button onClick={() => removeChunk(chunk.id)} disabled={chunks.length === 1} aria-label="Eliminar fragmento"><Trash2 /></button></div>
                  {index < chunks.length - 1 && <span className={s.connector}>→</span>}
                </div>
              ))}
              {chunks.length < 4 && <button className={s.addChunk} onClick={addChunk}><Plus /><b>Añadir fragmento</b><small>+ 6 segundos</small></button>}
            </div>
            <footer><span>{chunks.length} {chunks.length === 1 ? "fragmento" : "fragmentos"}</span><i /><b>{chunks.length * 6} segundos totales</b><small>Máximo inicial: 4 fragmentos</small></footer>
          </section>
        </main>
      </section>
    </div>
  )
}
