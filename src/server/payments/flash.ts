// Payment system has been removed for the open-source version.
// All payment integrations are reserved for production deployment.

export async function createFlashCheckoutSession() {
  throw new Error("Flash card payments are not available in the open-source version.");
}

export async function verifyFlashPaymentSession() {
  throw new Error("Flash card payments are not available in the open-source version.");
}

export async function wasFlashPaymentUsedForCard() {
  // Cards are free in open-source version
  return null;
}
