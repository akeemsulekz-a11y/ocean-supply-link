import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const usePaymentSettings = () => {
  const [paymentDetails, setPaymentDetails] = useState("");

  useEffect(() => {
    supabase.from("payment_settings").select("*").limit(1).single().then(({ data }) => {
      if (data) {
        let details = `Bank: ${data.bank_name}\nAccount: ${data.account_number}\nName: ${data.account_name}`;
        if (data.additional_info) details += `\n${data.additional_info}`;
        setPaymentDetails(details);
      }
    });
  }, []);

  return paymentDetails;
};
