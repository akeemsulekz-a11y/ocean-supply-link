-- Stock Alerts - for predictive alerts
CREATE TABLE public.stock_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE NOT NULL,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('low_stock', 'stockout_predicted', 'overstock')),
  current_stock INTEGER NOT NULL,
  threshold_value INTEGER NOT NULL,
  predicted_stockout_date DATE,
  days_to_stockout INTEGER,
  sales_velocity NUMERIC NOT NULL DEFAULT 0, -- cartons per day
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'ignored')),
  dismissed_at TIMESTAMPTZ,
  dismissed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (product_id, location_id, alert_type)
);

-- Product Barcodes and QR Codes
CREATE TABLE public.product_barcodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID UNIQUE REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  barcode_number TEXT UNIQUE NOT NULL,
  qr_code_data TEXT NOT NULL, -- JSON encoded QR data including product details
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Stock Movement History (for analytics and velocity calculation)
CREATE TABLE public.stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE NOT NULL,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('sale', 'transfer_in', 'transfer_out', 'adjustment')),
  quantity INTEGER NOT NULL,
  reference_id TEXT, -- sale_id, transfer_id, etc
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.stock_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_barcodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage stock alerts" ON public.stock_alerts FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Store staff can view all stock alerts" ON public.stock_alerts FOR SELECT USING (public.is_store_staff(auth.uid()));
CREATE POLICY "Store staff can update alerts" ON public.stock_alerts FOR UPDATE USING (public.is_store_staff(auth.uid()));
CREATE POLICY "Shop staff can view own location alerts" ON public.stock_alerts FOR SELECT USING (public.is_staff_at_location(auth.uid(), location_id));
CREATE POLICY "Shop staff can dismiss own location alerts" ON public.stock_alerts FOR UPDATE USING (public.is_staff_at_location(auth.uid(), location_id) AND status = 'active');

CREATE POLICY "All authenticated can view product barcodes" ON public.product_barcodes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage product barcodes" ON public.product_barcodes FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Store staff can insert product barcodes" ON public.product_barcodes FOR INSERT WITH CHECK (public.is_store_staff(auth.uid()));

CREATE POLICY "All authenticated can insert stock movements" ON public.stock_movements FOR INSERT TO authenticated WITH CHECK (true);

-- Triggers for updated_at
CREATE TRIGGER update_stock_alerts_updated_at
  BEFORE UPDATE ON public.stock_alerts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_product_barcodes_updated_at
  BEFORE UPDATE ON public.product_barcodes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Function to calculate sales velocity (cartons per day for last 7 days)
CREATE OR REPLACE FUNCTION public.calculate_sales_velocity(
  p_product_id UUID,
  p_location_id UUID
)
RETURNS NUMERIC
LANGUAGE sql STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    SUM(quantity)::NUMERIC / 7.0,
    0
  ) FROM public.stock_movements
  WHERE product_id = p_product_id
    AND location_id = p_location_id
    AND movement_type = 'sale'
    AND created_at >= now() - INTERVAL '7 days';
$$;
