
-- Drop the existing restrictive policy
DROP POLICY "Shop staff can update own transfers" ON public.transfers;

-- Recreate with proper USING (old row) and WITH CHECK (new row)
CREATE POLICY "Shop staff can update own transfers"
ON public.transfers
FOR UPDATE
USING (is_staff_at_location(auth.uid(), to_location_id) AND status = 'pending'::transfer_status)
WITH CHECK (is_staff_at_location(auth.uid(), to_location_id) AND status IN ('accepted'::transfer_status, 'disputed'::transfer_status));
