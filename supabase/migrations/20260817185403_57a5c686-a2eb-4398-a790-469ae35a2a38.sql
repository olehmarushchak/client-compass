CREATE TABLE public.customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.deals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  stage TEXT NOT NULL DEFAULT 'new_lead',
  value NUMERIC NOT NULL DEFAULT 0,
  expected_close_date DATE,
  notes TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX deals_customer_id_idx ON public.deals(customer_id);
CREATE INDEX deals_stage_idx ON public.deals(stage);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO anon, authenticated;
GRANT ALL ON public.customers TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deals TO anon, authenticated;
GRANT ALL ON public.deals TO service_role;

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can manage customers" ON public.customers FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public can manage deals" ON public.deals FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_deals_updated_at BEFORE UPDATE ON public.deals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.customers (id, name, email, phone, company, notes) VALUES
 ('11111111-1111-1111-1111-111111111101', 'Sarah Whitfield', 'sarah@brightleafcafe.com', '+44 7700 900123', 'Brightleaf Cafe', 'Interested in a second location fit-out.'),
 ('11111111-1111-1111-1111-111111111102', 'Tom Ainsley', 'tom@ainsleyjoinery.co.uk', '+44 7700 900456', 'Ainsley Joinery', 'Referred by Sarah.'),
 ('11111111-1111-1111-1111-111111111103', 'Priya Raman', 'priya@northgatedental.com', '+44 7700 900789', 'Northgate Dental', 'Prefers email contact only.'),
 ('11111111-1111-1111-1111-111111111104', 'Marcus Doyle', 'marcus@doyleandsons.com', '+44 7700 900321', 'Doyle & Sons', 'Annual maintenance contract renewal.');

INSERT INTO public.deals (title, customer_id, stage, value, expected_close_date, notes) VALUES
 ('Cafe refit - phase 1', '11111111-1111-1111-1111-111111111101', 'proposal_sent', 12500, CURRENT_DATE + 21, 'Quote sent, awaiting sign-off.'),
 ('Workshop shelving', '11111111-1111-1111-1111-111111111102', 'contacted', 3200, CURRENT_DATE + 14, NULL),
 ('Reception remodel', '11111111-1111-1111-1111-111111111103', 'new_lead', 8400, CURRENT_DATE + 45, 'Initial enquiry via website.'),
 ('Maintenance renewal 2026', '11111111-1111-1111-1111-111111111104', 'won', 6000, CURRENT_DATE - 5, 'Signed and invoiced.'),
 ('Outdoor seating area', '11111111-1111-1111-1111-111111111101', 'lost', 4750, CURRENT_DATE - 12, 'Went with a cheaper supplier.');