import Stripe from "stripe";

export { TOKEN_PACKS } from "./pricing-data";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = (process.env.STRIPE_SECRET_KEY || "").trim();
    _stripe = new Stripe(key, {
      httpClient: Stripe.createFetchHttpClient(),
    });
  }
  return _stripe;
}
