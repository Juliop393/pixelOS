import SubscriptionSuccessView from "./SubscriptionSuccessView"

/*
 * Landing page after Stripe Checkout (success_url). The URL only carries the
 * Checkout Session ID; what the page shows is decided by /api/stripe/checkout/verify.
 */
export default async function SubscriptionSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string | string[] }>
}) {
  const { session_id: sessionId } = await searchParams
  return <SubscriptionSuccessView sessionId={typeof sessionId === "string" ? sessionId : null} />
}
