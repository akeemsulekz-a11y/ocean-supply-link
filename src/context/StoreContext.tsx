import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

// Local types matching Supabase schema
interface Product {
  id: string;
  name: string;
  price_per_carton: number;
  active: boolean;
}

interface Location {
  id: string;
  name: string;
  type: "store" | "shop";
}

interface StockEntry {
  product_id: string;
  location_id: string;
  cartons: number;
}

interface Sale {
  id: string;
  location_id: string;
  customer_name: string;
  total_amount: number;
  created_at: string;
  items: SaleItem[];
}

interface SaleItem {
  product_id: string;
  cartons: number;
  price_per_carton: number;
}

interface DailySnapshot {
  product_id: string;
  location_id: string;
  snapshot_date: string;
  opening_cartons: number;
  added_cartons: number;
  sold_cartons: number;
  closing_cartons: number;
}

interface StoreContextType {
  products: Product[];
  locations: Location[];
  stock: StockEntry[];
  sales: Sale[];
  dailySnapshots: DailySnapshot[];
  loading: boolean;
  addProduct: (p: Omit<Product, "id">) => Promise<void>;
  updateProduct: (id: string, p: Partial<Omit<Product, "id">>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  toggleProduct: (id: string) => Promise<void>;
  addSale: (sale: { location_id: string; customer_name: string; items: SaleItem[]; total_amount: number }) => Promise<string | undefined>;
  getStock: (productId: string, locationId: string) => number;
  getTotalStockForProduct: (productId: string) => number;
  getTotalStockForProductToday: (productId: string) => number;
  getTotalStockForLocation: (locationId: string) => number;
  refreshData: () => Promise<void>;
}

const StoreContext = createContext<StoreContextType | null>(null);

export const useStore = () => {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
};

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [stock, setStock] = useState<StockEntry[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [dailySnapshots, setDailySnapshots] = useState<DailySnapshot[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const today = new Date().toISOString().split("T")[0];
    const [prodRes, locRes, stockRes, salesRes, snapshotRes] = await Promise.all([
      supabase.from("products").select("id, name, price_per_carton, active").order("name"),
      supabase.from("locations").select("id, name, type").order("type").order("name"),
      supabase.from("stock").select("product_id, location_id, cartons"),
      supabase.from("sales").select("id, location_id, customer_name, total_amount, created_at").order("created_at", { ascending: false }).limit(100),
      supabase.from("daily_stock_snapshots").select("product_id, location_id, snapshot_date, opening_cartons, added_cartons, sold_cartons, closing_cartons").eq("snapshot_date", today),
    ]);
    if (prodRes.data) setProducts(prodRes.data as Product[]);
    if (locRes.data) setLocations(locRes.data as Location[]);
    if (stockRes.data) setStock(stockRes.data as StockEntry[]);
    if (snapshotRes.data) setDailySnapshots(snapshotRes.data as DailySnapshot[]);

    // Fetch sale items for each sale
    if (salesRes.data) {
      const saleIds = salesRes.data.map(s => s.id);
      if (saleIds.length > 0) {
        const { data: itemsData } = await supabase
          .from("sale_items")
          .select("sale_id, product_id, cartons, price_per_carton")
          .in("sale_id", saleIds);
        
        const salesWithItems = salesRes.data.map(s => ({
          ...s,
          items: (itemsData ?? []).filter(i => (i as any).sale_id === s.id).map(i => ({
            product_id: (i as any).product_id,
            cartons: (i as any).cartons,
            price_per_carton: (i as any).price_per_carton,
          })),
        })) as Sale[];
        setSales(salesWithItems);
      } else {
        setSales([]);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user) fetchAll();
  }, [user, fetchAll]);

  const addProduct = useCallback(async (p: Omit<Product, "id">) => {
    const { error } = await supabase.from("products").insert({
      name: p.name,
      price_per_carton: p.price_per_carton,
      active: p.active,
    });
    if (!error) await fetchAll();
  }, [fetchAll]);

  const updateProduct = useCallback(async (id: string, p: Partial<Omit<Product, "id">>) => {
    const { error } = await supabase.from("products").update(p).eq("id", id);
    if (!error) await fetchAll();
  }, [fetchAll]);

  const deleteProduct = useCallback(async (id: string) => {
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (!error) await fetchAll();
  }, [fetchAll]);

  const toggleProduct = useCallback(async (id: string) => {
    const prod = products.find(p => p.id === id);
    if (!prod) return;
    await supabase.from("products").update({ active: !prod.active }).eq("id", id);
    await fetchAll();
  }, [products, fetchAll]);

  const getStock = useCallback((productId: string, locationId: string) => {
    return stock.find(s => s.product_id === productId && s.location_id === locationId)?.cartons ?? 0;
  }, [stock]);

  const getTotalStockForProduct = useCallback((productId: string) => {
    return stock.filter(s => s.product_id === productId).reduce((sum, s) => sum + s.cartons, 0);
  }, [stock]);

  const getTotalStockForProductToday = useCallback((productId: string) => {
    return dailySnapshots.filter(s => s.product_id === productId).reduce((sum, s) => sum + s.closing_cartons, 0);
  }, [dailySnapshots]);

  const getTotalStockForLocation = useCallback((locationId: string) => {
    return stock.filter(s => s.location_id === locationId).reduce((sum, s) => sum + s.cartons, 0);
  }, [stock]);

  const addSale = useCallback(async (sale: { location_id: string; customer_name: string; items: SaleItem[]; total_amount: number }) => {
    // Insert sale
    const { data: saleData, error: saleError } = await supabase
      .from("sales")
      .insert({
        location_id: sale.location_id,
        customer_name: sale.customer_name,
        total_amount: sale.total_amount,
        created_by: user?.id,
      })
      .select("id")
      .single();

    if (saleError || !saleData) return undefined;

    // Insert sale items
    await supabase.from("sale_items").insert(
      sale.items.map(item => ({
        sale_id: saleData.id,
        product_id: item.product_id,
        cartons: item.cartons,
        price_per_carton: item.price_per_carton,
      }))
    );

    // Deduct stock and update daily snapshots
    const today = new Date().toISOString().split("T")[0];
    for (const item of sale.items) {
      const current = getStock(item.product_id, sale.location_id);
      const newQty = Math.max(0, current - item.cartons);
      await supabase
        .from("stock")
        .upsert({
          product_id: item.product_id,
          location_id: sale.location_id,
          cartons: newQty,
        }, { onConflict: "product_id,location_id" });

      // Update daily snapshot sold_cartons
      const { data: snapshot } = await supabase
        .from("daily_stock_snapshots")
        .select("id, sold_cartons, opening_cartons, added_cartons")
        .eq("product_id", item.product_id)
        .eq("location_id", sale.location_id)
        .eq("snapshot_date", today)
        .maybeSingle();

      if (snapshot) {
        const newSold = snapshot.sold_cartons + item.cartons;
        const closing = snapshot.opening_cartons + snapshot.added_cartons - newSold;
        await supabase.from("daily_stock_snapshots")
          .update({ sold_cartons: newSold, closing_cartons: Math.max(0, closing) })
          .eq("id", snapshot.id);
      } else {
        // Create today's snapshot if it doesn't exist
        await supabase.from("daily_stock_snapshots").insert({
          product_id: item.product_id,
          location_id: sale.location_id,
          snapshot_date: today,
          opening_cartons: current,
          added_cartons: 0,
          sold_cartons: item.cartons,
          closing_cartons: Math.max(0, current - item.cartons),
        });
      }
    }

    await fetchAll();
    return saleData.id;
  }, [user, getStock, fetchAll]);

  return (
    <StoreContext.Provider value={{
      products, locations, stock, sales, dailySnapshots, loading,
      addProduct, updateProduct, deleteProduct, toggleProduct, addSale,
      getStock, getTotalStockForProduct, getTotalStockForProductToday, getTotalStockForLocation,
      refreshData: fetchAll,
    }}>
      {children}
    </StoreContext.Provider>
  );
};
