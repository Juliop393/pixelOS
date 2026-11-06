"use client"

import { useEffect, useRef } from "react"
import s from "./Landing.module.css"

/**
 * Hero backdrop: a single line of type drifting through a pixel-shaped lens.
 *
 * Outside the lens the letters are out of focus, cut into horizontal slices and
 * almost monochrome. Crossing the lens they snap into focus, enlarged and bent by
 * the glass: an idea coming into focus. Everything else stays black.
 *
 * Plain WebGL with one text texture, no libraries. Capped frame rate, rendered below
 * display resolution, paused off screen. Reduced motion and Data Saver get one frame.
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

uniform sampler2D uType;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uPointer;
uniform float uLite;

const vec3 CREAM = vec3(0.96, 0.90, 0.83);
const vec3 TERRA = vec3(0.88, 0.47, 0.30);
const float STRIP = 8.0;

float hash(float n) {
  return fract(sin(n * 91.345) * 47453.5453);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  float aspect = uRes.x / uRes.y;
  vec2 p = vec2((uv.x - 0.5) * aspect, 1.0 - uv.y);
  float t = uTime;

  float line = mix(0.43, 0.646, uLite);
  float height = mix(0.152, 0.07, uLite);
  float travel = t * mix(0.0105, 0.0075, uLite);

  // The lens is a pixel: a rounded square that floats very slightly on its own.
  float size = mix(0.088, 0.036, uLite);
  vec2 lens = vec2(aspect * mix(0.302, 0.235, uLite), line)
    + vec2(0.006 * sin(t * 0.17), 0.005 * cos(t * 0.13)) + uPointer * 0.008;
  vec2 local = p - lens;
  vec2 a = abs(local) / size;
  float shape = pow(a.x * a.x * a.x * a.x + a.y * a.y * a.y * a.y, 0.25);
  float inside = 1.0 - smoothstep(0.985, 1.0, shape);

  // Outside: the type is out of focus, cut into drifting horizontal slices.
  float rowHeight = mix(6.0, 4.0, uLite);
  float row = floor(gl_FragCoord.y / rowHeight);
  float slit = fract(gl_FragCoord.y / rowHeight);
  float gap = smoothstep(0.02, 0.22, slit) * (1.0 - smoothstep(0.7, 0.96, slit));
  float slip = (hash(row) - 0.5) * 0.011 + 0.007 * sin(row * 0.19 + t * 0.35);
  float v = (p.y - line) / height + 0.5;
  float u = (p.x + slip) / (STRIP * height) + travel;

  float smear = 0.0;
  for (int i = -3; i <= 3; i++) {
    smear += texture2D(uType, vec2(u + float(i) * 0.0021, v), 1.0).a;
  }
  smear /= 7.0;
  float bandMask = step(0.0, v) * step(v, 1.0);

  // Fades out towards both edges of the screen and calms down behind the copy.
  float sides = 1.0 - smoothstep(0.36, 0.50, abs(uv.x - 0.5));
  float copyX = (uv.x - 0.47) / 0.25;
  float copy = exp(-copyX * copyX * copyX * copyX);
  float calm = mix(1.0 - 0.9 * copy, 0.62, uLite);
  float outside = smear * gap * bandMask * sides * calm * mix(0.72, 0.44, uLite);

  vec3 color = vec3(0.70, 0.66, 0.61) * outside;
  float alpha = outside;

  // Inside: the same letters snap into focus, enlarged and bent by the glass.
  float bend = 0.74 + 0.20 * shape * shape;
  vec2 seen = lens + local * bend;
  float v2 = (seen.y - line) / height + 0.5;
  float u2 = seen.x / (STRIP * height) + travel;
  float sharp = texture2D(uType, vec2(u2, v2), 0.0).a * step(0.0, v2) * step(v2, 1.0);
  float fringe = texture2D(uType, vec2(u2 + 0.0016, v2), 0.0).a * step(0.0, v2) * step(v2, 1.0);

  vec3 glass = CREAM * 0.78 * sharp + TERRA * max(fringe - sharp, 0.0) * 0.6;
  glass *= 0.86 + 0.14 * (1.0 - shape);
  color = mix(color, glass, inside);
  alpha = mix(alpha, 0.94, inside);

  // One thin edge of light on a single side: everything else stays black.
  vec2 dir = normalize(local + 0.0001);
  float catchLight = smoothstep(-0.15, 0.95, dot(dir, normalize(vec2(0.86, -0.5))));
  float edge = exp(-pow((shape - 1.0) / 0.012, 2.0)) * catchLight;
  float hairline = exp(-pow((shape - 1.0) / 0.006, 2.0)) * 0.13;
  float glow = exp(-max(shape - 1.0, 0.0) * 15.0) * catchLight * (1.0 - inside) * 0.13;
  vec3 light = mix(TERRA, CREAM, 0.72) * edge * 0.95 + CREAM * hairline + TERRA * glow;
  color += light;
  alpha = max(alpha, clamp(max(light.r, light.g), 0.0, 1.0));

  gl_FragColor = vec4(color, alpha);
}
`

const STRIP_WIDTH = 4096
const STRIP_HEIGHT = 512
const WORDS: { text: string; serif?: boolean }[] = [
  { text: "PixelFM" },
  { text: "imagen", serif: true },
  { text: "PixelFM" },
  { text: "video", serif: true },
]

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)
  if (!shader) return null
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null
}

/** Sets the words on one seamless strip that fills the texture edge to edge. */
function paintStrip(family: string) {
  const strip = document.createElement("canvas")
  strip.width = STRIP_WIDTH
  strip.height = STRIP_HEIGHT
  const ctx = strip.getContext("2d")
  if (!ctx) return null

  const fonts = { sans: `700 400px ${family}`, serif: "italic 400 430px Georgia, 'Times New Roman', serif" }
  const gap = 130
  const widths = WORDS.map(({ text, serif }) => {
    ctx.font = serif ? fonts.serif : fonts.sans
    return ctx.measureText(text).width
  })
  const natural = widths.reduce((sum, width) => sum + width + gap, 0)

  ctx.scale(STRIP_WIDTH / natural, 1)
  ctx.textBaseline = "alphabetic"
  let x = gap / 2
  WORDS.forEach(({ text, serif }, index) => {
    ctx.font = serif ? fonts.serif : fonts.sans
    ctx.fillStyle = "#ffffff"
    ctx.fillText(text, x, 408)
    x += widths[index] + gap
  })
  return strip
}

export default function HeroField() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const gl = canvas?.getContext("webgl", { alpha: true, antialias: false, depth: false, premultipliedAlpha: true, powerPreference: "low-power" })
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
    const animated = !connection?.saveData && !window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const frameTime = 1000 / (lite ? 24 : 30)
    gl.uniform1f(uLite, lite ? 1 : 0)

    let quality = lite ? 0.7 : 0.85
    let pointerX = 0
    let pointerY = 0
    let driftX = 0
    let driftY = 0
    let ready = false
    let disposed = false

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5) * quality
      canvas.width = Math.max(1, Math.round(canvas.clientWidth * ratio))
      canvas.height = Math.max(1, Math.round(canvas.clientHeight * ratio))
      gl.viewport(0, 0, canvas.width, canvas.height)
      gl.uniform2f(uRes, canvas.width, canvas.height)
    }

    const draw = (seconds: number) => {
      if (!ready) return
      gl.uniform1f(uTime, seconds)
      gl.uniform2f(uPointer, driftX, driftY)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }

    let frame = 0
    let last = 0
    let slowFrames = 0
    let onScreen = true

    const tick = (now: number) => {
      frame = requestAnimationFrame(tick)
      const elapsed = now - last
      if (elapsed < frameTime) return
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
      draw(60 + now / 1000)
    }

    const sync = () => {
      cancelAnimationFrame(frame)
      frame = 0
      if (ready && animated && onScreen && !document.hidden) frame = requestAnimationFrame(tick)
    }

    const family = getComputedStyle(canvas).fontFamily
    void (async () => {
      try {
        await document.fonts.load(`700 400px ${family}`)
      } catch { /* The strip falls back to the next font in the stack. */ }
      if (disposed) return
      const strip = paintStrip(family)
      if (!strip) return

      gl.bindTexture(gl.TEXTURE_2D, gl.createTexture())
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, strip)
      gl.generateMipmap(gl.TEXTURE_2D)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

      ready = true
      resize()
      draw(60)
      canvas.dataset.ready = ""
      sync()
    })()

    let resizeTimer = 0
    const onResize = () => {
      window.clearTimeout(resizeTimer)
      resizeTimer = window.setTimeout(() => {
        resize()
        if (!animated) draw(60)
      }, 150)
    }
    window.addEventListener("resize", onResize)

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
    if (animated && !lite) window.addEventListener("pointermove", onPointer, { passive: true })

    const onLost = () => cancelAnimationFrame(frame)
    canvas.addEventListener("webglcontextlost", onLost)

    return () => {
      disposed = true
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
