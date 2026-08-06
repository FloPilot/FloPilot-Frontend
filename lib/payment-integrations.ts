export type PaymentProviderId = "stripe";

export type PaymentIntegrationStatus =
  | "connected"
  | "disconnected"
  | "pending"
  | "error";

export type PaymentIntegration = {
  provider: PaymentProviderId;
  name: string;
  status: PaymentIntegrationStatus;
  configured: boolean;
  mode?: "test" | "live";
  platformFeePercent?: number;
  accountId?: string | null;
  businessName?: string | null;
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
  detailsSubmitted?: boolean;
  connectedAt?: string | null;
  connectedBy?: string | null;
  lastVerifiedAt?: string | null;
  lastError?: string | null;
};

export function isStripeConnected(integration?: PaymentIntegration | null) {
  return Boolean(
    integration &&
      integration.provider === "stripe" &&
      integration.status === "connected" &&
      integration.chargesEnabled
  );
}

export function stripeStatusLabel(integration?: PaymentIntegration | null) {
  if (!integration || integration.status === "disconnected") {
    return "Not connected";
  }
  if (integration.status === "error") return "Needs attention";
  if (integration.status === "pending" || !integration.chargesEnabled) {
    return "Finish setup";
  }
  return "Connected";
}
