import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

    // Get all stock entries
    const { data: stockData } = await supabase.from("stock").select("product_id, location_id, cartons");
    if (!stockData || stockData.length === 0) {
      return new Response(JSON.stringify({ message: "No stock data" }), { status: 200 });
    }

    // Get yesterday's closing for opening values
    const { data: yesterdaySnaps } = await supabase
      .from("daily_stock_snapshots")
      .select("product_id, location_id, closing_cartons")
      .eq("snapshot_date", yesterday);

    const getYesterdayClosing = (productId: string, locationId: string) => {
      const snap = (yesterdaySnaps ?? []).find(
        (s: any) => s.product_id === productId && s.location_id === locationId
      );
      return snap ? (snap as any).closing_cartons : 0;
    };

    // Check if today's snapshots already exist
    const { data: existingSnaps } = await supabase
      .from("daily_stock_snapshots")
      .select("id")
      .eq("snapshot_date", today)
      .limit(1);

    if (existingSnaps && existingSnaps.length > 0) {
      return new Response(JSON.stringify({ message: "Snapshots already exist for today" }), { status: 200 });
    }

    // Create today's snapshots
    const snapshots = stockData.map((s: any) => ({
      product_id: s.product_id,
      location_id: s.location_id,
      snapshot_date: today,
      opening_cartons: getYesterdayClosing(s.product_id, s.location_id) || s.cartons,
      added_cartons: 0,
      sold_cartons: 0,
      closing_cartons: s.cartons,
    }));

    const { error } = await supabase.from("daily_stock_snapshots").insert(snapshots);
    if (error) {
      console.error("Snapshot error:", error);
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    return new Response(JSON.stringify({ message: `Created ${snapshots.length} snapshots for ${today}` }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
