"use client"

import { useState } from "react"

interface AccordionProps {
  title: string
  children: React.ReactNode
}

export default function Accordion({ title, children }: AccordionProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="border border-[#3A3833] rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-[#2A2826] hover:bg-[#3A3833] transition-colors"
      >
        <span className="text-sm font-semibold text-[#E8E6E1]">{title}</span>
        <svg
          className={`w-4 h-4 text-[#9A9893] transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className="px-4 py-4 bg-[#2A2826] border-t border-[#3A3833]">
          {children}
        </div>
      )}
    </div>
  )
}