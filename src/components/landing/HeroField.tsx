"use client"

import { useEffect, useRef } from "react"
import s from "./Landing.module.css"

/**
 * Hero backdrop: one visual object, drawn by a small raw-WebGL fragment shader.
 *
 * A huge dark glass sphere sits slightly off-axis with the copy inside it, eclipsed
 * from the upper right. Its lower hemisphere holds a slow lava-lamp mass that pools
 * around the cards, and a handful of embers leave the lit side of the limb.
 *
 * Kept cheap: rendered below display resolution, 30 fps cap, paused off screen, and
 * it drops resolution by itself on slow GPUs. Phones, reduced motion and Data Saver
 * get a simpler single frame. Without WebGL the CSS glow underneath remains.
 */
const VERTEX = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`

const FRAGMENT = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2 uRes;
uniform float uTime;
uniform vec2 uPointer;
uniform float uLite;

const vec3 TERRA = vec3(0.90, 0.43, 0.25);
const vec3 EMBER = vec3(0.50, 0.17, 0.09);
const vec3 CREAM = vec3(1.0, 0.91, 0.82);

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
    f.y
  );
}

float blob(vec2 p, vec2 centre, float radius) {
  vec2 d = p - centre;
  return radius * radius / (dot(d, d) + 0.0008);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 q = vec2(uv.x, 1.0 - uv.y);
  float aspect = uRes.x / uRes.y;
  float t = uTime;

  // One object: a huge dark sphere, slightly off-axis, the copy sitting inside it.
  float radius = min(0.642, aspect * 0.56);
  vec2 centre = vec2(mix(0.55, 0.5, uLite), mix(0.722, 0.70, uLite)) + uPointer * vec2(0.008, 0.006);
  vec2 d = (q - centre) * vec2(aspect, 1.0) / radius;
  float r = length(d);
  float body = 1.0 - smoothstep(0.997, 1.003, r);

  vec3 color = vec3(0.0);
  float alpha = 0.0;

  if (r < 1.004) {
    float z = sqrt(max(0.0, 1.0 - r * r));
    // Stereographic mapping: the lava wraps the surface instead of lying flat on it.
    vec2 sp = d / (1.0 + z);
    vec2 flow = vec2(noise(sp * 2.6 + t * 0.035), noise(sp * 2.6 - t * 0.03 + 7.0)) - 0.5;
    sp += 0.26 * flow + 0.05 * (vec2(noise(sp * 7.0 + 3.0 + t * 0.05), noise(sp * 7.0 - t * 0.04)) - 0.5);

    // Lava-lamp mass: a few slow metaballs pooled in the lower hemisphere.
    float field = 0.0;
    field += blob(sp, vec2(-0.40 + 0.06 * sin(t * 0.070), 0.13 + 0.05 * cos(t * 0.090)), 0.15);
    field += blob(sp, vec2(-0.10 + 0.12 * sin(t * 0.055 + 1.3), 0.17 + 0.04 * sin(t * 0.080)), 0.17);
    field += blob(sp, vec2(0.20 + 0.10 * sin(t * 0.048 + 3.0), 0.15 + 0.04 * cos(t * 0.066)), 0.16);
    field += blob(sp, vec2(0.46 + 0.05 * cos(t * 0.060 + 2.0), 0.09 + 0.06 * sin(t * 0.075 + 1.0)), 0.15);
    field += blob(sp, vec2(0.33 + 0.10 * cos(t * 0.042), -0.04 + 0.07 * sin(t * 0.058 + 2.4)), 0.058);
    field += blob(sp, vec2(-0.27 + 0.12 * sin(t * 0.039 + 4.0), -0.03 + 0.06 * cos(t * 0.052)), 0.05);

    // Viscous and dark, defined by a thin lit skin rather than by a glow.
    float mass = smoothstep(0.86, 1.02, field);
    float depth = smoothstep(1.0, 3.6, field);
    float skin = smoothstep(0.80, 0.97, field) * (1.0 - smoothstep(0.97, 1.16, field));

    // Lit from below and behind: the top stays black so the headline reads.
    float lift = smoothstep(-0.34, 0.06, d.y);
    vec3 lava = EMBER * mass * (0.26 + 0.34 * depth);
    lava += TERRA * mass * depth * 0.2;
    lava += mix(TERRA, CREAM, 0.3) * skin * 0.5;
    color += lava * lift * (0.55 + 0.45 * z);

    // Glass: fresnel falloff towards the limb and a soft inner reflection.
    float fresnel = pow(1.0 - z, 3.4);
    vec2 lightDir = normalize(vec2(0.62, -0.78));
    float facing = dot(normalize(d + 0.0001), lightDir);
    float crescent = smoothstep(-0.05, 0.9, facing);
    color += mix(EMBER, TERRA, crescent) * fresnel * (0.05 + 0.34 * crescent);
    color += CREAM * pow(1.0 - z, 9.0) * crescent * 0.42;
    float underglow = smoothstep(0.1, 0.9, -facing) * pow(1.0 - z, 2.4);
    color += TERRA * underglow * 0.15;

    // The sphere occludes what is behind it: true depth, not an overlay.
    alpha = body * 0.9;
  }

  // Thin outer corona, only where the light catches the limb.
  if (r >= 0.99) {
    vec2 lightDir = normalize(vec2(0.62, -0.78));
    float facing = dot(normalize(d), lightDir);
    float catchLight = smoothstep(0.0, 0.95, facing);
    float fall = exp(-(r - 1.0) * 26.0);
    float wide = exp(-(r - 1.0) * 6.5);
    vec3 corona = (TERRA * fall * 0.32 + EMBER * wide * 0.2) * (0.1 + catchLight);
    color += corona * (1.0 - body * 0.6);
    alpha = max(alpha, clamp(max(corona.r, corona.g) * 1.1, 0.0, 1.0));
  }

  // A small, controlled set of embers leaving the lit side of the limb.
  if (uLite < 0.5) {
    for (int i = 0; i < 22; i++) {
      float n = float(i);
      float life = fract(hash(vec2(n, 2.0)) + t * (0.008 + 0.012 * hash(vec2(n, 3.0))));
      float angle = -1.75 + 2.3 * hash(vec2(n, 1.0)) + 0.1 * life;
      float dist = 1.015 + life * (0.16 + 0.26 * hash(vec2(n, 4.0)));
      vec2 at = vec2(cos(angle), sin(angle)) * dist;
      float size = 0.0016 + 0.0024 * hash(vec2(n, 5.0));
      float spark = exp(-dot(d - at, d - at) / (size * size));
      float glow = sin(life * 3.1416) * (0.55 + 0.45 * sin(t * 0.8 + n * 1.7));
      color += mix(TERRA, CREAM, 0.6) * spark * glow * 0.9;
      alpha = max(alpha, spark * glow * 0.9);
    }
  }

  // Fine grain against banding.
  float lit = min(1.0, dot(color, vec3(5.0)));
  color += (hash(gl_FragCoord.xy + fract(t)) - 0.5) * 0.010 * lit;

  color = max(color, 0.0);
  alpha = max(alpha, clamp(max(color.r, max(color.g, color.b)), 0.0, 1.0));
  gl_FragColor = vec4(min(color, vec3(alpha)), alpha);
}
`

const FRAME = 1000 / 30

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)
  if (!shader) return null
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null
}

export default function HeroField() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const gl = canvas?.getContext("webgl", { alpha: true, antialias: false, depth: false, powerPreference: "low-power" })
    if (!canvas || !gl) return

    const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX)
    const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT)
    const program = gl.createProgram()
    if (!vertex || !fragment || !program) return
    gl.attachShader(program, vertex)
    gl.attachShader(program, fragment)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return
    gl.useProgram(program)

    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const position = gl.getAttribLocation(program, "aPos")
    gl.enableVertexAttribArray(position)
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)

    const uRes = gl.getUniformLocation(program, "uRes")
    const uTime = gl.getUniformLocation(program, "uTime")
    const uPointer = gl.getUniformLocation(program, "uPointer")
    const uLite = gl.getUniformLocation(program, "uLite")

    const lite = window.matchMedia("(max-width: 760px)").matches
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
    const animated = !lite && !connection?.saveData && !window.matchMedia("(prefers-reduced-motion: reduce)").matches
    gl.uniform1f(uLite, lite ? 1 : 0)

    let quality = lite ? 0.8 : 0.85
    let pointerX = 0
    let pointerY = 0
    let driftX = 0
    let driftY = 0

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5) * quality
      canvas.width = Math.max(1, Math.round(canvas.clientWidth * ratio))
      canvas.height = Math.max(1, Math.round(canvas.clientHeight * ratio))
      gl.viewport(0, 0, canvas.width, canvas.height)
      gl.uniform2f(uRes, canvas.width, canvas.height)
    }

    const draw = (seconds: number) => {
      gl.uniform1f(uTime, seconds)
      gl.uniform2f(uPointer, driftX, driftY)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }

    resize()
    draw(40)
    canvas.dataset.ready = ""

    let resizeTimer = 0
    const onResize = () => {
      window.clearTimeout(resizeTimer)
      resizeTimer = window.setTimeout(() => {
        resize()
        if (!animated) draw(40)
      }, 150)
    }
    window.addEventListener("resize", onResize)

    let frame = 0
    let last = 0
    let slowFrames = 0
    let onScreen = true

    const tick = (now: number) => {
      frame = requestAnimationFrame(tick)
      const elapsed = now - last
      if (elapsed < FRAME) return
      // Repeatedly late frames while visible: trade resolution for smoothness.
      slowFrames = elapsed > 55 && elapsed < 400 ? slowFrames + 1 : Math.max(0, slowFrames - 1)
      if (slowFrames > 24 && quality > 0.5) {
        quality = 0.5
        slowFrames = 0
        resize()
      }
      last = now
      driftX += (pointerX - driftX) * 0.05
      driftY += (pointerY - driftY) * 0.05
      draw(40 + now / 1000)
    }

    const sync = () => {
      cancelAnimationFrame(frame)
      frame = 0
      if (animated && onScreen && !document.hidden) frame = requestAnimationFrame(tick)
    }

    const visibility = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting
      sync()
    })
    if (animated) visibility.observe(canvas)
    document.addEventListener("visibilitychange", sync)

    const onPointer = (event: PointerEvent) => {
      pointerX = event.clientX / window.innerWidth - 0.5
      pointerY = event.clientY / window.innerHeight - 0.5
    }
    if (animated) window.addEventListener("pointermove", onPointer, { passive: true })

    const onLost = () => cancelAnimationFrame(frame)
    canvas.addEventListener("webglcontextlost", onLost)

    return () => {
      cancelAnimationFrame(frame)
      window.clearTimeout(resizeTimer)
      visibility.disconnect()
      document.removeEventListener("visibilitychange", sync)
      window.removeEventListener("resize", onResize)
      window.removeEventListener("pointermove", onPointer)
      canvas.removeEventListener("webglcontextlost", onLost)
    }
  }, [])

  return <canvas ref={canvasRef} className={s.heroField} aria-hidden="true" />
}
