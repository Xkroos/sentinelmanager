import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- Interfaces Existentes ---

export interface Order {
  id: string;
  user_id: string;
  customer_id?: string;
  customer_phone?: string;
  order_date: string;
  customer_name: string;
  product_description: string;
  purchase_price: number;
  sale_price: number;
  profit: number;
  merchandise_status?: 'comprada' | 'por_comprar';
  status: 'pendiente' | 'pagado';
  created_at: string;
  updated_at: string;
}

export interface OrderWithPayments extends Order {
  payments: Payment[];
}

export interface Payment {
  id: string;
  order_id: string;
  user_id: string;
  amount: number;
  payment_date: string;
  reference_number: string;
  payment_image_url: string;
  created_at: string;
}

export interface Note {
  id: string;
  user_id: string;
  note_text: string;
  created_at: string;
  updated_at: string;
}

// --- 🚀 NUEVA INTERFAZ PARA LA TABLA 'financial_transactions' ---

export interface FinancialTransaction {
  id: string;
  user_id: string;
  amount: number; // Monto de la transacción (inversión o retiro)
  description: string; // Breve descripción de la razón
  type: 'inversion' | 'retiro'; // Coincide con el ENUM 'transaction_type' en Supabase
  transaction_date: string;
  created_at: string; // Usualmente supabase agrega 'created_at' automáticamente
}

export interface InventoryItem {
  id: string;
  user_id: string;
  name: string;
  sku: string | null;
  stock_quantity: number;
  unit_price: number; // Precio de Compra
  sale_price: number; // Precio de Venta (NUEVO)
  supplier: string | null;
  created_at: string;
}

export interface InventoryBatch {
  id: string;
  user_id: string;
  batch_name: string;
  batch_date: string;
  shipping_cost: number;
  shipping_method: string | null;
  created_at: string;
}

export interface InventoryBatchItem {
  id: string;
  batch_id: string;
  inventory_item_id: string;
  quantity: number;
  unit_price: number;
  sale_price: number;
  is_new_product: boolean;
  created_at: string;
  // Relación opcional para hacer fetch
  inventory_item?: InventoryItem;
}

export interface Partner {
  id: string;
  user_id: string;
  name: string;
  profit_percentage: number;
  created_at: string;
  updated_at: string;
}

export interface PartnerTransaction {
  id: string;
  partner_id: string;
  user_id: string;
  type: 'inversion' | 'retiro';
  amount: number;
  description: string;
  transaction_date: string;
  created_at: string;
}

export interface Customer {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  created_at?: string;
  updated_at?: string;
}
