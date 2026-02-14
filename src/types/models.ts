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

// Customer Credit Management
export interface CustomerCredit {
  id: string;
  customer_id: string;
  credit_limit: number;
  current_balance: number;
  payment_terms_days: number;
  status: "active" | "suspended" | "closed";
  created_at: string;
  updated_at: string;
}

export interface CustomerPayment {
  id: string;
  customer_id: string;
  amount: number;
  paid_date: string;
  reference?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
}

export interface CustomerInvoice {
  id: string;
  customer_id: string;
  order_id?: string;
  invoice_number: string;
  amount_due: number;
  amount_paid: number;
  due_date: string;
  status: "unpaid" | "partial" | "paid" | "overdue";
  created_at: string;
  updated_at: string;
}

// Stock Alerts
export type StockAlertType = "low_stock" | "stockout_predicted" | "overstock";

export interface StockAlert {
  id: string;
  product_id: string;
  location_id: string;
  alert_type: StockAlertType;
  current_stock: number;
  threshold_value: number;
  predicted_stockout_date?: string;
  days_to_stockout?: number;
  sales_velocity: number;
  status: "active" | "resolved" | "ignored";
  dismissed_at?: string;
  dismissed_by?: string;
  created_at: string;
  updated_at: string;
}

// Product Barcode
export interface ProductBarcode {
  id: string;
  product_id: string;
  barcode_number: string;
  qr_code_data: string;
  generated_at: string;
  updated_at: string;
}
