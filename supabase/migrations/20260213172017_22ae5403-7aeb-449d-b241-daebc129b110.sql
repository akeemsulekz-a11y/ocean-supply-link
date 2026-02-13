
-- Payment settings table for admin-configurable bank details
CREATE TABLE public.payment_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bank_name text NOT NULL DEFAULT '',
  account_number text NOT NULL DEFAULT '',
  account_name text NOT NULL DEFAULT '',
  additional_info text,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can read payment settings
CREATE POLICY "Anyone can view payment settings"
ON public.payment_settings FOR SELECT
USING (true);

-- Only admins can manage
CREATE POLICY "Admins can manage payment settings"
ON public.payment_settings FOR ALL
USING (is_admin(auth.uid()));

-- Insert default row
INSERT INTO public.payment_settings (bank_name, account_number, account_name)
VALUES ('First Bank', '1234567890', 'OceanGush International');

-- Notifications table for real-time alerts
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type text NOT NULL, -- 'new_order', 'transfer_pending', 'transfer_disputed', etc.
  title text NOT NULL,
  message text NOT NULL,
  target_roles text[] NOT NULL DEFAULT '{}', -- which roles should see this
  reference_id uuid, -- order/transfer id
  read_by uuid[] NOT NULL DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Staff can view notifications targeted to their role
CREATE POLICY "Users can view notifications"
ON public.notifications FOR SELECT
USING (true);

-- Insert policy for authenticated users
CREATE POLICY "Authenticated can insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Update policy for marking as read
CREATE POLICY "Authenticated can update notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() IS NOT NULL);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
