import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "../integrations/supabase/auth-middleware";
import { TIER_BY_SLUG, annualRands, type TierSlug } from "./tiers";

// Start PayFast checkout for a *verified* claim: creates a pending
// subscription and returns the signed form fields for the redirect.
export const createClaimCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        claim_request_id: z.string().uuid(),
        frequency: z.enum(["monthly", "annual"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("../integrations/supabase/client.server");
    const { buildSubscriptionCheckout } = await import("./payfast.server");

    const { data: req, error: rErr } = await supabaseAdmin
      .from("claim_requests")
      .select("id, user_id, email, status, requested_tier, service_provider_id, service_providers(slug, first_name, last_name)")
      .eq("id", data.claim_request_id)
      .maybeSingle();
    if (rErr) throw rErr;
    if (!req || req.user_id !== context.userId) throw new Error("Claim not found.");
    if (req.status !== "verified") {
      throw new Error(
        req.status === "pending"
          ? "Your claim is still under review — we'll email you when it's verified."
          : "This claim is not awaiting payment.",
      );
    }

    const tier = TIER_BY_SLUG[req.requested_tier as TierSlug];
    if (!tier) throw new Error("Unknown tier on this claim.");
    // Elite is a fixed 12-month seat: annual only, one charge per term, so
    // every renewal goes back through checkout at the then-current price.
    const frequency = tier.annualOnly ? "annual" : data.frequency;
    const amount = frequency === "annual" ? annualRands(tier) : tier.monthlyRands;

    // Reuse an abandoned pending subscription for this claim if one exists.
    const { data: existing } = await supabaseAdmin
      .from("subscriptions")
      .select("id, status")
      .eq("claim_request_id", req.id)
      .eq("status", "pending")
      .maybeSingle();

    let subscriptionId = existing?.id;
    if (subscriptionId) {
      await supabaseAdmin
        .from("subscriptions")
        .update({ frequency, amount_rands: amount, tier: tier.slug })
        .eq("id", subscriptionId);
    } else {
      const { data: sub, error: sErr } = await supabaseAdmin
        .from("subscriptions")
        .insert({
          service_provider_id: req.service_provider_id,
          user_id: req.user_id,
          claim_request_id: req.id,
          tier: tier.slug,
          frequency,
          amount_rands: amount,
        })
        .select("id")
        .single();
      if (sErr) throw sErr;
      subscriptionId = sub.id;
    }

    const prov = req.service_providers as unknown as { slug: string; first_name: string; last_name: string } | null;
    const name = prov ? `${prov.first_name} ${prov.last_name}` : "listing";

    return buildSubscriptionCheckout({
      subscriptionId: subscriptionId!,
      email: req.email,
      firstName: prov?.first_name,
      itemName: `Lawexpert ${tier.name} listing — ${name}`,
      amountRands: amount,
      frequency,
      providerSlug: prov?.slug ?? "",
      cycles: tier.annualOnly ? 1 : 0,
    });
  });
