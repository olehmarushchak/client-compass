import { supabase } from "@/integrations/supabase/client";

export type Customer = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  notes: string | null;
  created_at: string;
};

export type DealStage = "new_lead" | "contacted" | "proposal_sent" | "won" | "lost";

export const STAGES: { id: DealStage; label: string }[] = [
  { id: "new_lead", label: "New Lead" },
  { id: "contacted", label: "Contacted" },
  { id: "proposal_sent", label: "Proposal Sent" },
  { id: "won", label: "Won" },
  { id: "lost", label: "Lost" },
];

export const stageLabel = (stage: string) =>
  STAGES.find((s) => s.id === stage)?.label ?? stage;

export type Deal = {
  id: string;
  title: string;
  customer_id: string | null;
  stage: DealStage;
  value: number;
  expected_close_date: string | null;
  notes: string | null;
  created_at: string;
};

export const customersQuery = {
  queryKey: ["customers"],
  queryFn: async (): Promise<Customer[]> => {
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as Customer[];
  },
};

export const dealsQuery = {
  queryKey: ["deals"],
  queryFn: async (): Promise<Deal[]> => {
    const { data, error } = await supabase
      .from("deals")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as Deal[];
  },
};

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(value || 0);

export const formatDate = (value: string | null) =>
  value ? new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";
