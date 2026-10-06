"use client"

import { useEffect, useRef, useState } from "react"
import { ArrowLeft, ChevronDown, WandSparkles } from "lucide-react"
import PixelAiIcon from "@/components/dashboard/PixelAiIcon"
import { useVideoGenerator } from "@/hooks/useVideoGenerator"
import { supabase } from "@/lib/supabase"
import PixelAiDrawer from "@/components/dashboard/PixelAiDrawer"
import EditorHeader from "@/components/dashboard/EditorHeader"
import VideoPreview from "./VideoPreview"
import VideoSceneField from "./VideoSceneField"
import VideoSourcePicker from "./VideoSourcePicker"
import VideoStoryboard from "./VideoStoryboard"
import VideoTimeline from "./VideoTimeline"
import VideoStrategyEditor from "./VideoStrategyEditor"
import VideoSimple, { SIMPLE_APPROACHES, type SimpleApproach } from "./VideoSimple"
import VideoPlan from "./VideoPlan"
import VideoResult from "./VideoResult"
import { proposeVideoPlan, SIMPLE_DURATION_LABELS, SIMPLE_DURATION_RANGES, SIMPLE_STYLE_LABELS, type SimpleDuration } from "./video-plan"
import { createVideoChunk, getVideoDuration, migrateVideoChunk, moveVideoChunk, VIDEO_FORMAT, VIDEO_MAX_SCENES, VIDEO_SCENE_ROLES, VIDEO_ANGLES, VIDEO_HOOKS, VIDEO_STYLES, type VideoChunk, type VideoStrategy } from "./video-data"
import s from "./VideoWorkspace.module.css"

type VideoTab = "reference" | "action" | "dialogue" | "more"
type VideoWorkspaceMode = "storyboard" | "advanced"
type VideoEditorMode = "simple" | "plan" | "pro" | "result"

const VIDEO_TABS: { id: VideoTab; label: string }[] = [
  { id: "reference", label: "Referencia" },
  { id: "action", label: "Qué ocurre" },
  { id: "dialogue", label: "Voz / texto" },
]

const ACTION_SUGGESTIONS = ["Persona mostrando el producto", "Abrir una caja", "Usar el producto", "Caminar hacia cámara", "Producto girando", "Transformación antes / después"]
const CAMERA_SUGGESTIONS = ["Close-up", "Plano medio", "Handheld", "Travelling", "Paneo", "Toma cenital", "Dron", "Cámara fija"]
const DIALOGUE_SUGGESTIONS = ["Persona a cámara: ", "Voz en off: ", "Texto en pantalla: "]
const SCENE_STYLE_SUGGESTIONS = ["UGC natural", "Cinematográfico", "Estudio limpio", "Lifestyle", "Dinámico", "Premium", "Minimalista"]
const REFERENCE_SUGGESTIONS = ["Producto en primer plano", "Persona con el producto", "Empaque en contexto", "Referencia antes / después"]

const VIDEO_ANGLE_API_MAP: Record<string, string> = {
  problem: "problem-solution",
  benefit: "primary-benefit",
  demo: "product-demo",
  social: "social-proof",
  comparison: "comparison",
  experience: "usage-experience",
  offer: "offer-convenience",
  mechanism: "unique-mechanism",
}

const VIDEO_STYLE_API_MAP: Record<string, string> = {
  ugc: "lifestyle",
  cinematic: "premium-editorial",
  lifestyle: "lifestyle",
  demo: "product-action",
  editorial: "premium-editorial",
  commercial: "direct-offer",
  minimal: "minimal-tech",
  b2b: "b2b",
}

const SIMPLE_APPROACH_STYLE_MAP: Record<Exclude<SimpleApproach, "custom">, string> = {
  auto: "cinematic",
  demo: "demo",
  ugc: "ugc",
  commercial: "commercial",
  cinematic: "cinematic",
}

function SectionTitle({ title, description }: { title: string; description: string }) {
  return <div className={s.cardTitle}><div><h2>{title}</h2><p>{description}</p></div></div>
}

export default function VideoWorkspace() {
  const nextId = useRef(2)
  const generatingChunkId = useRef<number | null>(null)
  const { videoUrl, videoPhase, videoError, generateVideo } = useVideoGenerator()
  const [fileError, setFileError] = useState("")
  const [uploading, setUploading] = useState(false)
  const [strategy, setStrategy] = useState<VideoStrategy>({ angle: "demo", hook: "result", style: "cinematic", cta: "", format: VIDEO_FORMAT })
  const { angle, hook, style } = strategy
  const updateStrategy = (patch: Partial<VideoStrategy>) => setStrategy((current) => ({ ...current, ...patch }))
  const [activeTab, setActiveTab] = useState<VideoTab>("action")
  const [workspaceMode, setWorkspaceMode] = useState<VideoWorkspaceMode>("storyboard")
  const [editorMode, setEditorMode] = useState<VideoEditorMode>("simple")
  const [simpleApproach, setSimpleApproach] = useState<SimpleApproach>("auto")
  const [simpleGoal, setSimpleGoal] = useState("")
  const [simpleDuration, setSimpleDuration] = useState<SimpleDuration>("short")
  const [planSeed, setPlanSeed] = useState<string | null>(null)
  const [planNotice, setPlanNotice] = useState("")
  const planEdited = useRef(false)
  const [chunks, setChunks] = useState<VideoChunk[]>(() => [migrateVideoChunk(createVideoChunk(1, "Hook / apertura"))])
  const [pendingChanges, setPendingChanges] = useState<ReadonlySet<number>>(() => new Set())
  const [activeId, setActiveId] = useState(1)
  const [strategyFeedback, setStrategyFeedback] = useState("")
  const [generateFeedback, setGenerateFeedback] = useState("")
  const [finalVideoUrl] = useState<string | null>(null)
  const [pixelAiOpen, setPixelAiOpen] = useState(false)

  const activeChunk = chunks.find((chunk) => chunk.id === activeId) ?? chunks[0]
  const activeIndex = chunks.findIndex((chunk) => chunk.id === activeId)
  const activeSource = activeChunk.referenceSource ?? "library"
  const activePreviewUrl = activeChunk.referenceImageUrl ?? null
  const activeFileName = activeChunk.referenceFileName ?? ""
  const simpleReference = chunks[0]

  const showSimpleMode = () => {
    setSimpleApproach((current) => {
      if (current !== "custom" && SIMPLE_APPROACH_STYLE_MAP[current] === style) return current
      return SIMPLE_APPROACHES.find((item) => item.id === style)?.id ?? "custom"
    })
    setEditorMode("simple")
  }

  const updateChunk = (id: number, patch: Partial<VideoChunk>) => {
    setChunks((current) => current.map((chunk) => chunk.id === id ? { ...migrateVideoChunk(chunk), ...patch } : chunk))
  }
  const markPendingChanges = (id: number) => {
    if (chunks.some((chunk) => chunk.id === id && chunk.videoUrl)) {
      setPendingChanges((current) => new Set(current).add(id))
    }
  }
  const updateActiveChunk = (patch: Partial<VideoChunk>) => { planEdited.current = true; markPendingChanges(activeId); updateChunk(activeId, patch) }
  const selectChunk = (id: number) => { setActiveId(id); setFileError(""); setGenerateFeedback("") }
  const clearPreview = (id = activeId) => {
    if (editorMode === "pro") planEdited.current = true
    markPendingChanges(id)
    updateChunk(id, { referenceImageUrl: undefined, referenceFileName: "", status: "pending" })
    setFileError("")
    setGenerateFeedback("")
  }
  const handleUpload = async (file?: File, targetChunkId = activeId) => {
    if (!file) return
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { setFileError("Usa una imagen JPG, PNG o WEBP."); return }
    if (file.size > 5 * 1024 * 1024) { setFileError("La imagen debe pesar menos de 5 MB."); return }
    if (editorMode === "pro") planEdited.current = true
    markPendingChanges(targetChunkId)

    updateChunk(targetChunkId, { referenceSource: "upload", referenceImageUrl: undefined, referenceFileName: file.name, status: "pending" })
    setFileError(""); setUploading(true); setGenerateFeedback("Subiendo referencia visual...")
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error("Tu sesión expiró. Vuelve a iniciar sesión.")

      const formData = new FormData()
      formData.append("file", file)
      formData.append("bucket", "referencias")
      const response = await fetch("/api/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData,
      })
      const data = await response.json()
      if (!response.ok || !data.success || typeof data.publicUrl !== "string") {
        throw new Error(data.error || "No se pudo subir la fuente visual")
      }
      if (!data.publicUrl.startsWith("https://")) throw new Error("La fuente visual no devolvió una URL segura")

      updateChunk(targetChunkId, { referenceSource: "upload", referenceImageUrl: data.publicUrl, referenceFileName: file.name, status: "configured" })
      setGenerateFeedback("Referencia visual lista para generar")
    } catch (error) {
      updateChunk(targetChunkId, { referenceImageUrl: undefined, status: "pending" })
      setFileError(error instanceof Error ? error.message : "No se pudo subir la fuente visual")
      setGenerateFeedback("")
    } finally {
      setUploading(false)
    }
  }
  const addChunk = () => { if (chunks.length >= VIDEO_MAX_SCENES) return; planEdited.current = true; const chunk = createVideoChunk(nextId.current++); setChunks((current) => [...current, chunk]); selectChunk(chunk.id) }
  const removeChunk = (id: number) => { if (chunks.length === 1) return; planEdited.current = true; const removedIndex = chunks.findIndex((chunk) => chunk.id === id); const next = chunks.filter((chunk) => chunk.id !== id); setChunks(next); if (activeId === id) setActiveId(next[Math.min(removedIndex, next.length - 1)].id) }
  const moveChunk = (index: number, direction: -1 | 1) => { planEdited.current = true; setChunks((current) => moveVideoChunk(current, index, direction)) }

  const angleLabel = VIDEO_ANGLES.find((item) => item.id === angle)?.label
  const hookLabel = VIDEO_HOOKS.find((item) => item.id === hook)?.label
  const styleLabel = VIDEO_STYLES.find((item) => item.id === style)?.label
  const canGenerate = Boolean(activeSource === "upload" && activePreviewUrl?.startsWith("https://") && angle && hook && style && activeChunk && !uploading && videoPhase !== "generating")
  const generatedChunks = chunks.filter((chunk) => chunk.status === "generated" && chunk.videoUrl)

  useEffect(() => {
    setChunks((current) => current.map((chunk) => (
      chunk.id !== activeId || ["generating", "generated", "error"].includes(chunk.status)
        ? chunk
        : { ...chunk, status: canGenerate ? "configured" : "pending" }
    )))
  }, [activeId, canGenerate])

  useEffect(() => {
    const chunkId = generatingChunkId.current
    if (chunkId === null) return

    if (videoPhase === "generated" && videoUrl) {
      setChunks((current) => current.map((chunk) => chunk.id === chunkId
        ? { ...chunk, status: "generated", videoUrl }
        : chunk
      ))
      setGenerateFeedback("Escena generada correctamente")
      setPendingChanges((current) => { const next = new Set(current); next.delete(chunkId); return next })
      generatingChunkId.current = null
    } else if (videoPhase === "error") {
      setChunks((current) => current.map((chunk) => chunk.id === chunkId
        ? { ...chunk, status: "error", videoUrl: undefined }
        : chunk
      ))
      setGenerateFeedback(videoError || "No se pudo generar la escena")
      generatingChunkId.current = null
    }
  }, [videoError, videoPhase, videoUrl])

  const recommendStrategy = () => {
    const recommendation = style === "ugc" || style === "lifestyle"
      ? { angle: "social", hook: "question", style }
      : style === "b2b"
        ? { angle: "benefit", hook: "problem", style }
        : style === "commercial"
          ? { angle: "offer", hook: "instant", style }
          : { angle: "demo", hook: "result", style }
    updateStrategy(recommendation)
    const nextAngle = VIDEO_ANGLES.find((item) => item.id === recommendation.angle)?.label
    const nextHook = VIDEO_HOOKS.find((item) => item.id === recommendation.hook)?.label
    setStrategyFeedback(`${nextHook} · ${nextAngle}`)
  }

  const generateVideoChunk = () => {
    if (!canGenerate || !activePreviewUrl) return
    const chunkId = activeChunk.id
    const apiAngle = VIDEO_ANGLE_API_MAP[angle]
    const apiStyle = VIDEO_STYLE_API_MAP[style]
    if (!apiAngle || !apiStyle) return

    generatingChunkId.current = chunkId
    setChunks((current) => current.map((chunk) => chunk.id === chunkId ? { ...chunk, status: "generating" } : chunk))
    setGenerateFeedback("Generando escena...")
    void generateVideo(activePreviewUrl, apiAngle, hookLabel ?? hook, apiStyle, {
      cta: strategy.cta,
      format: strategy.format,
      sceneRole: activeChunk.purpose,
      referenceDescription: activeChunk.referenceDescription,
      action: activeChunk.action,
      camera: activeChunk.camera,
      dialogue: activeChunk.dialogue,
      sceneStyle: activeChunk.sceneStyle,
      duration: activeChunk.duration,
    })
  }

  const mergeVideoChunks = () => {
    if (generatedChunks.length < 2) return
    // TODO: conectar aquí el endpoint productivo de unión de fragmentos.
  }

  const editChunk = (id: number) => {
    selectChunk(id)
    setActiveTab("action")
    setWorkspaceMode("advanced")
  }

  const continueFromSimple = () => {
    const referenceImageUrl = simpleReference.referenceImageUrl
    if (!referenceImageUrl?.startsWith("https://") || !simpleGoal.trim() || uploading) return
    const seed = JSON.stringify([simpleGoal.trim(), simpleDuration, style, referenceImageUrl])
    if (planSeed !== seed) {
      if (chunks.some((chunk) => chunk.status === "generating" || chunk.status === "generated")) {
        setPlanNotice("Se conservan las escenas ya generadas. Los nuevos cambios de Simple no reemplazaron ese trabajo.")
      } else {
        if (planEdited.current && !window.confirm("Preparar otro plan reemplazará las escenas que editaste en Modo Pro. ¿Quieres continuar?")) return
        const proposed = proposeVideoPlan({ goal: simpleGoal, duration: simpleDuration, style, referenceImageUrl, referenceFileName: simpleReference.referenceFileName, firstId: nextId.current })
        nextId.current += proposed.length
        setChunks(proposed)
        setActiveId(proposed[0].id)
        setPlanSeed(seed)
        setPlanNotice("")
        planEdited.current = false
      }
    }
    setWorkspaceMode("storyboard")
    setEditorMode("plan")
  }

  const reviewGenerationFromPlan = () => {
    setGenerateFeedback("Revisa y confirma la generación de la escena seleccionada. El plan completo aún no se genera automáticamente.")
    setWorkspaceMode("storyboard")
    setEditorMode("pro")
  }

  const editPlanScenes = () => {
    setActiveTab("action")
    setWorkspaceMode("advanced")
    setEditorMode("pro")
  }

  return <div id="video-workspace" data-pixel-ai-open={pixelAiOpen ? "true" : "false"} data-workspace-mode={editorMode === "pro" ? workspaceMode : editorMode} className={s.page}>
    <EditorHeader tool="video" action={<div className={s.modeHeaderActions}><div className={s.modeSwitch} role="tablist" aria-label="Modo de edición de Video">
      <button type="button" role="tab" aria-selected={editorMode === "simple"} className={editorMode === "simple" ? s.modeSelected : ""} onClick={showSimpleMode}>Simple</button>
      <button type="button" role="tab" aria-selected={editorMode === "pro"} className={editorMode === "pro" ? s.modeSelected : ""} onClick={() => setEditorMode("pro")}>Modo Pro</button>
    </div><button
      type="button"
      className={`${s.pixelAiHeaderButton} ${pixelAiOpen ? s.pixelAiHeaderButtonActive : ""}`}
      onClick={() => setPixelAiOpen((open) => !open)}
      aria-controls="pixel-ai-panel"
      aria-expanded={pixelAiOpen}
    ><PixelAiIcon /><span>PixelIA</span><i>{pixelAiOpen ? "Abierto" : "Asistente creativo"}</i></button></div>} />
    {editorMode === "pro" && simpleGoal.trim() && <div className={s.simpleContext}><b>Tu idea:</b> {simpleGoal.trim()} <span>· Duración deseada: {SIMPLE_DURATION_LABELS[simpleDuration]} {SIMPLE_DURATION_RANGES[simpleDuration]} (orientativa)</span></div>}
    <section className={s.workspace}>
    {editorMode === "simple" ? <VideoSimple
      referenceImageUrl={simpleReference.referenceImageUrl ?? null}
      referenceFileName={simpleReference.referenceFileName}
      fileError={fileError}
      uploading={uploading}
      goal={simpleGoal}
      onGoalChange={setSimpleGoal}
      approach={simpleApproach}
      styleLabel={styleLabel}
      onApproachChange={(nextApproach) => { setSimpleApproach(nextApproach); updateStrategy({ style: SIMPLE_APPROACH_STYLE_MAP[nextApproach] }) }}
      duration={simpleDuration}
      onDurationChange={setSimpleDuration}
      onUpload={(file) => { void handleUpload(file, simpleReference.id) }}
      onClear={() => clearPreview(simpleReference.id)}
      onIdea={() => setPixelAiOpen(true)}
      onCreate={continueFromSimple}
    /> : editorMode === "plan" ? <VideoPlan
      chunks={chunks}
      goal={simpleGoal}
      styleLabel={SIMPLE_APPROACHES.find((item) => item.id === simpleApproach)?.label ?? SIMPLE_STYLE_LABELS[style] ?? styleLabel ?? "Estilo del anuncio"}
      duration={simpleDuration}
      referenceImageUrl={simpleReference.referenceImageUrl ?? null}
      notice={planNotice}
      onBack={() => setEditorMode("simple")}
      onGenerate={reviewGenerationFromPlan}
      onEdit={editPlanScenes}
    /> : editorMode === "result" ? <VideoResult
      chunks={chunks}
      format={strategy.format}
      finalVideoUrl={finalVideoUrl}
      pendingChanges={pendingChanges}
      onEdit={() => { setWorkspaceMode("storyboard"); setEditorMode("pro") }}
      onEditScene={(id) => { editChunk(id); setEditorMode("pro") }}
    /> : workspaceMode === "storyboard" ? <VideoStoryboard
      chunks={chunks}
      strategyEditor={<VideoStrategyEditor strategy={strategy} onChange={updateStrategy} />}
      sourceReady={Boolean(activeSource === "upload" && activePreviewUrl?.startsWith("https://"))}
      canGenerate={canGenerate}
      generateFeedback={generateFeedback}
      activeId={activeId}
      onAdjust={() => setWorkspaceMode("advanced")}
      onGenerate={generateVideoChunk}
      onSelect={selectChunk}
      onEdit={editChunk}
      onAdd={addChunk}
      onRemove={removeChunk}
      onMove={moveChunk}
    /> : <>
    <aside className={s.configPanel}>
      <header className={s.intro}><button type="button" className={s.advancedBack} onClick={() => setWorkspaceMode("storyboard")}><ArrowLeft />Volver a secuencia</button><span>MODO PRO · AJUSTAR ESCENAS</span><h1>Dirige tu anuncio</h1><p>Controla la ejecución visual de la escena seleccionada.</p></header>
      <div className={s.sceneMetadata}>
        <div className={s.sceneIdentity}><span>ESCENA ACTUAL</span><h2>Escena {activeIndex + 1} · {activeChunk.purpose}</h2></div>
        <label>Rol de la escena<span className={s.strategySelectWrap}><select value={activeChunk.purpose} onChange={(event) => updateActiveChunk({ purpose: event.target.value })}>
          {!VIDEO_SCENE_ROLES.includes(activeChunk.purpose) && <option value={activeChunk.purpose}>{activeChunk.purpose}</option>}
          {VIDEO_SCENE_ROLES.map((role) => <option key={role} value={role}>{role}</option>)}
        </select></span></label>
        <small>{activeChunk.duration} s por escena actualmente.</small>
      </div>
      <VideoStrategyEditor strategy={strategy} onChange={updateStrategy} />
      <div className={s.configBody}>
        <nav className={s.stepTabs} aria-label="Controles de la escena">
          {VIDEO_TABS.map((tab) => <button type="button" key={tab.id} className={activeTab === tab.id ? s.stepActive : ""} aria-current={activeTab === tab.id ? "page" : undefined} onClick={() => setActiveTab(tab.id)}>{tab.label}</button>)}
          <button type="button" className={`${s.moreControlsButton} ${activeTab === "more" ? s.stepActive : ""}`} aria-expanded={activeTab === "more"} aria-controls="video-scene-more-controls" onClick={() => setActiveTab((current) => current === "more" ? "action" : "more")}>Más controles<ChevronDown /></button>
        </nav>
        <div className={s.configScroll}>
          {activeTab === "reference" && <section className={s.card}>
            <SectionTitle title="Referencia" description="Elige el producto, persona, objeto o elemento visual que debe reconocerse en esta escena." />
            <VideoSourcePicker source={activeSource} previewUrl={activePreviewUrl} fileName={activeFileName} fileError={fileError} onSourceChange={(referenceSource) => updateActiveChunk({ referenceSource })} onUpload={handleUpload} onClear={() => clearPreview()} />
            <VideoSceneField id={`scene-reference-${activeChunk.id}`} label="Qué debemos reconocer" value={activeChunk.referenceDescription ?? ""} onChange={(referenceDescription) => updateActiveChunk({ referenceDescription })} suggestions={REFERENCE_SUGGESTIONS} placeholder="Ej. El producto en manos de una persona, con el empaque visible y una cocina luminosa de fondo." helper="Complementa la imagen con el sujeto o detalle que debe mantenerse visible." maxLength={300} />
          </section>}
          {activeTab === "action" && <section className={s.card}>
            <SectionTitle title="Qué ocurre" description="Describe qué pasa en esta escena, con tus palabras." />
            <VideoSceneField id={`scene-action-${activeChunk.id}`} label="Qué ocurre" value={activeChunk.action} onChange={(action) => updateActiveChunk({ action })} suggestions={ACTION_SUGGESTIONS} placeholder="Ej. Una persona abre la caja, extrae el producto y lo muestra a cámara con un gesto natural." helper="Describe una acción concreta y observable." maxLength={500} />
          </section>}
          {activeTab === "dialogue" && <section className={s.card}>
            <SectionTitle title="Voz / texto" description="Añade lo que se dice o el texto que debe verse, si esta escena lo necesita." />
            <VideoSceneField id={`scene-dialogue-${activeChunk.id}`} label="Lo que se dice o aparece" value={activeChunk.dialogue ?? ""} onChange={(dialogue) => updateActiveChunk({ dialogue })} suggestions={DIALOGUE_SUGGESTIONS} placeholder={'Ej. Voz en off: "Así simplifiqué mi rutina cada mañana". Texto en pantalla: "Listo en segundos".'} helper="Puedes dejarlo vacío para una escena completamente visual." optional maxLength={500} />
          </section>}
          <div id="video-scene-more-controls" className={s.advancedSceneControls} hidden={activeTab !== "more"}>
            <section className={s.card}>
              <SectionTitle title="Cámara" description="Opcional: indica cómo quieres ver o grabar la acción." />
              <VideoSceneField id={`scene-camera-${activeChunk.id}`} label="Encuadre y movimiento" value={activeChunk.camera ?? ""} onChange={(camera) => updateActiveChunk({ camera })} suggestions={CAMERA_SUGGESTIONS} placeholder="Ej. Plano medio handheld que se acerca lentamente hasta un close-up del producto." helper="Si lo dejas vacío, no se añade una indicación de cámara específica." optional maxLength={350} />
            </section>
            <section className={s.card}>
              <SectionTitle title="Estilo de esta escena" description="Solo cambia esto si quieres que esta escena se vea diferente al resto." />
              <VideoSceneField id={`scene-style-${activeChunk.id}`} label="Estilo de esta escena" value={activeChunk.sceneStyle ?? ""} onChange={(sceneStyle) => updateActiveChunk({ sceneStyle })} suggestions={SCENE_STYLE_SUGGESTIONS} placeholder="Ej. UGC natural, luz suave de ventana y energía cercana." helper="El estilo general sigue aplicando a todo el anuncio." optional maxLength={350} />
            </section>
          </div>
        </div>
      </div>
      <footer className={s.generateDock}><button disabled={!canGenerate} onClick={generateVideoChunk}><WandSparkles />Generar video</button><small>{generateFeedback || (canGenerate ? "Configuración completa · Lista para generar" : "Selecciona una fuente visual para continuar")}</small></footer>
    </aside>
    <main className={s.stagePanel}>
      <VideoPreview previewUrl={activeSource === "upload" ? activePreviewUrl : null} activeChunk={activeChunk} activeIndex={activeIndex} totalDuration={getVideoDuration(chunks)} hookLabel={hookLabel} angleLabel={angleLabel} styleLabel={styleLabel} strategyFeedback={strategyFeedback} onRecommend={recommendStrategy} />
      <VideoTimeline chunks={chunks} activeId={activeId} format={strategy.format} finalVideoUrl={finalVideoUrl} onSelect={selectChunk} onAdd={addChunk} onRemove={removeChunk} onMove={moveChunk} onMerge={mergeVideoChunks} />
    </main>
    </>}
    <PixelAiDrawer open={pixelAiOpen} onOpenChange={setPixelAiOpen} focusMode videoContext />
    </section>
  </div>
}
