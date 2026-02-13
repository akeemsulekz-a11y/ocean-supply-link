
-- =============================================
-- 1. ENUM TYPES
-- =============================================
CREATE TYPE public.app_role AS ENUM ('admin', 'store_staff', 'shop_staff');
CREATE TYPE public.location_type AS ENUM ('store', 'shop');
CREATE TYPE public.transfer_status AS ENUM ('pending', 'accepted', 'disputed');
CREATE TYPE public.order_status AS ENUM ('pending', 'approved', 'fulfilled', 'rejected');

-- =============================================
-- 2. BASE TABLES
-- =============================================

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User Roles (separate table per security requirements)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  location_id UUID, -- will reference locations after creation
  UNIQUE (user_id, role, location_id)
);

-- Locations
CREATE TABLE public.locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type public.location_type NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add FK for user_roles.location_id
ALTER TABLE public.user_roles ADD CONSTRAINT fk_user_roles_location FOREIGN KEY (location_id) REFERENCES public.locations(id) ON DELETE SET NULL;

-- Products
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price_per_carton NUMERIC NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Stock
CREATE TABLE public.stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE NOT NULL,
  cartons INTEGER NOT NULL DEFAULT 0,
  UNIQUE (product_id, location_id)
);

-- Sales
CREATE TABLE public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID REFERENCES public.locations(id) ON DELETE RESTRICT NOT NULL,
  customer_name TEXT NOT NULL DEFAULT 'Walk-in Customer',
  total_amount NUMERIC NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sale Items
CREATE TABLE public.sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE RESTRICT NOT NULL,
  cartons INTEGER NOT NULL,
  price_per_carton NUMERIC NOT NULL
);

-- Transfers (Store → Shop supplies)
CREATE TABLE public.transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_location_id UUID REFERENCES public.locations(id) ON DELETE RESTRICT NOT NULL,
  to_location_id UUID REFERENCES public.locations(id) ON DELETE RESTRICT NOT NULL,
  status public.transfer_status NOT NULL DEFAULT 'pending',
  created_by UUID REFERENCES auth.users(id),
  accepted_by UUID REFERENCES auth.users(id),
  resolved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Transfer Items
CREATE TABLE public.transfer_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id UUID REFERENCES public.transfers(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE RESTRICT NOT NULL,
  sent_cartons INTEGER NOT NULL DEFAULT 0,
  received_cartons INTEGER NOT NULL DEFAULT 0,
  issue_note TEXT
);

-- Customers (wholesale)
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  name TEXT NOT NULL,
  phone TEXT,
  approved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Orders (online customer orders)
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES public.customers(id) ON DELETE RESTRICT NOT NULL,
  status public.order_status NOT NULL DEFAULT 'pending',
  total_amount NUMERIC NOT NULL DEFAULT 0,
  approved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Order Items
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE RESTRICT NOT NULL,
  cartons INTEGER NOT NULL,
  price_per_carton NUMERIC NOT NULL
);

-- =============================================
-- 3. HELPER FUNCTIONS (SECURITY DEFINER)
-- =============================================

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin');
$$;

CREATE OR REPLACE FUNCTION public.is_staff_at_location(_user_id UUID, _location_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND location_id = _location_id
      AND role IN ('store_staff', 'shop_staff')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_store_staff(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'store_staff');
$$;

-- =============================================
-- 4. PROFILE AUTO-CREATION TRIGGER
-- =============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =============================================
-- 5. ENABLE RLS ON ALL TABLES
-- =============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transfer_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 6. RLS POLICIES
-- =============================================

-- PROFILES
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.is_admin(auth.uid()));
CREATE POLICY "Store staff can view all profiles" ON public.profiles FOR SELECT USING (public.is_store_staff(auth.uid()));
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- USER_ROLES
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all roles" ON public.user_roles FOR ALL USING (public.is_admin(auth.uid()));

-- PRODUCTS (viewable by all authenticated, manageable by admin/store_staff)
CREATE POLICY "Authenticated users can view products" ON public.products FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage products" ON public.products FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Store staff can manage products" ON public.products FOR INSERT WITH CHECK (public.is_store_staff(auth.uid()));
CREATE POLICY "Store staff can update products" ON public.products FOR UPDATE USING (public.is_store_staff(auth.uid()));

-- LOCATIONS (viewable by all staff, manageable by admin)
CREATE POLICY "Staff can view locations" ON public.locations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage locations" ON public.locations FOR ALL USING (public.is_admin(auth.uid()));

-- STOCK
CREATE POLICY "Admins can manage all stock" ON public.stock FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Store staff can view all stock" ON public.stock FOR SELECT USING (public.is_store_staff(auth.uid()));
CREATE POLICY "Store staff can manage stock" ON public.stock FOR INSERT WITH CHECK (public.is_store_staff(auth.uid()));
CREATE POLICY "Store staff can update stock" ON public.stock FOR UPDATE USING (public.is_store_staff(auth.uid()));
CREATE POLICY "Shop staff can view own location stock" ON public.stock FOR SELECT USING (public.is_staff_at_location(auth.uid(), location_id));

-- SALES
CREATE POLICY "Admins can manage all sales" ON public.sales FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Store staff can manage sales" ON public.sales FOR SELECT USING (public.is_store_staff(auth.uid()));
CREATE POLICY "Store staff can insert sales" ON public.sales FOR INSERT WITH CHECK (public.is_store_staff(auth.uid()));
CREATE POLICY "Store staff can update sales" ON public.sales FOR UPDATE USING (public.is_store_staff(auth.uid()));
CREATE POLICY "Shop staff can view own sales" ON public.sales FOR SELECT USING (public.is_staff_at_location(auth.uid(), location_id));
CREATE POLICY "Shop staff can insert own sales" ON public.sales FOR INSERT WITH CHECK (public.is_staff_at_location(auth.uid(), location_id));

-- SALE_ITEMS
CREATE POLICY "Admins can manage all sale items" ON public.sale_items FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Staff can view sale items" ON public.sale_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.sales s WHERE s.id = sale_id AND (public.is_store_staff(auth.uid()) OR public.is_staff_at_location(auth.uid(), s.location_id)))
);
CREATE POLICY "Staff can insert sale items" ON public.sale_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.sales s WHERE s.id = sale_id AND (public.is_store_staff(auth.uid()) OR public.is_staff_at_location(auth.uid(), s.location_id)))
);

-- TRANSFERS
CREATE POLICY "Admins can manage all transfers" ON public.transfers FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Store staff can manage transfers" ON public.transfers FOR SELECT USING (public.is_store_staff(auth.uid()));
CREATE POLICY "Store staff can insert transfers" ON public.transfers FOR INSERT WITH CHECK (public.is_store_staff(auth.uid()));
CREATE POLICY "Store staff can update transfers" ON public.transfers FOR UPDATE USING (public.is_store_staff(auth.uid()));
CREATE POLICY "Shop staff can view own transfers" ON public.transfers FOR SELECT USING (public.is_staff_at_location(auth.uid(), to_location_id));
CREATE POLICY "Shop staff can update own transfers" ON public.transfers FOR UPDATE USING (public.is_staff_at_location(auth.uid(), to_location_id) AND status = 'pending');

-- TRANSFER_ITEMS
CREATE POLICY "Admins can manage all transfer items" ON public.transfer_items FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Staff can view transfer items" ON public.transfer_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.transfers t WHERE t.id = transfer_id AND (public.is_store_staff(auth.uid()) OR public.is_staff_at_location(auth.uid(), t.to_location_id)))
);
CREATE POLICY "Store staff can insert transfer items" ON public.transfer_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.transfers t WHERE t.id = transfer_id AND public.is_store_staff(auth.uid()))
);
CREATE POLICY "Shop staff can update transfer items" ON public.transfer_items FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.transfers t WHERE t.id = transfer_id AND public.is_staff_at_location(auth.uid(), t.to_location_id) AND t.status = 'pending')
);

-- CUSTOMERS
CREATE POLICY "Admins can manage customers" ON public.customers FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Store staff can view customers" ON public.customers FOR SELECT USING (public.is_store_staff(auth.uid()));
CREATE POLICY "Customers can view own record" ON public.customers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Customers can update own record" ON public.customers FOR UPDATE USING (auth.uid() = user_id);

-- ORDERS
CREATE POLICY "Admins can manage all orders" ON public.orders FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Store staff can manage orders" ON public.orders FOR SELECT USING (public.is_store_staff(auth.uid()));
CREATE POLICY "Store staff can update orders" ON public.orders FOR UPDATE USING (public.is_store_staff(auth.uid()));
CREATE POLICY "Customers can view own orders" ON public.orders FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_id AND c.user_id = auth.uid())
);
CREATE POLICY "Customers can insert orders" ON public.orders FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_id AND c.user_id = auth.uid() AND c.approved = true)
);

-- ORDER_ITEMS
CREATE POLICY "Admins can manage all order items" ON public.order_items FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Staff can view order items" ON public.order_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND public.is_store_staff(auth.uid()))
);
CREATE POLICY "Customers can view own order items" ON public.order_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.orders o JOIN public.customers c ON c.id = o.customer_id WHERE o.id = order_id AND c.user_id = auth.uid())
);
CREATE POLICY "Customers can insert order items" ON public.order_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.orders o JOIN public.customers c ON c.id = o.customer_id WHERE o.id = order_id AND c.user_id = auth.uid() AND o.status = 'pending')
);

-- =============================================
-- 7. SEED DEFAULT LOCATIONS
-- =============================================
INSERT INTO public.locations (id, name, type) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Main Store', 'store'),
  ('00000000-0000-0000-0000-000000000002', 'Shop A – Market Road', 'shop'),
  ('00000000-0000-0000-0000-000000000003', 'Shop B – Harbor Lane', 'shop'),
  ('00000000-0000-0000-0000-000000000004', 'Shop C – Central Ave', 'shop'),
  ('00000000-0000-0000-0000-000000000005', 'Shop D – East Wing', 'shop');

-- Seed default products
INSERT INTO public.products (id, name, price_per_carton, active) VALUES
  ('00000000-0000-0000-0000-000000000101', 'Cream Crackers', 4500, true),
  ('00000000-0000-0000-0000-000000000102', 'Digestive Biscuits', 5200, true),
  ('00000000-0000-0000-0000-000000000103', 'Chocolate Fingers', 6800, true),
  ('00000000-0000-0000-0000-000000000104', 'Rich Tea', 3800, true),
  ('00000000-0000-0000-0000-000000000105', 'Shortbread Rounds', 7200, true),
  ('00000000-0000-0000-0000-000000000106', 'Wafer Rolls', 4100, true),
  ('00000000-0000-0000-0000-000000000107', 'Coconut Cookies', 3500, true),
  ('00000000-0000-0000-0000-000000000108', 'Ginger Snaps', 3200, false);

-- Seed default stock
INSERT INTO public.stock (product_id, location_id, cartons) VALUES
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000001', 120),
  ('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000001', 85),
  ('00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000001', 60),
  ('00000000-0000-0000-0000-000000000104', '00000000-0000-0000-0000-000000000001', 200),
  ('00000000-0000-0000-0000-000000000105', '00000000-0000-0000-0000-000000000001', 45),
  ('00000000-0000-0000-0000-000000000106', '00000000-0000-0000-0000-000000000001', 90),
  ('00000000-0000-0000-0000-000000000107', '00000000-0000-0000-0000-000000000001', 150),
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000002', 30),
  ('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000002', 20),
  ('00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000002', 15),
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000003', 25),
  ('00000000-0000-0000-0000-000000000104', '00000000-0000-0000-0000-000000000003', 40),
  ('00000000-0000-0000-0000-000000000105', '00000000-0000-0000-0000-000000000003', 10),
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000004', 18),
  ('00000000-0000-0000-0000-000000000106', '00000000-0000-0000-0000-000000000004', 22),
  ('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000005', 35),
  ('00000000-0000-0000-0000-000000000107', '00000000-0000-0000-0000-000000000005', 28);
