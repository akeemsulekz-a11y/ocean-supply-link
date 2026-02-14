export type LocationType = "store" | "shop";

export interface Location {
  id: string;
  name: string;
  type: LocationType;
}

export interface Product {
  id: string;
  name: string;
  pricePerCarton: number;
  active: boolean;
}

export interface StockEntry {
  productId: string;
  locationId: string;
  cartons: number;
}

export interface SaleItem {
  productId: string;
  cartons: number;
  pricePerCarton: number;
}

export interface Sale {
  id: string;
  locationId: string;
  customerName: string;
  items: SaleItem[];
  totalAmount: number;
  createdAt: string;
}

export type TransferStatus = "pending" | "accepted" | "disputed";

export interface TransferItem {
  productId: string;
  sentCartons: number;
  receivedCartons: number;
  issueNote?: string;
}

export interface Transfer {
  id: string;
  fromLocationId: string;
  toLocationId: string;
  items: TransferItem[];
  status: TransferStatus;
  createdBy: string;
  createdAt: string;
}
