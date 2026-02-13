import { Product, Location, StockEntry, Sale } from "@/types/models";

// Seed locations
export const defaultLocations: Location[] = [
  { id: "loc-1", name: "Main Store", type: "store" },
  { id: "loc-2", name: "Shop A – Market Road", type: "shop" },
  { id: "loc-3", name: "Shop B – Harbor Lane", type: "shop" },
  { id: "loc-4", name: "Shop C – Central Ave", type: "shop" },
  { id: "loc-5", name: "Shop D – East Wing", type: "shop" },
];

// Seed products
export const defaultProducts: Product[] = [
  { id: "prod-1", name: "Cream Crackers", pricePerCarton: 4500, active: true },
  { id: "prod-2", name: "Digestive Biscuits", pricePerCarton: 5200, active: true },
  { id: "prod-3", name: "Chocolate Fingers", pricePerCarton: 6800, active: true },
  { id: "prod-4", name: "Rich Tea", pricePerCarton: 3800, active: true },
  { id: "prod-5", name: "Shortbread Rounds", pricePerCarton: 7200, active: true },
  { id: "prod-6", name: "Wafer Rolls", pricePerCarton: 4100, active: true },
  { id: "prod-7", name: "Coconut Cookies", pricePerCarton: 3500, active: true },
  { id: "prod-8", name: "Ginger Snaps", pricePerCarton: 3200, active: false },
];

// Seed stock
export const defaultStock: StockEntry[] = [
  { productId: "prod-1", locationId: "loc-1", cartons: 120 },
  { productId: "prod-2", locationId: "loc-1", cartons: 85 },
  { productId: "prod-3", locationId: "loc-1", cartons: 60 },
  { productId: "prod-4", locationId: "loc-1", cartons: 200 },
  { productId: "prod-5", locationId: "loc-1", cartons: 45 },
  { productId: "prod-6", locationId: "loc-1", cartons: 90 },
  { productId: "prod-7", locationId: "loc-1", cartons: 150 },
  { productId: "prod-1", locationId: "loc-2", cartons: 30 },
  { productId: "prod-2", locationId: "loc-2", cartons: 20 },
  { productId: "prod-3", locationId: "loc-2", cartons: 15 },
  { productId: "prod-1", locationId: "loc-3", cartons: 25 },
  { productId: "prod-4", locationId: "loc-3", cartons: 40 },
  { productId: "prod-5", locationId: "loc-3", cartons: 10 },
  { productId: "prod-1", locationId: "loc-4", cartons: 18 },
  { productId: "prod-6", locationId: "loc-4", cartons: 22 },
  { productId: "prod-2", locationId: "loc-5", cartons: 35 },
  { productId: "prod-7", locationId: "loc-5", cartons: 28 },
];

// Seed sales
export const defaultSales: Sale[] = [
  {
    id: "sale-1",
    locationId: "loc-1",
    customerName: "Walk-in Customer",
    items: [
      { productId: "prod-1", cartons: 5, pricePerCarton: 4500 },
      { productId: "prod-3", cartons: 3, pricePerCarton: 6800 },
    ],
    totalAmount: 42900,
    createdAt: new Date().toISOString(),
  },
  {
    id: "sale-2",
    locationId: "loc-2",
    customerName: "Walk-in Customer",
    items: [
      { productId: "prod-2", cartons: 2, pricePerCarton: 5200 },
    ],
    totalAmount: 10400,
    createdAt: new Date().toISOString(),
  },
];
