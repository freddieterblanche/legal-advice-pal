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
        phone: z.string().trim().min(7, "Phone number required").max(40),
        message: z.string().trim().max(1000).optional(),
        requested_tier: z.enum(TIER_SLUGS).default("basic"),
        selfie_path: z.string().min(1, "Selfie required").max(500),
        id_doc_path: z.string().min(1, "ID document required").max(500),
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

    // Verification docs must live in the claimant's own folder of the
    // private bucket — never accept a path pointing at someone else's files.
    for (const path of [data.selfie_path, data.id_doc_path]) {
      if (!path.startsWith(`${context.userId}/`) || path.includes("..")) {
        throw new Error("Invalid verification document reference.");
      }
    }

    const { error: insErr } = await supabaseAdmin.from("claim_requests").insert({
      service_provider_id: data.service_provider_id,
      user_id: context.userId,
      email,
      phone: data.phone,
      message: data.message || null,
      requested_tier: data.requested_tier,
      selfie_path: data.selfie_path,
      id_doc_path: data.id_doc_path,
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
        "id, email, phone, message, requested_tier, status, decision_note, created_at, decided_at, selfie_path, id_doc_path, service_providers(id, slug, first_name, last_name, provider_type, designation, city, province, email, firms(name))",
      )
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;

    // Short-lived signed URLs so admins can review the private KYC documents.
    const requests = await Promise.all(
      (data ?? []).map(async (r) => {
        const sign = async (path: string | null) => {
          if (!path) return null;
          const { data: signed } = await supabaseAdmin.storage
            .from("verification-docs")
            .createSignedUrl(path, 3600);
          return signed?.signedUrl ?? null;
        };
        return {
          ...r,
          selfie_url: await sign(r.selfie_path),
          id_doc_url: await sign(r.id_doc_path),
        };
      }),
    );
    return { requests };
  });

// Admin: verify or reject. Verification confirms identity only — the
// claimant then pays via PayFast, and the ITN webhook performs the actual
// handover (ownership + tier) on the first COMPLETE payment. Ownership never
// transfers unpaid, and the public listing never disappears mid-claim.
export const adminDecideClaimRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid(),
        decision: z.enum(["verified", "rejected"]),
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

    if (data.decision === "verified") {
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

    // KYC documents have served their purpose — delete them (POPIA hygiene).
    const { data: fullReq } = await supabaseAdmin
      .from("claim_requests")
      .select("selfie_path, id_doc_path")
      .eq("id", req.id)
      .maybeSingle();
    const paths = [fullReq?.selfie_path, fullReq?.id_doc_path].filter((p): p is string => !!p);
    if (paths.length) {
      await supabaseAdmin.storage.from("verification-docs").remove(paths);
      await supabaseAdmin
        .from("claim_requests")
        .update({ selfie_path: null, id_doc_path: null })
        .eq("id", req.id);
    }

    return { ok: true as const };
  });
