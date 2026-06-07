import { createFileRoute } from "@tanstack/react-router";
import { AdminRoleListPage } from "../../components/AdminRoleListPage";

export const Route = createFileRoute("/_authenticated/admin/arbitrators")({
  head: () => ({ meta: [{ title: "Admin · Arbitrators — Lawexpert.co.za" }] }),
  component: () => <AdminRoleListPage role="arbitrator" />,
});
