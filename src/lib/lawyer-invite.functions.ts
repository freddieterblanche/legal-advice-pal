import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "../integrations/supabase/auth-middleware";

// Firm admin / platform admin creates an invite for a lawyer.
// Returns the token + invite URL. (Email delivery uses Lovable Email when configured.)
export const createLawyerInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      lawyer_id: z.string().uuid(),
      email: z.string().trim().email().max(255),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("../integrations/supabase/client.server");

    // Verify the caller controls this lawyer's firm OR is platform admin
    const { data: caller } = await supabaseAdmin
      .from("profiles")
      .select("role, firm_id")
      .eq("id", context.userId)
      .maybeSingle();

    const { data: lawyer, error: lawyerErr } = await supabaseAdmin
      .from("lawyers")
      .select("id, firm_id, first_name, last_name, profile_id")
      .eq("id", data.lawyer_id)
      .maybeSingle();
    if (lawyerErr) throw lawyerErr;
    if (!lawyer) throw new Error("Lawyer not found");

    const isAuthorised =
      caller?.role === "platform_admin" ||
      (caller?.role === "firm_admin" && caller.firm_id === lawyer.firm_id);
    if (!isAuthorised) throw new Error("Not authorised to invite this lawyer");

    if (lawyer.profile_id) {
      throw new Error("This lawyer has already claimed their profile.");
    }

    // Upsert invite (one per lawyer)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: invite, error: inviteErr } = await supabaseAdmin
      .from("lawyer_invites")
      .upsert(
        {
          lawyer_id: data.lawyer_id,
          email: data.email.toLowerCase(),
          invited_by: context.userId,
          sent_at: new Date().toISOString(),
          accepted_at: null,
          expires_at: expiresAt,
          token: crypto.randomUUID(),
        },
        { onConflict: "lawyer_id" },
      )
      .select("token, email, expires_at")
      .single();
    if (inviteErr) throw inviteErr;

    return {
      token: invite.token,
      email: invite.email,
      expires_at: invite.expires_at,
      lawyer_name: `${lawyer.first_name ?? ""} ${lawyer.last_name ?? ""}`.trim(),
    };
  });

// Public lookup: validate a token and return basic info to render the claim page.
export const lookupLawyerInvite = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ token: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("../integrations/supabase/client.server");
    const { data: invite } = await supabaseAdmin
      .from("lawyer_invites")
      .select("lawyer_id, email, accepted_at, expires_at, lawyers(first_name, last_name, firm_id, firms(name))")
      .eq("token", data.token)
      .maybeSingle();
    if (!invite) return { ok: false as const, reason: "not_found" as const };
    if (invite.accepted_at) return { ok: false as const, reason: "already_used" as const };
    if (new Date(invite.expires_at).getTime() < Date.now())
      return { ok: false as const, reason: "expired" as const };

    const law = invite.lawyers as unknown as
      | { first_name: string | null; last_name: string | null; firms: { name: string | null } | null }
      | null;
    return {
      ok: true as const,
      email: invite.email,
      lawyer_name: law ? `${law.first_name ?? ""} ${law.last_name ?? ""}`.trim() : "",
      firm_name: law?.firms?.name ?? "",
    };
  });

// Authenticated user accepts an invite: links the lawyer record to their profile.
export const acceptLawyerInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ token: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("../integrations/supabase/client.server");

    const { data: invite, error: invErr } = await supabaseAdmin
      .from("lawyer_invites")
      .select("id, lawyer_id, email, accepted_at, expires_at")
      .eq("token", data.token)
      .maybeSingle();
    if (invErr) throw invErr;
    if (!invite) throw new Error("Invite not found");
    if (invite.accepted_at) throw new Error("This invite has already been used.");
    if (new Date(invite.expires_at).getTime() < Date.now()) throw new Error("This invite has expired.");

    // Verify the email on the user's auth account matches (case-insensitive)
    const { data: userData, error: uErr } = await supabaseAdmin.auth.admin.getUserById(context.userId);
    if (uErr) throw uErr;
    const userEmail = userData.user.email?.toLowerCase() ?? "";
    if (userEmail !== invite.email.toLowerCase()) {
      throw new Error(`This invite was sent to ${invite.email}. Please sign in with that email.`);
    }

    // Link lawyer to this profile
    const { data: lawyer, error: lErr } = await supabaseAdmin
      .from("lawyers")
      .update({ profile_id: context.userId, is_claimed: true })
      .eq("id", invite.lawyer_id)
      .select("slug")
      .single();
    if (lErr) throw lErr;

    // Ensure the profile exists and bump role to 'lawyer' if it's currently 'visitor'
    await supabaseAdmin
      .from("profiles")
      .upsert(
        { id: context.userId, email: userEmail, role: "lawyer" },
        { onConflict: "id" },
      );

    // Mark invite accepted
    await supabaseAdmin
      .from("lawyer_invites")
      .update({ accepted_at: new Date().toISOString() })
      .eq("id", invite.id);

    return { ok: true as const, slug: lawyer.slug };
  });
