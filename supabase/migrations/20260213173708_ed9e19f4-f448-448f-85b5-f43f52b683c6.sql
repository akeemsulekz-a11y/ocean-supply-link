
-- Fix: Allow shop staff to upsert stock at their own location (needed when accepting supply)
CREATE POLICY "Shop staff can insert own location stock"
ON public.stock FOR INSERT
WITH CHECK (is_staff_at_location(auth.uid(), location_id));

CREATE POLICY "Shop staff can update own location stock"
ON public.stock FOR UPDATE
USING (is_staff_at_location(auth.uid(), location_id));

-- Fix transfer update: Drop and recreate the shop staff policy to ensure it's permissive
DROP POLICY IF EXISTS "Shop staff can update own transfers" ON public.transfers;
CREATE POLICY "Shop staff can update own transfers"
ON public.transfers FOR UPDATE
USING (is_staff_at_location(auth.uid(), to_location_id) AND status = 'pending'::transfer_status);
