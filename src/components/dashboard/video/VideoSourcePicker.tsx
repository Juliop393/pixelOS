import { Image as ImageIcon, Trash2, Upload, Video } from "lucide-react"
import s from "./VideoWorkspace.module.css"

export default function VideoSourcePicker({ source, previewUrl, fileName, fileError, onSourceChange, onUpload, onClear }: {
  source: "library" | "upload"; previewUrl: string | null; fileName: string; fileError: string
  onSourceChange: (source: "library" | "upload") => void; onUpload: (file?: File) => void; onClear: () => void
}) {
  return <>
    <div className={s.sourceTabs}>
      <button className={source === "library" ? s.sourceActive : ""} onClick={() => onSourceChange("library")}><i className={s.sourceIcon}><ImageIcon /></i><span><b>Mis creativos</b><small>Biblioteca PixelFM</small></span></button>
      <button className={source === "upload" ? s.sourceActive : ""} onClick={() => onSourceChange("upload")}><i className={s.sourceIcon}><Upload /></i><span><b>Subir imagen</b><small>Desde tu equipo</small></span></button>
    </div>
    {source === "library" ? (
      <div className={s.libraryEmpty}><ImageIcon /><b>Elige desde Mis creativos</b><small>La biblioteca se conectará en la integración.</small><span>Vista previa local</span></div>
    ) : previewUrl ? (
      <div className={s.uploadPreview}><img src={previewUrl} alt="Referencia para el video" /><div><span>{fileName}</span><button onClick={onClear}><Trash2 />Quitar</button></div></div>
    ) : (
      <label className={s.uploadBox}><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { onUpload(event.target.files?.[0]); event.currentTarget.value = "" }} /><Upload /><b>Sube tu imagen de referencia</b><small>JPG, PNG o WEBP · No se sube al servidor</small></label>
    )}
    {fileError && <p className={s.fileError} role="alert">{fileError}</p>}
    <div className={s.formatLock}><span><Video />Stories / Reels</span><b>9:16</b></div>
  </>
}
