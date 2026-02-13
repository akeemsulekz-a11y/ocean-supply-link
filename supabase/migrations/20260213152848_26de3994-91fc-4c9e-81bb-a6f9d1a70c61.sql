
-- Daily stock snapshots for opening/closing balance tracking
CREATE TABLE public.daily_stock_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id),
  location_id uuid NOT NULL REFERENCES public.locations(id),
  snapshot_date date NOT NULL DEFAULT CURRENT_DATE,
  opening_cartons integer NOT NULL DEFAULT 0,
  added_cartons integer NOT NULL DEFAULT 0,
  sold_cartons integer NOT NULL DEFAULT 0,
  closing_cartons integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(product_id, location_id, snapshot_date)
);

ALTER TABLE public.daily_stock_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all snapshots"
  ON public.daily_stock_snapshots FOR ALL
  USING (is_admin(auth.uid()));

CREATE POLICY "Store staff can manage snapshots"
  ON public.daily_stock_snapshots FOR ALL
  USING (is_store_staff(auth.uid()));

CREATE POLICY "Shop staff can view own location snapshots"
  ON public.daily_stock_snapshots FOR SELECT
  USING (is_staff_at_location(auth.uid(), location_id));

CREATE POLICY "Shop staff can insert own location snapshots"
  ON public.daily_stock_snapshots FOR INSERT
  WITH CHECK (is_staff_at_location(auth.uid(), location_id));

CREATE POLICY "Shop staff can update own location snapshots"
  ON public.daily_stock_snapshots FOR UPDATE
  USING (is_staff_at_location(auth.uid(), location_id));

-- Add receipt_number to sales for receipt tracking
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS receipt_number text;

-- Add receipt fields to transfers  
ALTER TABLE public.transfers ADD COLUMN IF NOT EXISTS receipt_number text;
