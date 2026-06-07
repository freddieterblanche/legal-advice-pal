import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "../integrations/supabase/auth-middleware";
import { PROVINCES, slugify } from "./constants";

const provinceEnum = z.enum(PROVINCES as unknown as [string, ...string[]]);

// ---------- FIRM ----------
const registerFirmSchema = z.object({
  firm: z.object({
    name: z.string().trim().min(2).max(120),
    registration_number: z.string().trim().max(60).optional(),
    province: provinceEnum,
    city: z.string().trim().min(1).max(80),
    website: z.string().trim().max(255).optional(),
    phone: z.string().trim().max(30).optional(),
    address: z.string().trim().max(255).optional(),
  }),
  admin: z
    .object({
      first_name: z.string().trim().min(1).max(80).optional(),
      last_name: z.string().trim().min(1).max(80).optional(),
    })
    .optional(),
});

async function uniqueSlug(table: "firms" | "lawyers" | "expert_witnesses" | "chambers", base: string) {
  const { supabaseAdmin } = await import("../integrations/supabase/client.server");
  let slug = base;
  const { data: clash } = await supabaseAdmin.from(table).select("id").eq("slug", slug).maybeSingle();
  if (clash) slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
  return slug;
}

export const registerFirmForCurrentUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => registerFirmSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("../integrations/supabase/client.server");
    const slug = await uniqueSlug("firms", slugify(data.firm.name));

    const { data: existingProfile, error: profileReadError } = await supabaseAdmin
      .from("profiles").select("firm_id").eq("id", context.userId).maybeSingle();
    if (profileReadError) throw profileReadError;
    if (existingProfile?.firm_id) throw new Error("Your account is already linked to a firm.");

    const { data: firmRow, error: firmError } = await supabaseAdmin
      .from("firms")
      .insert({ ...data.firm, slug, status: "pending" })
      .select("id, slug").single();
    if (firmError) throw firmError;

    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(context.userId);
    if (userError) throw userError;

    const profileUpdate: Record<string, unknown> = { firm_id: firmRow.id, role: "firm_admin" };
    if (data.admin?.first_name) profileUpdate.first_name = data.admin.first_name;
    if (data.admin?.last_name) profileUpdate.last_name = data.admin.last_name;

    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .upsert({ id: context.userId, email: userData.user.email, ...profileUpdate }, { onConflict: "id" });
    if (updateError) throw updateError;

    return { firmId: firmRow.id, slug: firmRow.slug };
  });

// ---------- LAWYER / ADVOCATE / MEDIATOR / ARBITRATOR ----------
const registerLawyerSchema = z.object({
  kind: z.enum(["advocate", "mediator", "arbitrator"]),
  is_lawyer: z.boolean().default(true), // mediators/arbitrators may not be lawyers
  first_name: z.string().trim().min(1).max(80),
  last_name: z.string().trim().min(1).max(80),
  title: z.string().trim().max(60).optional(),
  email: z.string().trim().email().max(255).optional(),
  phone: z.string().trim().max(30).optional(),
  province: provinceEnum.optional(),
  city: z.string().trim().max(80).optional(),

  // Advocate-only
  year_of_admission: z.number().int().min(1900).max(new Date().getFullYear()).optional(),
  is_senior_counsel: z.boolean().optional(),
  bar_id: z.string().uuid().optional(),
  chambers_id: z.string().uuid().optional(),
  new_chambers: z
    .object({
      name: z.string().trim().min(2).max(120),
      bar_id: z.string().uuid().optional(),
      city: z.string().trim().max(80).optional(),
      province: provinceEnum.optional(),
      address: z.string().trim().max(255).optional(),
    })
    .optional(),

  // Mediator-only
  mediator_accreditation: z.string().trim().max(120).optional(),
  mediator_style: z.string().trim().max(60).optional(),
  mediator_sectors: z.array(z.string().max(80)).max(20).optional(),

  // Arbitrator-only
  arbitrator_accreditation: z.string().trim().max(120).optional(),
  arbitrator_types: z.array(z.string().max(80)).max(20).optional(),
  arbitrator_experience_years: z.number().int().min(0).max(80).optional(),

  // Non-lawyer background note (shown for is_lawyer=false)
  background: z.string().trim().max(500).optional(),
});

export const registerLawyerForCurrentUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => registerLawyerSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("../integrations/supabase/client.server");

    // Chambers — create if new payload provided (advocate only)
    let chambers_id = data.chambers_id ?? null;
    if (data.kind === "advocate" && !chambers_id && data.new_chambers) {
      const slug = await uniqueSlug("chambers", slugify(data.new_chambers.name));
      const { data: chRow, error: chErr } = await supabaseAdmin
        .from("chambers")
        .insert({
          name: data.new_chambers.name,
          slug,
          bar_id: data.new_chambers.bar_id ?? data.bar_id ?? null,
          city: data.new_chambers.city ?? data.city ?? null,
          province: data.new_chambers.province ?? data.province ?? null,
          address: data.new_chambers.address ?? null,
        })
        .select("id").single();
      if (chErr) throw chErr;
      chambers_id = chRow.id;
    }

    const baseSlug = slugify(`${data.first_name}-${data.last_name}`);
    const slug = await uniqueSlug("lawyers", baseSlug);

    const bio = data.background ? `<p>${data.background.replace(/</g, "&lt;")}</p>` : null;

    const insertRow = {
      slug,
      profile_id: context.userId,
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email ?? null,
      phone: data.phone ?? null,
      province: data.province ?? null,
      city: data.city ?? null,
      status: "trial",
      lawyer_type: data.is_lawyer ? (data.kind === "advocate" ? "advocate" : "attorney") : null,
      designation: data.title ?? null,
      is_senior_counsel: data.kind === "advocate" ? !!data.is_senior_counsel : false,
      year_of_admission: data.is_lawyer ? data.year_of_admission ?? null : null,
      bar_id: data.kind === "advocate" ? data.bar_id ?? null : null,
      chambers_id,
      is_mediator: data.kind === "mediator",
      is_arbitrator: data.kind === "arbitrator",
      mediator_accreditation: data.kind === "mediator" ? data.mediator_accreditation ?? null : null,
      mediator_style: data.kind === "mediator" ? data.mediator_style ?? null : null,
      mediator_sectors: data.kind === "mediator" ? data.mediator_sectors ?? null : null,
      arbitrator_accreditation: data.kind === "arbitrator" ? data.arbitrator_accreditation ?? null : null,
      arbitrator_types: data.kind === "arbitrator" ? data.arbitrator_types ?? null : null,
      arbitrator_experience_years: data.kind === "arbitrator" ? data.arbitrator_experience_years ?? null : null,
      bio,
    };

    const { data: lawyerRow, error: lawyerErr } = await supabaseAdmin
      .from("lawyers")
      .insert(insertRow)
      .select("id, slug").single();
    if (lawyerErr) throw lawyerErr;

    // Update profile: keep firm_admin/platform_admin, otherwise set 'lawyer'
    const { data: userData } = await supabaseAdmin.auth.admin.getUserById(context.userId);
    const { data: existingProfile } = await supabaseAdmin
      .from("profiles").select("role").eq("id", context.userId).maybeSingle();
    const keepRole = existingProfile?.role === "firm_admin" || existingProfile?.role === "platform_admin";
    const profilePatch: { id: string; email?: string; first_name?: string; last_name?: string; role?: string } = {
      id: context.userId,
      email: userData?.user?.email,
      first_name: data.first_name,
      last_name: data.last_name,
    };
    if (!keepRole) profilePatch.role = "lawyer";
    const { error: upErr } = await supabaseAdmin
      .from("profiles").upsert(profilePatch, { onConflict: "id" });
    if (upErr) throw upErr;

    return { lawyerId: lawyerRow.id, slug: lawyerRow.slug };
  });

// ---------- EXPERT WITNESS ----------
const registerExpertSchema = z.object({
  first_name: z.string().trim().min(1).max(80),
  last_name: z.string().trim().min(1).max(80),
  title: z.string().trim().max(60).optional(),
  qualifications: z.string().trim().max(2000).optional(),
  registration_body: z.string().trim().max(120).optional(),
  company_name: z.string().trim().max(120).optional(),
  employer: z.string().trim().max(120).optional(),
  is_independent: z.boolean().default(true),
  province: provinceEnum.optional(),
  city: z.string().trim().max(80).optional(),
  contact_email: z.string().trim().email().max(255).optional(),
  office_phone: z.string().trim().max(30).optional(),
  mobile_phone: z.string().trim().max(30).optional(),
});

export const registerExpertForCurrentUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => registerExpertSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("../integrations/supabase/client.server");
    const slug = await uniqueSlug("expert_witnesses", slugify(`${data.first_name}-${data.last_name}`));

    const { data: expertRow, error: expErr } = await supabaseAdmin
      .from("expert_witnesses")
      .insert({
        slug,
        profile_id: context.userId,
        first_name: data.first_name,
        last_name: data.last_name,
        title: data.title ?? null,
        qualifications: data.qualifications ?? null,
        registration_body: data.registration_body ?? null,
        company_name: data.company_name ?? null,
        employer: data.employer ?? null,
        is_independent: data.is_independent,
        province: data.province ?? null,
        city: data.city ?? null,
        contact_email: data.contact_email ?? null,
        office_phone: data.office_phone ?? null,
        mobile_phone: data.mobile_phone ?? null,
        status: "trial",
      })
      .select("id, slug").single();
    if (expErr) throw expErr;

    const { data: userData } = await supabaseAdmin.auth.admin.getUserById(context.userId);
    const { data: existingProfile } = await supabaseAdmin
      .from("profiles").select("role").eq("id", context.userId).maybeSingle();
    const keepRole = existingProfile?.role === "firm_admin" || existingProfile?.role === "platform_admin";
    const profilePatch: { id: string; email?: string; first_name?: string; last_name?: string; role?: string } = {
      id: context.userId,
      email: userData?.user?.email,
      first_name: data.first_name,
      last_name: data.last_name,
    };
    if (!keepRole) profilePatch.role = "expert_owner";
    const { error: upErr } = await supabaseAdmin
      .from("profiles").upsert(profilePatch, { onConflict: "id" });
    if (upErr) throw upErr;

    return { expertId: expertRow.id, slug: expertRow.slug };
  });
