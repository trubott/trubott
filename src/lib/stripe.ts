// Stripe support has been removed for the open-source version.
// Payment integrations are reserved for the production deployment.

export function getStripe() {
  throw new Error("Stripe is not available in the open-source version.");
}

export function isStripeConfigured(): boolean {
  return false;
}
