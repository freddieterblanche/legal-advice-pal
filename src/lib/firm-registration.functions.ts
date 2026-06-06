import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "../integrations/supabase/auth-middleware";
import { PROVINCES, slugify } from "./constants";

const registerFirmSchema = z.object({
  firm: z.object({
    name: z.string().trim().min(2).max(120),
    registration_number: z.string().trim().max(60).optional(),
    province: z.enum(PROVINCES as unknown as [string, ...string[]]),
    city: z.string().trim().min(1).max(80),
    website: z.string().trim().max(255).optional(),
    phone: z.string().trim().max(30).optional(),
    address: z.string().trim().max(255).optional(),
  }),
  admin: z.object({
    first_name: z.string().trim().min(1).max(80).optional(),
    last_name: z.string().trim().min(1).max(80).optional(),
  }).optional(),
});

export const registerFirmForCurrentUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => registerFirmSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("../integrations/supabase/client.server");
    const slug = `${slugify(data.firm.name)}-${Math.random().toString(36).slice(2, 8)}`;

    const { data: existingProfile, error: profileReadError } = await supabaseAdmin
      .from("profiles")
      .select("firm_id")
      .eq("id", context.userId)
      .maybeSingle();
    if (profileReadError) throw profileReadError;
    if (existingProfile?.firm_id) throw new Error("Your account is already linked to a firm.");

    const { data: firmRow, error: firmError } = await supabaseAdmin
      .from("firms")
      .insert({ ...data.firm, slug, status: "pending" })
      .select("id, slug")
      .single();
    if (firmError) throw firmError;

    const profileUpdate: { firm_id: string; role: string; first_name?: string; last_name?: string } = {
      firm_id: firmRow.id,
      role: "firm_admin",
    };
    if (data.admin?.first_name) profileUpdate.first_name = data.admin.first_name;
    if (data.admin?.last_name) profileUpdate.last_name = data.admin.last_name;

    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update(profileUpdate)
      .eq("id", context.userId);
    if (updateError) throw updateError;

    return { firmId: firmRow.id, slug: firmRow.slug };
  });