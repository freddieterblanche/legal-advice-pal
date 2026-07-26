import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowLeft, Check, X } from "lucide-react";
import { supabase } from "../../integrations/supabase/client";
import { adminListClaimRequests, adminDecideClaimRequest } from "../../lib/claim.functions";
import { TIER_BY_SLUG, formatRands, type TierSlug } from "../../lib/tiers";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/claims")({
  head: () => ({ meta: [{ title: "Admin · Profile Claims — Lawexpert.co.za" }] }),
  component: AdminClaimsPage,
});

type ClaimRow = {
  id: string;
  email: string;
  phone: string | null;
  message: string | null;
  requested_tier: string;
  status: string;
  decision_note: string | null;
  created_at: string;
  decided_at: string | null;
  service_providers: {
    id: string;
    slug: string;
    first_name: string;
    last_name: string;
    provider_type: string | null;
    designation: string | null;
    city: string | null;
    province: string | null;
    email: string | null;
    firms: { name: string | null } | null;
  } | null;
};

function AdminClaimsPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(adminListClaimRequests);
  const decideFn = useServerFn(adminDecideClaimRequest);
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [note, setNote] = useState("");

  const { data: profile } = useQuery({
    queryKey: ["my-profile-role"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
      return data;
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ["admin-claims"],
    enabled: profile?.role === "platform_admin",
    queryFn: async () => (await listFn()).requests as unknown as ClaimRow[],
  });

  const decide = useMutation({
    mutationFn: async (vars: { id: string; decision: "approved" | "rejected"; note?: string }) =>
      decideFn({ data: vars }),
    onSuccess: (_r, vars) => {
      toast.success(vars.decision === "approved" ? "Claim approved — profile handed over." : "Claim rejected.");
      setNoteFor(null);
      setNote("");
      qc.invalidateQueries({ queryKey: ["admin-claims"] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed"),
  });

  if (profile && profile.role !== "platform_admin") {
    return (
      <div className="mx-auto max-w-xl px-6 py-20 text-center">
        <h1 className="font-heading text-2xl text-ink">Not authorised</h1>
        <p className="mt-2 text-muted-foreground">This page is reserved for platform admins.</p>
      </div>
    );
  }

  const pending = (data ?? []).filter((r) => r.status === "pending");
  const decided = (data ?? []).filter((r) => r.status !== "pending");

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Link to="/admin" className="inline-flex items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-brand-hover">
        <ArrowLeft className="h-4 w-4" /> Admin Hub
      </Link>
      <h1 className="mt-3 font-heading text-3xl text-ink">Profile Claims</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Verify identity before approving — approval hands over ownership and edit rights. Send the
        payment link for the requested tier first; approve once payment clears.
      </p>

      <h2 className="eyebrow mt-8 text-ink-muted">Pending [{pending.length}]</h2>
      {isLoading ? (
        <p className="mt-4 text-sm text-ink-muted">Loading…</p>
      ) : pending.length === 0 ? (
        <p className="mt-4 rounded border border-rule bg-paper-white p-6 text-sm text-ink-muted">No pending claims.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {pending.map((r) => {
            const p = r.service_providers;
            const tier = TIER_BY_SLUG[r.requested_tier as TierSlug];
            return (
              <li key={r.id} className="rounded border border-rule bg-paper-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-heading text-lg text-ink">
                      {p ? `${p.first_name} ${p.last_name}` : "(deleted profile)"}
                      {p?.designation ? <span className="ml-2 font-body text-sm text-ink-muted">{p.designation}</span> : null}
                    </p>
                    <p className="mt-0.5 font-mono text-xs text-ink-muted">
                      {[p?.firms?.name, p ? [p.city, p.province].filter(Boolean).join(", ") : null].filter(Boolean).join(" · ")}
                    </p>
                    {p && (
                      <Link
                        to={p.provider_type === "expert" ? "/expert-witnesses/$slug" : "/lawyers/$slug"}
                        params={{ slug: p.slug }}
                        target="_blank"
                        className="mt-1 inline-block text-xs text-brand-primary hover:text-brand-hover"
                      >
                        View public profile →
                      </Link>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="citation-chip">
                      {tier ? `${tier.name} · ${formatRands(tier.monthlyRands)}/m` : r.requested_tier}
                    </span>
                    <p className="mt-1 font-mono text-[11px] text-ink-muted">
                      {new Date(r.created_at).toLocaleDateString("en-ZA")}
                    </p>
                  </div>
                </div>

                <div className="mt-3 grid gap-2 rounded border border-rule bg-paper-ivory p-3 text-sm sm:grid-cols-2">
                  <div>
                    <span className="text-ink-muted">Claimant email: </span>
                    <span className="font-medium text-ink">{r.email}</span>
                    {p?.email && p.email.toLowerCase() === r.email.toLowerCase() && (
                      <span className="ml-2 rounded-[3px] bg-brand-tint px-1.5 py-0.5 font-mono text-[10px] uppercase text-brand-primary">matches listing</span>
                    )}
                  </div>
                  {r.phone && <div><span className="text-ink-muted">Phone: </span><span className="text-ink">{r.phone}</span></div>}
                  {p?.email && p.email.toLowerCase() !== r.email.toLowerCase() && (
                    <div><span className="text-ink-muted">Listing email: </span><span className="text-ink">{p.email}</span></div>
                  )}
                  {r.message && <div className="sm:col-span-2"><span className="text-ink-muted">Note: </span><span className="text-ink">{r.message}</span></div>}
                </div>

                {noteFor === r.id ? (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <input
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      maxLength={500}
                      placeholder="Reason (sent context for the rejection)"
                      className="min-w-0 flex-1 rounded border border-rule bg-paper-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    />
                    <button
                      onClick={() => decide.mutate({ id: r.id, decision: "rejected", note })}
                      disabled={decide.isPending}
                      className="rounded bg-destructive px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                    >
                      Confirm reject
                    </button>
                    <button onClick={() => { setNoteFor(null); setNote(""); }} className="text-sm text-ink-muted hover:text-ink">
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      onClick={() => decide.mutate({ id: r.id, decision: "approved" })}
                      disabled={decide.isPending}
                      className="inline-flex items-center gap-1.5 rounded bg-brand-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-hover disabled:opacity-50"
                    >
                      <Check className="h-4 w-4" /> Approve & hand over
                    </button>
                    <button
                      onClick={() => setNoteFor(r.id)}
                      disabled={decide.isPending}
                      className="inline-flex items-center gap-1.5 rounded border border-rule bg-paper-white px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-destructive hover:text-destructive disabled:opacity-50"
                    >
                      <X className="h-4 w-4" /> Reject
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {decided.length > 0 && (
        <>
          <h2 className="eyebrow mt-10 text-ink-muted">Decided [{decided.length}]</h2>
          <ul className="mt-4 divide-y divide-rule rounded border border-rule bg-paper-white">
            {decided.map((r) => {
              const p = r.service_providers;
              return (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 p-4 text-sm">
                  <div>
                    <span className="font-medium text-ink">{p ? `${p.first_name} ${p.last_name}` : "(deleted profile)"}</span>
                    <span className="ml-2 text-ink-muted">{r.email}</span>
                    {r.decision_note && <span className="ml-2 text-xs text-ink-muted">— {r.decision_note}</span>}
                  </div>
                  <span
                    className={`rounded-[3px] px-2 py-0.5 font-mono text-xs uppercase ${
                      r.status === "approved" ? "bg-brand-tint text-brand-primary" : "bg-destructive/10 text-destructive"
                    }`}
                  >
                    {r.status}
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
