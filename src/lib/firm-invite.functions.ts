import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "../integrations/supabase/auth-middleware";

// Platform admin invites someone to administer a firm. Returns the invite URL
// (email delivery can be wired to Lovable Email later — copy the link for now).
export const createFirmAdminInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      firm_id: z.string().uuid(),
      email: z.string().trim().email().max(255),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("../integrations/supabase/client.server");

    const { data: caller } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", context.userId)
      .maybeSingle();
    if (caller?.role !== "platform_admin") throw new Error("Not authorised.");

    const { data: firm, error: fErr } = await supabaseAdmin
      .from("firms")
      .select("id, name")
      .eq("id", data.firm_id)
      .maybeSingle();
    if (fErr) throw fErr;
    if (!firm) throw new Error("Firm not found.");

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: invite, error: iErr } = await supabaseAdmin
      .from("firm_invites")
      .upsert(
        {
          firm_id: data.firm_id,
          email: data.email.toLowerCase(),
          invited_by: context.userId,
          sent_at: new Date().toISOString(),
          accepted_at: null,
          expires_at: expiresAt,
          token: crypto.randomUUID(),
        },
        { onConflict: "firm_id,email" },
      )
      .select("token, email, expires_at")
      .single();
    if (iErr) throw iErr;

    return {
      token: invite.token,
      email: invite.email,
      expires_at: invite.expires_at,
      firm_name: firm.name,
      url: `/claim-firm?token=${invite.token}`,
    };
  });

// Public lookup: validate a token to render the claim-firm page.
export const lookupFirmInvite = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ token: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("../integrations/supabase/client.server");
    const { data: invite } = await supabaseAdmin
      .from("firm_invites")
      .select("firm_id, email, accepted_at, expires_at, firms(name)")
      .eq("token", data.token)
      .maybeSingle();
    if (!invite) return { ok: false as const, reason: "not_found" as const };
    if (invite.accepted_at) return { ok: false as const, reason: "already_used" as const };
    if (new Date(invite.expires_at).getTime() < Date.now())
      return { ok: false as const, reason: "expired" as const };
    const firm = invite.firms as unknown as { name: string | null } | null;
    return { ok: true as const, email: invite.email, firm_name: firm?.name ?? "" };
  });

// Authenticated user accepts: becomes firm_admin of the invited firm.
export const acceptFirmInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ token: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("../integrations/supabase/client.server");

    const { data: invite, error: iErr } = await supabaseAdmin
      .from("firm_invites")
      .select("id, firm_id, email, accepted_at, expires_at")
      .eq("token", data.token)
      .maybeSingle();
    if (iErr) throw iErr;
    if (!invite) throw new Error("Invite not found.");
    if (invite.accepted_at) throw new Error("This invite has already been used.");
    if (new Date(invite.expires_at).getTime() < Date.now()) throw new Error("This invite has expired.");

    const { data: userData, error: uErr } = await supabaseAdmin.auth.admin.getUserById(context.userId);
    if (uErr) throw uErr;
    const userEmail = userData.user.email?.toLowerCase() ?? "";
    if (userEmail !== invite.email.toLowerCase()) {
      throw new Error(`This invite was sent to ${invite.email}. Please sign in with that email.`);
    }

    // Don't downgrade a platform admin; everyone else becomes firm_admin.
    const { data: existing } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", context.userId)
      .maybeSingle();
    if (existing?.role !== "platform_admin") {
      await supabaseAdmin
        .from("profiles")
        .upsert(
          { id: context.userId, email: userEmail, role: "firm_admin", firm_id: invite.firm_id },
          { onConflict: "id" },
        );
    }

    await supabaseAdmin
      .from("firm_invites")
      .update({ accepted_at: new Date().toISOString() })
      .eq("id", invite.id);

    return { ok: true as const };
  });
