import PricingButton from "@/components/PricingButton"
import { pricingPlans } from "@/lib/pricing-plans"

export default function PricingPlans() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
      {pricingPlans.map((plan) => (
        <div
          key={plan.name}
          className={`relative rounded-2xl border p-8 flex flex-col transition-all duration-300 backdrop-blur-md ${
            plan.highlighted
              ? "border-[#D97757] bg-[#2A2826]/60 shadow-lg shadow-[#D97757]/20"
              : "border-[#3A3833]/50 bg-[#2A2826]/40 hover:border-[#D97757]/40"
          }`}
        >
          {plan.highlighted && (
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#D97757] text-white text-xs font-semibold px-4 py-1.5 rounded-full uppercase tracking-wider">
              Más popular
            </span>
          )}

          <div className="mb-8">
            <h3 className="text-lg font-bold text-[#E8E6E1] mb-2">{plan.name}</h3>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[#9A9893] text-lg line-through">{plan.originalPrice}</span>
              <span className="inline-block px-2 py-0.5 rounded-md text-xs font-semibold bg-[#D97757]/20 text-[#D97757] border border-[#D97757]/30">
                Precio MVP
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-5xl font-bold text-[#E8E6E1]">{plan.price}</span>
              <span className="text-[#9A9893] text-sm">{plan.period}</span>
            </div>
            <p className="text-[#D97757] text-sm font-semibold mt-3">{plan.credits}</p>
          </div>

          <ul className="space-y-3 mb-8 flex-1">
            {plan.features.map((feature) => (
              <li key={feature} className="flex items-center gap-3 text-sm text-[#9A9893]">
                <svg className="w-4 h-4 text-[#D97757] flex-shrink-0" width={16} height={16} aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {feature}
              </li>
            ))}
          </ul>

          <PricingButton
            variantId={plan.variantId}
            planName={plan.name}
            highlighted={plan.highlighted}
          />
        </div>
      ))}
    </div>
  )
}
