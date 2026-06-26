"use client"

import { useEffect, useState } from "react"
import Particles, { initParticlesEngine } from "@tsparticles/react"
import {
  type ISourceOptions,
  MoveDirection,
  OutMode,
} from "@tsparticles/engine"
import { loadSlim } from "@tsparticles/slim"

const options: ISourceOptions = {
  fullScreen: {
    enable: false,
    zIndex: 0,
  },
  background: {
    color: {
      value: "transparent",
    },
  },
  fpsLimit: 60,
  interactivity: {
    events: {
      onHover: {
        enable: true,
        mode: "repulse",
      },
    },
    modes: {
      repulse: {
        distance: 80,
        duration: 0.4,
      },
    },
  },
  particles: {
    color: {
      value: "rgba(232, 114, 74, 0.25)",
    },
    links: {
      color: {
        value: "rgba(232, 114, 74, 0.25)",
      },
      distance: 160,
      enable: true,
      opacity: 0.08,
      width: 1,
    },
    move: {
      direction: MoveDirection.none,
      enable: true,
      outModes: {
        default: OutMode.out,
      },
      random: true,
      speed: 0.4,
      straight: false,
    },
    number: {
      density: {
        enable: true,
      },
      value: 70,
    },
    opacity: {
      value: 0.25,
    },
    shape: {
      type: "circle",
    },
    size: {
      value: 1.5,
    },
  },
  detectRetina: true,
}

export default function ParticlesBackground() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine)
    }).then(() => {
      setReady(true)
    })
  }, [])

  if (!ready) return null

  return (
    <Particles
      id="tsparticles"
      options={options}
      className="fixed inset-0 pointer-events-auto"
      style={{ zIndex: -1 }}
    />
  )
}