import PricingButton from "@/components/PricingButton"
import { pricingPlans } from "@/lib/pricing-plans"

export default function PricingPlans() {
  return (
    <div className="pricingGrid !gap-8">
      {pricingPlans.map((plan) => (
        <article
          key={plan.name}
          className={`priceCard ${plan.highlighted ? "featured" : ""}`}
        >
          {plan.highlighted && (
            <span className="popular">Más popular</span>
          )}

          <div>
            <h3>{plan.name}</h3>
          </div>

          <div className="price">
            <span className="priceOld">{plan.originalPrice}</span>
            <strong>{plan.price}</strong>
            <span>USD<br />/ mes</span>
          </div>

          <div className="flex items-center gap-2 mt-2 mb-4">
            <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#D97757]/20 text-[#D97757] border border-[#D97757]/30">
              Precio MVP
            </span>
          </div>

          <p className="text-[#D97757] text-xs font-semibold mb-1">{plan.credits}</p>

          <div className="priceDivider" />

          <ul>
            {plan.features.map((feature) => (
              <li key={feature}>
                <svg className="w-4 h-4 text-[#D97757] flex-shrink-0" width={16} height={16} aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {feature}
              </li>
            ))}
          </ul>

          <PricingButton
            priceId={plan.priceId}
            planName={plan.name}
            highlighted={plan.highlighted}
          />
        </article>
      ))}
    </div>
  )
}