
-- Stock adjustments audit table
CREATE TABLE public.stock_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE RESTRICT NOT NULL,
  location_id UUID REFERENCES public.locations(id) ON DELETE RESTRICT NOT NULL,
  previous_cartons INTEGER NOT NULL,
  new_cartons INTEGER NOT NULL,
  reason TEXT NOT NULL,
  adjusted_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.stock_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage stock adjustments" ON public.stock_adjustments FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Store staff can view stock adjustments" ON public.stock_adjustments FOR SELECT USING (public.is_store_staff(auth.uid()));
CREATE POLICY "Store staff can insert stock adjustments" ON public.stock_adjustments FOR INSERT WITH CHECK (public.is_store_staff(auth.uid()));
