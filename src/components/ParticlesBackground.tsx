"use client"

import { useCallback } from "react"
import Particles from "@tsparticles/react"
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
        mode: "grab",
      },
      onClick: {
        enable: true,
        mode: "push",
      },
    },
    modes: {
      grab: {
        distance: 180,
        links: {
          opacity: 0.6,
        },
      },
      push: {
        quantity: 2,
      },
    },
  },
  particles: {
    color: {
      value: ["#D97757", "#9A9893", "#3A3833"],
    },
    links: {
      color: {
        value: ["#D97757", "#3A3833"],
      },
      distance: 160,
      enable: true,
      opacity: 0.15,
      width: 1,
    },
    move: {
      direction: MoveDirection.none,
      enable: true,
      outModes: {
        default: OutMode.bounce,
      },
      random: true,
      speed: 0.5,
      straight: false,
      attract: {
        enable: true,
        rotateX: 600,
        rotateY: 1200,
      },
    },
    number: {
      density: {
        enable: true,
      },
      value: 100,
    },
    opacity: {
      value: {
        min: 0.1,
        max: 0.3,
      },
      animation: {
        enable: true,
        speed: 0.5,
        minimumValue: 0.05,
        sync: false,
      },
    },
    shape: {
      type: "circle",
    },
    size: {
      value: { min: 1, max: 4 },
      animation: {
        enable: true,
        speed: 1,
        minimumValue: 0.5,
        sync: false,
      },
    },
  },
  detectRetina: true,
}

export default function ParticlesBackground() {
  const init = useCallback(async (engine: unknown) => {
    await loadSlim(engine as Parameters<typeof loadSlim>[0])
  }, [])

  return (
    <Particles
      id="tsparticles"
      options={options}
      init={init}
      className="absolute inset-0 -z-10"
    />
  )
}
