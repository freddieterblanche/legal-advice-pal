import { createFileRoute } from "@tanstack/react-router";
import { AdminRoleListPage } from "../../components/AdminRoleListPage";

export const Route = createFileRoute("/_authenticated/admin/mediators")({
  head: () => ({ meta: [{ title: "Admin · Mediators — Lawexpert.co.za" }] }),
  component: () => <AdminRoleListPage role="mediator" />,
});
