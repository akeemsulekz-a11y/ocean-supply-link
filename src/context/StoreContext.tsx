import React, { createContext, useContext, useState, useCallback } from "react";
import { Product, Location, StockEntry, Sale } from "@/types/models";
import { defaultProducts, defaultLocations, defaultStock, defaultSales } from "@/data/seed";

interface StoreContextType {
  products: Product[];
  locations: Location[];
  stock: StockEntry[];
  sales: Sale[];
  addProduct: (p: Omit<Product, "id">) => void;
  toggleProduct: (id: string) => void;
  addSale: (sale: Omit<Sale, "id" | "createdAt">) => void;
  getStock: (productId: string, locationId: string) => number;
  getTotalStockForProduct: (productId: string) => number;
  getTotalStockForLocation: (locationId: string) => number;
}

const StoreContext = createContext<StoreContextType | null>(null);

export const useStore = () => {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
};

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>(defaultProducts);
  const [locations] = useState<Location[]>(defaultLocations);
  const [stock, setStock] = useState<StockEntry[]>(defaultStock);
  const [sales, setSales] = useState<Sale[]>(defaultSales);

  const addProduct = useCallback((p: Omit<Product, "id">) => {
    setProducts(prev => [...prev, { ...p, id: `prod-${Date.now()}` }]);
  }, []);

  const toggleProduct = useCallback((id: string) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, active: !p.active } : p));
  }, []);

  const getStock = useCallback((productId: string, locationId: string) => {
    return stock.find(s => s.productId === productId && s.locationId === locationId)?.cartons ?? 0;
  }, [stock]);

  const getTotalStockForProduct = useCallback((productId: string) => {
    return stock.filter(s => s.productId === productId).reduce((sum, s) => sum + s.cartons, 0);
  }, [stock]);

  const getTotalStockForLocation = useCallback((locationId: string) => {
    return stock.filter(s => s.locationId === locationId).reduce((sum, s) => sum + s.cartons, 0);
  }, [stock]);

  const addSale = useCallback((sale: Omit<Sale, "id" | "createdAt">) => {
    const newSale: Sale = {
      ...sale,
      id: `sale-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setSales(prev => [...prev, newSale]);
    // Deduct stock
    setStock(prev => {
      const updated = [...prev];
      for (const item of sale.items) {
        const idx = updated.findIndex(s => s.productId === item.productId && s.locationId === sale.locationId);
        if (idx >= 0) {
          updated[idx] = { ...updated[idx], cartons: Math.max(0, updated[idx].cartons - item.cartons) };
        }
      }
      return updated;
    });
  }, []);

  return (
    <StoreContext.Provider value={{
      products, locations, stock, sales,
      addProduct, toggleProduct, addSale,
      getStock, getTotalStockForProduct, getTotalStockForLocation,
    }}>
      {children}
    </StoreContext.Provider>
  );
};
