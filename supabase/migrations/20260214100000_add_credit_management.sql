-- Customer Credit Management Tables
CREATE TABLE public.customer_credit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID UNIQUE REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
  credit_limit NUMERIC NOT NULL DEFAULT 0,
  current_balance NUMERIC NOT NULL DEFAULT 0,
  payment_terms_days INTEGER NOT NULL DEFAULT 30,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Customer Payment History
CREATE TABLE public.customer_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC NOT NULL,
  paid_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  reference TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Customer Invoice Tracking
CREATE TABLE public.customer_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  invoice_number TEXT UNIQUE NOT NULL,
  amount_due NUMERIC NOT NULL,
  amount_paid NUMERIC NOT NULL DEFAULT 0,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'partial', 'paid', 'overdue')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.customer_credit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_invoices ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage customer credit" ON public.customer_credit FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Store staff can view customer credit" ON public.customer_credit FOR SELECT USING (public.is_store_staff(auth.uid()));

CREATE POLICY "Admins can manage payments" ON public.customer_payments FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Store staff can view payments" ON public.customer_payments FOR SELECT USING (public.is_store_staff(auth.uid()));
CREATE POLICY "Store staff can insert payments" ON public.customer_payments FOR INSERT WITH CHECK (public.is_store_staff(auth.uid()));

CREATE POLICY "Admins can manage invoices" ON public.customer_invoices FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Store staff can view invoices" ON public.customer_invoices FOR SELECT USING (public.is_store_staff(auth.uid()));
CREATE POLICY "Store staff can insert invoices" ON public.customer_invoices FOR INSERT WITH CHECK (public.is_store_staff(auth.uid()));

-- Triggers for updated_at
CREATE TRIGGER update_customer_credit_updated_at
  BEFORE UPDATE ON public.customer_credit
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_customer_invoices_updated_at
  BEFORE UPDATE ON public.customer_invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
