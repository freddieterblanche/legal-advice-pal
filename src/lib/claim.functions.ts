import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "../integrations/supabase/auth-middleware";

const TIER_SLUGS = ["basic", "standard", "silver", "gold", "elite"] as const;

// A signed-in professional requests to claim a seeded (unclaimed) profile.
export const submitClaimRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        service_provider_id: z.string().uuid(),
        phone: z.string().trim().max(40).optional(),
        message: z.string().trim().max(1000).optional(),
        requested_tier: z.enum(TIER_SLUGS).default("basic"),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("../integrations/supabase/client.server");

    const { data: provider, error: pErr } = await supabaseAdmin
      .from("service_providers")
      .select("id, first_name, last_name, profile_id, is_claimed")
      .eq("id", data.service_provider_id)
      .maybeSingle();
    if (pErr) throw pErr;
    if (!provider) throw new Error("Profile not found.");
    if (provider.profile_id || provider.is_claimed) {
      throw new Error("This profile has already been claimed.");
    }

    const { data: userData, error: uErr } = await supabaseAdmin.auth.admin.getUserById(context.userId);
    if (uErr) throw uErr;
    const email = userData.user.email?.toLowerCase();
    if (!email) throw new Error("Your account has no email address.");

    const { error: insErr } = await supabaseAdmin.from("claim_requests").insert({
      service_provider_id: data.service_provider_id,
      user_id: context.userId,
      email,
      phone: data.phone || null,
      message: data.message || null,
      requested_tier: data.requested_tier,
    });
    if (insErr) {
      if (insErr.code === "23505") {
        throw new Error("A claim for this profile is already under review.");
      }
      throw insErr;
    }
    return { ok: true as const };
  });

// The signed-in user's claim request for a given provider (drives page state).
export const getMyClaimRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ service_provider_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("../integrations/supabase/client.server");
    const { data: req, error } = await supabaseAdmin
      .from("claim_requests")
      .select("id, status, requested_tier, created_at, decision_note")
      .eq("service_provider_id", data.service_provider_id)
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return { request: req ?? null };
  });

async function requirePlatformAdmin(userId: string) {
  const { supabaseAdmin } = await import("../integrations/supabase/client.server");
  const { data: caller } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  if (caller?.role !== "platform_admin") throw new Error("Not authorised.");
  return supabaseAdmin;
}

// Admin: list claim requests (pending first, then recent decisions).
export const adminListClaimRequests = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabaseAdmin = await requirePlatformAdmin(context.userId);
    const { data, error } = await supabaseAdmin
      .from("claim_requests")
      .select(
        "id, email, phone, message, requested_tier, status, decision_note, created_at, decided_at, service_providers(id, slug, first_name, last_name, provider_type, designation, city, province, email, firms(name))",
      )
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    return { requests: data ?? [] };
  });

// Admin: approve or reject. Operational rule for Phase 1: send the payment
// link when the request arrives and approve once payment clears — approval
// hands over ownership and edit rights in one step. (Phase 2 automates this
// via the PayFast ITN webhook.) Public listing status is left untouched so
// the profile never disappears from the directory mid-claim.
export const adminDecideClaimRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid(),
        decision: z.enum(["approved", "rejected"]),
        note: z.string().trim().max(500).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const supabaseAdmin = await requirePlatformAdmin(context.userId);

    const { data: req, error: rErr } = await supabaseAdmin
      .from("claim_requests")
      .select("id, service_provider_id, user_id, email, requested_tier, status")
      .eq("id", data.id)
      .maybeSingle();
    if (rErr) throw rErr;
    if (!req) throw new Error("Request not found.");
    if (req.status !== "pending") throw new Error("This request has already been decided.");

    if (data.decision === "approved") {
      const { data: provider, error: pErr } = await supabaseAdmin
        .from("service_providers")
        .select("id, profile_id, is_claimed")
        .eq("id", req.service_provider_id)
        .maybeSingle();
      if (pErr) throw pErr;
      if (!provider) throw new Error("Profile no longer exists.");
      if (provider.profile_id || provider.is_claimed) {
        throw new Error("Profile was claimed by someone else in the meantime.");
      }

      const { error: updErr } = await supabaseAdmin
        .from("service_providers")
        .update({
          profile_id: req.user_id,
          is_claimed: true,
          listing_tier: req.requested_tier,
        })
        .eq("id", req.service_provider_id);
      if (updErr) throw updErr;

      await supabaseAdmin
        .from("profiles")
        .upsert({ id: req.user_id, email: req.email, role: "lawyer" }, { onConflict: "id" });
    }

    const { error: decErr } = await supabaseAdmin
      .from("claim_requests")
      .update({
        status: data.decision,
        decision_note: data.note || null,
        decided_by: context.userId,
        decided_at: new Date().toISOString(),
      })
      .eq("id", req.id);
    if (decErr) throw decErr;

    return { ok: true as const };
  });
