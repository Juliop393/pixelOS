import "server-only"
import {
  BillingInterval,
  CREDIT_COST,
  CREDIT_PACK_RULES,
  CREDIT_PACKS,
  FORMATS,
  FREE_SIGNUP_CREDITS,
  SUBSCRIPTION_PLANS,
  VIDEO_MODELS,
  formatPrice,
} from "@/lib/pricing-plans"

/*
 * What PixelIA knows about PixelFM. Every price, credit amount and rule comes from the
 * commercial catalog (pricing-plans.ts), so the assistant can never quote a figure the
 * pricing page does not show. Policies (cancellation, refunds) mirror /terms and /refunds.
 */

const intervalLabel: Record<BillingInterval, string> = { monthly: "mes", annual: "año" }

const plans = SUBSCRIPTION_PLANS.map((plan) => {
  const credits = plan.rollover
    ? "los créditos no usados pasan al mes siguiente, hasta una asignación mensual adicional"
    : "los créditos mensuales vencen al renovar, sin acumulación"
  return `- ${plan.name}: ${formatPrice(plan.monthlyPrice)}/${intervalLabel.monthly} o ${formatPrice(plan.annualPrice)}/${intervalLabel.annual}; ${plan.monthlyCredits} créditos al mes; ${credits}. ${plan.audience}`
}).join("\n")

const packs = CREDIT_PACKS.map((pack) => `${pack.credits} créditos por ${formatPrice(pack.price)}`).join(", ")

const videoTiers = VIDEO_MODELS.map((model) => `${model.label}: ${model.credits} créditos por video de ${model.durationSeconds} s (${model.detail.toLowerCase()})`).join("; ")

export const PIXELFM_KNOWLEDGE = `PRODUCTO
PixelFM crea anuncios con IA para redes sociales (Meta Ads, Stories, Reels).
- Imágenes: el usuario sube una imagen de referencia de su producto, describe la idea y elige un enfoque; PixelFM genera el creativo. Formatos: ${FORMATS}.
- Videos: a partir de una imagen se genera un clip de ${VIDEO_MODELS[0].durationSeconds} segundos. ${videoTiers}.
- Modo Simple: subir imagen, contar la idea, elegir enfoque y generar. Modo Pro: más control (producto, ángulo de venta, diseño y formato en imágenes; escenas y storyboard en video).
- Mis creativos (biblioteca): ahí quedan las imágenes y videos generados, para verlos y descargarlos.
- PixelIA (tú) ayuda con ideas y dudas; puede recomendar ángulo, estilo y formato, y en el editor de imágenes el usuario puede aplicar esa recomendación con un botón. Tú no generas imágenes ni videos desde el chat.

CRÉDITOS
- Imagen: ${CREDIT_COST.image} crédito. Video Rápido: ${CREDIT_COST.video}. Video Premium: ${CREDIT_COST.premiumVideo}. Es un solo saldo para imágenes y videos.
- Al registrarse: ${FREE_SIGNUP_CREDITS} créditos gratis una sola vez, sin tarjeta; no se renuevan.
- Si una generación falla, el sistema devuelve los créditos de esa generación.

PLANES (precios en USD)
${plans}
- Anual: se paga una vez al año y los créditos se entregan mes a mes.
- Packs de créditos extra: ${packs}. Solo para suscriptores; duran ${CREDIT_PACK_RULES.validityMonths} meses; se acumulan; no se pierden si cancelas.

FACTURACIÓN Y CUENTA
- Ver o cambiar de plan y comprar packs: página Planes (/dashboard/pricing).
- Cancelar, cambiar el método de pago o ver facturas: Configuración (/dashboard/configuracion) → "Gestionar suscripción", que abre el portal de pagos de Stripe.
- Al cancelar se conserva el acceso y los créditos hasta el fin del periodo pagado; no hay penalidad.
- Reembolsos: no son automáticos. Se consideran dentro de los 7 días de la compra por error técnico que impidió usar el servicio, cobro duplicado o caída de más de 48 horas. Detalles en /refunds; se solicitan escribiendo a team@pixelfm.com.
- Soporte: team@pixelfm.com.`
