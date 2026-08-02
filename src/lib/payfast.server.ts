import { createHash } from "node:crypto";
import process from "node:process";

// PayFast integration (Duplum Technologies merchant account).
// Credentials come from the environment — never hardcode:
//   PAYFAST_MERCHANT_ID, PAYFAST_MERCHANT_KEY, PAYFAST_PASSPHRASE
//   PAYFAST_SANDBOX=true       -> sandbox.payfast.co.za (testing)
//   SITE_URL                   -> public origin for return/notify URLs
// Read env inside functions (Workers bind env at request time).

export function getPayfastConfig() {
  const sandbox = process.env.PAYFAST_SANDBOX === "true";
  const merchantId = process.env.PAYFAST_MERCHANT_ID;
  const merchantKey = process.env.PAYFAST_MERCHANT_KEY;
  const passphrase = process.env.PAYFAST_PASSPHRASE ?? "";
  if (!merchantId || !merchantKey) {
    throw new Error("PayFast is not configured (PAYFAST_MERCHANT_ID / PAYFAST_MERCHANT_KEY missing).");
  }
  return {
    merchantId,
    merchantKey,
    passphrase,
    sandbox,
    host: sandbox ? "sandbox.payfast.co.za" : "www.payfast.co.za",
    siteUrl: (process.env.SITE_URL ?? "https://lawexpert.co.za").replace(/\/$/, ""),
  };
}

/** PayFast URL encoding: encodeURIComponent, but spaces become '+'. */
function pfEncode(value: string): string {
  return encodeURIComponent(value.trim()).replace(/%20/g, "+");
}

/** MD5 signature over ordered non-empty params, with optional passphrase. */
export function pfSignature(pairs: Array<[string, string]>, passphrase: string): string {
  const base = pairs
    .filter(([, v]) => v !== "")
    .map(([k, v]) => `${k}=${pfEncode(v)}`)
    .join("&");
  const withPass = passphrase ? `${base}&passphrase=${pfEncode(passphrase)}` : base;
  return createHash("md5").update(withPass).digest("hex");
}

const FREQUENCY_CODES = { monthly: "3", annual: "6" } as const;

export type CheckoutInput = {
  subscriptionId: string;
  email: string;
  firstName?: string;
  itemName: string;
  /** First and recurring charge, in Rands. */
  amountRands: number;
  frequency: "monthly" | "annual";
  /** Public profile slug, so return/cancel URLs restore the claim page. */
  providerSlug: string;
  /** PayFast billing cycles: 0 = until cancelled, 1 = single-term seat. */
  cycles?: number;
  /** Return/cancel page (default: the claim page). Query params are appended. */
  returnPath?: string;
};

/**
 * Build the signed field set for a recurring-billing checkout. The client
 * renders these as a hidden form and POSTs to `action` (PayFast redirect flow).
 * Field order matters for the signature — keep it as documented by PayFast.
 */
export function buildSubscriptionCheckout(input: CheckoutInput): {
  action: string;
  fields: Record<string, string>;
} {
  const cfg = getPayfastConfig();
  const amount = input.amountRands.toFixed(2);
  const pairs: Array<[string, string]> = [
    ["merchant_id", cfg.merchantId],
    ["merchant_key", cfg.merchantKey],
    ["return_url", input.returnPath
      ? `${cfg.siteUrl}${input.returnPath}?payment=success`
      : `${cfg.siteUrl}/claim-profile?provider=${encodeURIComponent(input.providerSlug)}&payment=success`],
    ["cancel_url", input.returnPath
      ? `${cfg.siteUrl}${input.returnPath}?payment=cancelled`
      : `${cfg.siteUrl}/claim-profile?provider=${encodeURIComponent(input.providerSlug)}&payment=cancelled`],
    ["notify_url", `${cfg.siteUrl}/api/payfast-itn`],
    ["name_first", input.firstName ?? ""],
    ["email_address", input.email],
    ["m_payment_id", input.subscriptionId],
    ["amount", amount],
    ["item_name", input.itemName.slice(0, 100)],
    ["subscription_type", "1"],
    ["recurring_amount", amount],
    ["frequency", FREQUENCY_CODES[input.frequency]],
    ["cycles", String(input.cycles ?? 0)],
  ];
  const signature = pfSignature(pairs, cfg.passphrase);
  const fields = Object.fromEntries(pairs.filter(([, v]) => v !== ""));
  fields.signature = signature;
  return { action: `https://${cfg.host}/eng/process`, fields };
}

/**
 * Validate an ITN (Instant Transaction Notification) POST.
 * 1. Recompute the signature over the params in the order PayFast sent them.
 * 2. Confirm the notification with PayFast's validate endpoint.
 * Returns the parsed params on success; throws on any failure.
 */
export async function validateItn(rawBody: string): Promise<Record<string, string>> {
  const cfg = getPayfastConfig();

  // Preserve received order — the signature depends on it.
  const orderedPairs: Array<[string, string]> = rawBody
    .split("&")
    .filter(Boolean)
    .map((kv) => {
      const idx = kv.indexOf("=");
      const k = decodeURIComponent(kv.slice(0, idx));
      const v = decodeURIComponent(kv.slice(idx + 1).replace(/\+/g, " "));
      return [k, v];
    });

  const params = Object.fromEntries(orderedPairs);
  const received = params.signature;
  if (!received) throw new Error("ITN missing signature");

  const computed = pfSignature(
    orderedPairs.filter(([k]) => k !== "signature"),
    cfg.passphrase,
  );
  if (computed !== received) throw new Error("ITN signature mismatch");

  // Server-to-server confirmation with PayFast.
  const res = await fetch(`https://${cfg.host}/eng/query/validate`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: rawBody,
  });
  const text = (await res.text()).trim();
  if (text !== "VALID") throw new Error(`ITN postback validation failed: ${text || res.status}`);

  return params;
}

/**
 * Cancel a recurring subscription at PayFast via the merchant API.
 * Signature: md5 over all header/body params (plus passphrase), sorted
 * alphabetically and URL-encoded, per PayFast API docs.
 */
export async function cancelPayfastSubscription(token: string): Promise<void> {
  const cfg = getPayfastConfig();
  const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, "");
  const params: Array<[string, string]> = [
    ["merchant-id", cfg.merchantId],
    ["passphrase", cfg.passphrase],
    ["timestamp", timestamp],
    ["version", "v1"],
  ].filter(([, v]) => v !== "") as Array<[string, string]>;
  const signature = createHash("md5")
    .update(params.map(([k, v]) => `${k}=${pfEncode(v)}`).join("&"))
    .digest("hex");

  const url = `https://api.payfast.co.za/subscriptions/${encodeURIComponent(token)}/cancel${cfg.sandbox ? "?testing=true" : ""}`;
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      "merchant-id": cfg.merchantId,
      version: "v1",
      timestamp,
      signature,
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`PayFast cancel failed (${res.status}): ${body.slice(0, 200)}`);
  }
}
