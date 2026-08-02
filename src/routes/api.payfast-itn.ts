import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

// PayFast ITN (Instant Transaction Notification) webhook.
// PayFast retries on non-200, so: return 200 only once the notification has
// been fully processed (or is a known duplicate); return 500 to request a retry.
export const Route = createFileRoute("/api/payfast-itn")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { supabaseAdmin } = await import("../integrations/supabase/client.server");
        const { validateItn } = await import("../lib/payfast.server");

        let params: Record<string, string>;
        try {
          const raw = await request.text();
          params = await validateItn(raw);
        } catch (err) {
          console.error("[payfast-itn] validation failed:", err);
          return new Response("invalid", { status: 400 });
        }

        try {
          const mPaymentId = params.m_payment_id;
          const pfPaymentId = params.pf_payment_id;
          const status = params.payment_status; // COMPLETE | CANCELLED | ...

          const { data: sub, error: sErr } = await supabaseAdmin
            .from("subscriptions")
            .select("id, service_provider_id, user_id, claim_request_id, tier, frequency, amount_rands, status")
            .eq("id", mPaymentId)
            .maybeSingle();
          if (sErr) throw sErr;
          if (!sub) {
            console.error("[payfast-itn] unknown m_payment_id", mPaymentId);
            return new Response("unknown payment", { status: 200 }); // don't retry forever
          }

          if (status === "CANCELLED") {
            // Subscription cancelled at PayFast. Keep the listing public;
            // suspension policy is applied manually / by a later dunning job.
            await supabaseAdmin
              .from("subscriptions")
              .update({ status: "cancelled" })
              .eq("id", sub.id);
            return new Response("OK", { status: 200 });
          }

          if (status !== "COMPLETE") return new Response("OK", { status: 200 });

          // Amount check (first charge and renewals both bill amount_rands).
          const gross = Number.parseFloat(params.amount_gross ?? "0");
          if (Math.abs(gross - Number(sub.amount_rands)) > 0.05) {
            console.error("[payfast-itn] amount mismatch", { gross, expected: sub.amount_rands });
            return new Response("amount mismatch", { status: 400 });
          }

          // Idempotency: each pf_payment_id is recorded exactly once.
          if (pfPaymentId) {
            const { data: seen } = await supabaseAdmin
              .from("billing_records")
              .select("id")
              .eq("payfast_payment_id", pfPaymentId)
              .maybeSingle();
            if (seen) return new Response("OK", { status: 200 });
          }

          const now = new Date();
          const periodEnd = new Date(now);
          if (sub.frequency === "annual") periodEnd.setFullYear(periodEnd.getFullYear() + 1);
          else periodEnd.setMonth(periodEnd.getMonth() + 1);

          // Retire any other live subscription for this provider first (tier
          // changes replace the old plan; also required by the one-active-per-
          // provider unique index). Remote cancel is best-effort — the local
          // record always reflects intent.
          const { data: oldSubs } = await supabaseAdmin
            .from("subscriptions")
            .select("id, payfast_token")
            .eq("service_provider_id", sub.service_provider_id)
            .eq("status", "active")
            .neq("id", sub.id);
          for (const old of oldSubs ?? []) {
            if (old.payfast_token && old.payfast_token !== params.token) {
              try {
                const { cancelPayfastSubscription } = await import("../lib/payfast.server");
                await cancelPayfastSubscription(old.payfast_token);
              } catch (err) {
                console.error("[payfast-itn] failed to cancel superseded sub at PayFast", old.id, err);
              }
            }
            await supabaseAdmin.from("subscriptions").update({ status: "cancelled" }).eq("id", old.id);
          }

          const { error: bErr } = await supabaseAdmin.from("billing_records").insert({
            service_provider_id: sub.service_provider_id,
            amount_rands: gross,
            payfast_payment_id: pfPaymentId ?? null,
            period_start: now.toISOString(),
            period_end: periodEnd.toISOString(),
            status: "complete",
          });
          if (bErr) throw bErr;

          const { error: subErr } = await supabaseAdmin
            .from("subscriptions")
            .update({
              status: "active",
              payfast_token: params.token ?? null,
              pf_payment_id: pfPaymentId ?? null,
              activated_at: now.toISOString(),
              current_period_end: periodEnd.toISOString(),
            })
            .eq("id", sub.id);
          if (subErr) throw subErr;

          // Tier change (no claim attached): apply the new tier to the listing.
          if (!sub.claim_request_id) {
            const { error: tErr } = await supabaseAdmin
              .from("service_providers")
              .update({ listing_tier: sub.tier })
              .eq("id", sub.service_provider_id);
            if (tErr) throw tErr;
          }

          // First payment on a verified claim: hand the profile over now.
          if (sub.claim_request_id) {
            const { data: req } = await supabaseAdmin
              .from("claim_requests")
              .select("id, status, user_id, email")
              .eq("id", sub.claim_request_id)
              .maybeSingle();

            if (req && req.status === "verified") {
              const { error: pErr } = await supabaseAdmin
                .from("service_providers")
                .update({
                  profile_id: req.user_id,
                  is_claimed: true,
                  listing_tier: sub.tier,
                  status: "active",
                })
                .eq("id", sub.service_provider_id);
              if (pErr) throw pErr;

              await supabaseAdmin
                .from("profiles")
                .upsert({ id: req.user_id, email: req.email, role: "lawyer" }, { onConflict: "id" });

              await supabaseAdmin
                .from("claim_requests")
                .update({ status: "approved", decided_at: now.toISOString() })
                .eq("id", req.id);
            }
          }

          return new Response("OK", { status: 200 });
        } catch (err) {
          console.error("[payfast-itn] processing failed:", err);
          return new Response("error", { status: 500 }); // PayFast will retry
        }
      },
    },
  },
});
