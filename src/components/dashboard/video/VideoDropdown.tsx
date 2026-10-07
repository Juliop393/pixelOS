"use client"

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react"
import { createPortal } from "react-dom"
import { Check, ChevronDown } from "lucide-react"
import s from "./VideoDropdown.module.css"

type Option = { value: string; label: string }

export default function VideoDropdown({ label, value, options, onChange, disabled = false }: {
  label: string
  value: string
  options: Option[]
  onChange: (value: string) => void
  disabled?: boolean
}) {
  const id = useId()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [menuStyle, setMenuStyle] = useState<CSSProperties | null>(null)
  const selectedIndex = options.findIndex((option) => option.value === value)
  const selectedLabel = options[selectedIndex]?.label ?? value

  const positionMenu = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect()
    if (!rect) return
    const margin = 12
    const width = Math.min(Math.max(rect.width, 220), window.innerWidth - margin * 2)
    const left = Math.max(margin, Math.min(rect.left, window.innerWidth - width - margin))
    const below = window.innerHeight - rect.bottom - margin
    const above = rect.top - margin
    const placeAbove = below < 200 && above > below
    const maxHeight = Math.max(80, Math.min(320, placeAbove ? above - 8 : below - 8))
    const top = placeAbove ? Math.max(margin, rect.top - maxHeight - 8) : rect.bottom + 8
    setMenuStyle({ position: "fixed", top, left, width, maxHeight })
  }, [])

  useLayoutEffect(() => {
    if (!open) return
    positionMenu()
    window.addEventListener("resize", positionMenu)
    window.addEventListener("scroll", positionMenu, true)
    return () => {
      window.removeEventListener("resize", positionMenu)
      window.removeEventListener("scroll", positionMenu, true)
    }
  }, [open, positionMenu])

  useEffect(() => {
    if (!open) return
    const closeOutside = (event: PointerEvent) => {
      if (!triggerRef.current?.contains(event.target as Node) && !menuRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener("pointerdown", closeOutside)
    return () => document.removeEventListener("pointerdown", closeOutside)
  }, [open])

  useEffect(() => { if (disabled) setOpen(false) }, [disabled])

  const openMenu = (index = selectedIndex) => {
    if (disabled || options.length === 0) return
    setActiveIndex(Math.max(0, index))
    setOpen(true)
  }
  const choose = (index: number) => {
    const option = options[index]
    if (!option) return
    onChange(option.value)
    setOpen(false)
    triggerRef.current?.focus()
  }
  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled || options.length === 0) return
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault()
      const direction = event.key === "ArrowDown" ? 1 : -1
      if (!open) openMenu(selectedIndex < 0 ? 0 : (selectedIndex + direction + options.length) % options.length)
      else setActiveIndex((index) => (index + direction + options.length) % options.length)
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault()
      if (!open) openMenu(event.key === "Home" ? 0 : options.length - 1)
      else setActiveIndex(event.key === "Home" ? 0 : options.length - 1)
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      if (open) choose(activeIndex)
      else openMenu()
    } else if (event.key === "Escape" && open) {
      event.preventDefault()
      setOpen(false)
    } else if (event.key === "Tab" && open) {
      setOpen(false)
    }
  }

  return <div className={s.root}>
    <button
      ref={triggerRef}
      type="button"
      role="combobox"
      aria-label={label}
      aria-haspopup="listbox"
      aria-expanded={open}
      aria-controls={open ? id : undefined}
      aria-activedescendant={open ? `${id}-${activeIndex}` : undefined}
      className={s.trigger}
      disabled={disabled}
      onClick={() => open ? setOpen(false) : openMenu()}
      onKeyDown={handleKeyDown}
    ><span>{selectedLabel}</span><ChevronDown aria-hidden="true" /></button>
    {open && menuStyle && createPortal(<div ref={menuRef} id={id} role="listbox" aria-label={label} className={s.menu} style={menuStyle}>
      {options.map((option, index) => <div
        key={option.value}
        id={`${id}-${index}`}
        role="option"
        aria-selected={option.value === value}
        data-highlighted={activeIndex === index}
        className={s.option}
        onPointerEnter={() => setActiveIndex(index)}
        onClick={() => choose(index)}
      ><span>{option.label}</span>{option.value === value && <Check aria-hidden="true" />}</div>)}
    </div>, document.body)}
  </div>
}
