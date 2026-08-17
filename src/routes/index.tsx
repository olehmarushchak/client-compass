import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Users, Briefcase, TrendingUp, Trophy } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import {
  customersQuery,
  dealsQuery,
  formatCurrency,
  formatDate,
  stageLabel,
} from "@/lib/crm";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Ledgerline CRM" },
      {
        name: "description",
        content:
          "See customers, open deals, pipeline value and deals won this month at a glance.",
      },
      { property: "og:title", content: "Dashboard — Ledgerline CRM" },
      {
        property: "og:description",
        content: "A simple CRM for small businesses: customers, deals and pipeline.",
      },
    ],
  }),
  component: Dashboard,
});

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof Users;
}) {
  return (
    <div className="surface-card p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <span className="flex size-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          <Icon className="size-4" />
        </span>
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}

function Dashboard() {
  const customers = useQuery(customersQuery);
  const deals = useQuery(dealsQuery);

  const allDeals = deals.data ?? [];
  const open = allDeals.filter((d) => d.stage !== "won" && d.stage !== "lost");
  const pipelineValue = open.reduce((sum, d) => sum + Number(d.value), 0);
  const now = new Date();
  const wonThisMonth = allDeals.filter((d) => {
    if (d.stage !== "won") return false;
    const date = new Date(d.expected_close_date ?? d.created_at);
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  });

  const recent = allDeals.slice(0, 6);
  const nameOf = (id: string | null) =>
    customers.data?.find((c) => c.id === id)?.name ?? "Unassigned";

  return (
    <AppShell title="Dashboard" subtitle="A quick look at how the business is doing.">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Customers" value={String(customers.data?.length ?? 0)} icon={Users} />
        <StatCard label="Total deals" value={String(allDeals.length)} icon={Briefcase} />
        <StatCard label="Pipeline value" value={formatCurrency(pipelineValue)} icon={TrendingUp} />
        <StatCard label="Won this month" value={String(wonThisMonth.length)} icon={Trophy} />
      </div>

      <div className="mt-6 surface-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold">Latest deals</h2>
          <Link to="/deals" className="text-sm font-medium text-primary hover:underline">
            View pipeline
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">
            No deals yet. Add your first deal from the Deals page.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {recent.map((deal) => (
              <li key={deal.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{deal.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {nameOf(deal.customer_id)} · closes {formatDate(deal.expected_close_date)}
                  </p>
                </div>
                <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
                  {stageLabel(deal.stage)}
                </span>
                <span className="w-24 text-right text-sm font-semibold">
                  {formatCurrency(Number(deal.value))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
