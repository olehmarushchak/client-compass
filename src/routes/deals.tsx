import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import {
  STAGES,
  customersQuery,
  dealsQuery,
  formatCurrency,
  formatDate,
  type Deal,
  type DealStage,
} from "@/lib/crm";

export const Route = createFileRoute("/deals")({
  head: () => ({
    meta: [
      { title: "Deals Pipeline — Ledgerline CRM" },
      {
        name: "description",
        content:
          "Track deals through New Lead, Contacted, Proposal Sent, Won and Lost on a drag-and-drop board.",
      },
      { property: "og:title", content: "Deals Pipeline — Ledgerline CRM" },
      {
        property: "og:description",
        content: "Kanban pipeline with deal value, close dates and linked customers.",
      },
    ],
  }),
  component: DealsPage,
});

type FormState = {
  title: string;
  customer_id: string;
  stage: DealStage;
  value: string;
  expected_close_date: string;
  notes: string;
};

const emptyForm: FormState = {
  title: "",
  customer_id: "",
  stage: "new_lead",
  value: "",
  expected_close_date: "",
  notes: "",
};

function DealsPage() {
  const qc = useQueryClient();
  const deals = useQuery(dealsQuery);
  const customers = useQuery(customersQuery);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<"all" | DealStage>("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Deal | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<DealStage | null>(null);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        title: form.title.trim(),
        customer_id: form.customer_id || null,
        stage: form.stage,
        value: Number(form.value) || 0,
        expected_close_date: form.expected_close_date || null,
        notes: form.notes.trim() || null,
      };
      if (editing) {
        const { error } = await supabase.from("deals").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("deals").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deals"] });
      setOpen(false);
      toast.success(editing ? "Deal updated" : "Deal added");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const move = useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: DealStage }) => {
      const { error } = await supabase.from("deals").update({ stage }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["deals"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("deals").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["deals"] });
      toast.success("Deal deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const nameOf = (id: string | null) =>
    customers.data?.find((c) => c.id === id)?.name ?? "Unassigned";

  const term = search.trim().toLowerCase();
  const visible = (deals.data ?? []).filter((d) => {
    const matchesTerm = term
      ? [d.title, d.notes, nameOf(d.customer_id)]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(term))
      : true;
    const matchesStage = stageFilter === "all" || d.stage === stageFilter;
    return matchesTerm && matchesStage;
  });

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (deal: Deal) => {
    setEditing(deal);
    setForm({
      title: deal.title,
      customer_id: deal.customer_id ?? "",
      stage: deal.stage,
      value: String(deal.value ?? ""),
      expected_close_date: deal.expected_close_date ?? "",
      notes: deal.notes ?? "",
    });
    setOpen(true);
  };

  const handleDrop = (stage: DealStage) => {
    setOverStage(null);
    if (!dragId) return;
    const deal = deals.data?.find((d) => d.id === dragId);
    setDragId(null);
    if (!deal || deal.stage === stage) return;
    move.mutate({ id: deal.id, stage });
  };

  return (
    <AppShell
      title="Deals"
      subtitle="Drag a card to move it through your pipeline."
      actions={
        <Button onClick={openNew}>
          <Plus className="size-4" /> Add deal
        </Button>
      }
    >
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search deals or customers"
            className="pl-9"
          />
        </div>
        <Select
          value={stageFilter}
          onValueChange={(v) => setStageFilter(v as "all" | DealStage)}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All stages" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All stages</SelectItem>
            {STAGES.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {STAGES.map((stage) => {
          const items = visible.filter((d) => d.stage === stage.id);
          const total = items.reduce((sum, d) => sum + Number(d.value), 0);
          return (
            <section
              key={stage.id}
              onDragOver={(e) => {
                e.preventDefault();
                setOverStage(stage.id);
              }}
              onDragLeave={() => setOverStage((s) => (s === stage.id ? null : s))}
              onDrop={() => handleDrop(stage.id)}
              className={`flex min-h-56 flex-col rounded-xl border border-border bg-secondary/50 p-3 transition-colors ${
                overStage === stage.id ? "border-primary bg-accent/50" : ""
              }`}
            >
              <div className="mb-3 flex items-baseline justify-between px-1">
                <h2 className="text-sm font-semibold">{stage.label}</h2>
                <span className="text-xs text-muted-foreground">
                  {items.length} · {formatCurrency(total)}
                </span>
              </div>
              <div className="flex flex-col gap-2">
                {items.map((deal) => (
                  <article
                    key={deal.id}
                    draggable
                    onDragStart={() => setDragId(deal.id)}
                    onDragEnd={() => setDragId(null)}
                    className={`surface-card cursor-grab p-3 active:cursor-grabbing ${
                      dragId === deal.id ? "opacity-50" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium leading-snug">{deal.title}</p>
                      <div className="flex shrink-0 gap-0.5">
                        <button
                          onClick={() => openEdit(deal)}
                          aria-label="Edit deal"
                          className="rounded p-1 text-muted-foreground hover:bg-muted"
                        >
                          <Pencil className="size-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Delete "${deal.title}"?`)) remove.mutate(deal.id);
                          }}
                          aria-label="Delete deal"
                          className="rounded p-1 text-muted-foreground hover:bg-muted"
                        >
                          <Trash2 className="size-3.5 text-destructive" />
                        </button>
                      </div>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{nameOf(deal.customer_id)}</p>
                    <div className="mt-2 flex items-center justify-between text-xs">
                      <span className="font-semibold text-foreground">
                        {formatCurrency(Number(deal.value))}
                      </span>
                      <span className="text-muted-foreground">
                        {formatDate(deal.expected_close_date)}
                      </span>
                    </div>
                  </article>
                ))}
                {items.length === 0 ? (
                  <p className="px-1 py-6 text-center text-xs text-muted-foreground">
                    Drop deals here
                  </p>
                ) : null}
              </div>
            </section>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit deal" : "Add deal"}</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (!form.title.trim()) {
                toast.error("Deal title is required");
                return;
              }
              save.mutate();
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="title">Deal title</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Customer</Label>
                <Select
                  value={form.customer_id}
                  onValueChange={(v) => setForm({ ...form, customer_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {(customers.data ?? []).map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Stage</Label>
                <Select
                  value={form.stage}
                  onValueChange={(v) => setForm({ ...form, stage: v as DealStage })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STAGES.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="value">Deal value</Label>
                <Input
                  id="value"
                  type="number"
                  min="0"
                  step="1"
                  value={form.value}
                  onChange={(e) => setForm({ ...form, value: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="close">Expected close date</Label>
                <Input
                  id="close"
                  type="date"
                  value={form.expected_close_date}
                  onChange={(e) => setForm({ ...form, expected_close_date: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="deal-notes">Notes</Label>
              <Textarea
                id="deal-notes"
                rows={3}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={save.isPending}>
                {save.isPending ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
