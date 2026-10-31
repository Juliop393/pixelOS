import { Image as ImageIcon, Trash2, Upload, Video } from "lucide-react"
import s from "./VideoWorkspace.module.css"

export default function VideoSourcePicker({ source, previewUrl, fileName, fileError, disabled = false, onSourceChange, onChooseLibrary, onUpload, onClear }: {
  source: "library" | "upload"; previewUrl: string | null; fileName: string; fileError: string
  disabled?: boolean
  onSourceChange: (source: "upload") => void; onChooseLibrary: () => void; onUpload: (file?: File) => void; onClear: () => void
}) {
  return <>
    <div className={s.sourceTabs}>
      <button type="button" disabled={disabled} className={source === "library" ? s.sourceActive : ""} onClick={onChooseLibrary}><i className={s.sourceIcon}><ImageIcon /></i><span><b>Mis creativos</b><small>Biblioteca PixelFM</small></span></button>
      <button type="button" disabled={disabled} className={source === "upload" ? s.sourceActive : ""} onClick={() => onSourceChange("upload")}><i className={s.sourceIcon}><Upload /></i><span><b>Subir imagen</b><small>Desde tu equipo</small></span></button>
    </div>
    {source === "library" && !previewUrl ? (
      <button type="button" className={s.libraryEmpty} disabled={disabled} onClick={onChooseLibrary}><ImageIcon /><b>Elegir imagen</b><small>Selecciona una imagen de Mis creativos.</small></button>
    ) : previewUrl ? (
      <div className={s.uploadPreview}><img src={previewUrl} alt="Referencia para el video" /><div><span>{fileName || "Imagen seleccionada"}</span>{source === "library" && <button type="button" disabled={disabled} onClick={onChooseLibrary}>Cambiar</button>}<button type="button" disabled={disabled} onClick={onClear}><Trash2 />Quitar</button></div></div>
    ) : (
      <label className={s.uploadBox}><input type="file" disabled={disabled} accept="image/jpeg,image/png,image/webp" onChange={(event) => { onUpload(event.target.files?.[0]); event.currentTarget.value = "" }} /><Upload /><b>Sube tu imagen de referencia</b><small>JPG, PNG o WEBP · Máximo 5 MB</small></label>
    )}
    {fileError && <p className={s.fileError} role="alert">{fileError}</p>}
    <div className={s.formatLock}><span><Video />Stories / Reels</span><b>9:16</b></div>
  </>
}
