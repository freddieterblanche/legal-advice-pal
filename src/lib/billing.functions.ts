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

// ---------------------------------------------------------------------------
// Self-serve subscription management for claimed-profile owners (/my-listing)
// ---------------------------------------------------------------------------

// The signed-in user's owned listing plus its live subscription state.
export const getMyListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("../integrations/supabase/client.server");

    const { data: provider, error: pErr } = await supabaseAdmin
      .from("service_providers")
      .select("id, slug, first_name, last_name, designation, provider_type, city, province, listing_tier, is_claimed, status, firms(name)")
      .eq("profile_id", context.userId)
      .maybeSingle();
    if (pErr) throw pErr;
    if (!provider) return { provider: null, subscription: null };

    const { data: sub } = await supabaseAdmin
      .from("subscriptions")
      .select("id, tier, frequency, amount_rands, status, activated_at, current_period_end")
      .eq("service_provider_id", provider.id)
      .in("status", ["active", "pending"])
      .order("status", { ascending: true }) // 'active' before 'pending'
      .limit(1)
      .maybeSingle();

    return { provider, subscription: sub ?? null };
  });

// Start checkout for a tier change on the caller's own listing. The webhook
// activates the new plan and retires the old subscription on first payment.
export const createTierChangeCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        tier: z.enum(["basic", "standard", "silver", "gold", "elite"]),
        frequency: z.enum(["monthly", "annual"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("../integrations/supabase/client.server");
    const { buildSubscriptionCheckout } = await import("./payfast.server");

    const { data: provider, error: pErr } = await supabaseAdmin
      .from("service_providers")
      .select("id, slug, first_name, last_name")
      .eq("profile_id", context.userId)
      .maybeSingle();
    if (pErr) throw pErr;
    if (!provider) throw new Error("No listing is linked to your account.");

    const { data: userData, error: uErr } = await supabaseAdmin.auth.admin.getUserById(context.userId);
    if (uErr) throw uErr;
    const email = userData.user.email;
    if (!email) throw new Error("Your account has no email address.");

    const tier = TIER_BY_SLUG[data.tier];
    const frequency = tier.annualOnly ? "annual" : data.frequency;
    const amount = frequency === "annual" ? annualRands(tier) : tier.monthlyRands;

    // Reuse an abandoned pending tier-change subscription if one exists.
    const { data: existing } = await supabaseAdmin
      .from("subscriptions")
      .select("id")
      .eq("service_provider_id", provider.id)
      .is("claim_request_id", null)
      .eq("status", "pending")
      .maybeSingle();

    let subscriptionId = existing?.id;
    if (subscriptionId) {
      await supabaseAdmin
        .from("subscriptions")
        .update({ tier: tier.slug, frequency, amount_rands: amount, user_id: context.userId })
        .eq("id", subscriptionId);
    } else {
      const { data: sub, error: sErr } = await supabaseAdmin
        .from("subscriptions")
        .insert({
          service_provider_id: provider.id,
          user_id: context.userId,
          tier: tier.slug,
          frequency,
          amount_rands: amount,
        })
        .select("id")
        .single();
      if (sErr) throw sErr;
      subscriptionId = sub.id;
    }

    return buildSubscriptionCheckout({
      subscriptionId: subscriptionId!,
      email,
      firstName: provider.first_name,
      itemName: `Lawexpert ${tier.name} listing — ${provider.first_name} ${provider.last_name}`,
      amountRands: amount,
      frequency,
      providerSlug: provider.slug ?? "",
      cycles: tier.annualOnly ? 1 : 0,
      returnPath: "/my-listing",
    });
  });

// Cancel the caller's active subscription (billing stops; the listing stays
// in the directory, and paid features run until the end of the paid period).
export const cancelMySubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("../integrations/supabase/client.server");
    const { cancelPayfastSubscription } = await import("./payfast.server");

    const { data: provider } = await supabaseAdmin
      .from("service_providers")
      .select("id")
      .eq("profile_id", context.userId)
      .maybeSingle();
    if (!provider) throw new Error("No listing is linked to your account.");

    const { data: sub } = await supabaseAdmin
      .from("subscriptions")
      .select("id, payfast_token, status")
      .eq("service_provider_id", provider.id)
      .eq("status", "active")
      .maybeSingle();
    if (!sub) throw new Error("No active subscription to cancel.");

    if (sub.payfast_token) {
      try {
        await cancelPayfastSubscription(sub.payfast_token);
      } catch (err) {
        // Don't strand the user: record intent locally and flag for follow-up.
        console.error("[billing] PayFast cancel failed for sub", sub.id, err);
      }
    }
    await supabaseAdmin.from("subscriptions").update({ status: "cancelled" }).eq("id", sub.id);
    return { ok: true as const };
  });
