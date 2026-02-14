import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No auth header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller is admin
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await userClient.auth.getUser();
    if (!caller) throw new Error("Unauthorized");

    const adminClient = createClient(supabaseUrl, serviceKey);
    const { data: isAdmin } = await adminClient.rpc("is_admin", { _user_id: caller.id });
    if (!isAdmin) throw new Error("Only admins can list customers");

    // Fetch customers with admin privileges and augment with auth info
    const { data: customers } = await adminClient.from("customers").select("*").order("created_at", { ascending: false });

    const customersWithAuth = await Promise.all((customers || []).map(async (c: any) => {
      try {
        const { data: { user } } = await adminClient.auth.admin.getUserById(c.user_id);
        return {
          ...c,
          email: user?.email ?? null,
          last_active: user?.last_sign_in_at ?? null,
        };
      } catch (_e) {
        return { ...c, email: null, last_active: null };
      }
    }));

    return new Response(JSON.stringify({ customers: customersWithAuth }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
