// ── Enums ────────────────────────────────────────────────────────
export type TableStatus   = 'empty' | 'occupied' | 'waiting_payment';
export type OrderType     = 'dine_in' | 'takeout' | 'delivery';
export type OrderStatus   = 'pending' | 'accepted' | 'cooking' | 'ready' | 'completed' | 'cancelled';
export type PaymentStatus = 'unpaid' | 'paid' | 'refunded';
export type PaymentMethod = 'card' | 'cash' | 'kakao_pay' | 'naver_pay' | 'zero_pay';
export type UserRole      = 'admin' | 'owner' | 'staff';

// ── DB Row Types ─────────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface Store {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  address: string | null;
  phone: string | null;
  nice_mid: string | null;
  logo_url: string | null;
  is_open: boolean;
  open_time: string | null;
  close_time: string | null;
  notice: string | null;
}

export interface Table {
  id: string;
  store_id: string;
  table_number: string;
  qr_token: string;
  status: TableStatus;
  seat_count: number;
  sort_order: number;
  is_active: boolean;
}

export interface Category {
  id: string;
  store_id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
  image_url: string | null;
}

export interface Menu {
  id: string;
  store_id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_soldout: boolean;
  is_active: boolean;
  sort_order: number;
  tags: string[];
}

export interface OptionGroup {
  id: string;
  menu_id: string;
  name: string;
  is_required: boolean;
  max_select: number;
  sort_order: number;
  options?: Option[];
}

export interface Option {
  id: string;
  group_id: string;
  name: string;
  extra_price: number;
  is_soldout: boolean;
  sort_order: number;
}

export interface Order {
  id: string;
  store_id: string;
  table_id: string | null;
  order_number: string;
  type: OrderType;
  status: OrderStatus;
  total_price: number;
  payment_status: PaymentStatus;
  payment_method: PaymentMethod | null;
  nice_tid: string | null;
  request_note: string | null;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  menu_id: string | null;
  menu_name: string;
  unit_price: number;
  quantity: number;
  selected_options: { name: string; extra_price: number }[];
  item_total: number;
}

// ── API Request/Response ─────────────────────────────────────────
export interface CreateOrderRequest {
  storeId: string;
  tableId?: string;
  type: OrderType;
  items: {
    menuId: string;
    quantity: number;
    selectedOptionIds: string[];
  }[];
  requestNote?: string;
}

export interface MenuWithOptions extends Menu {
  option_groups: OptionGroup[];
}

export interface CategoryWithMenus extends Category {
  menus: MenuWithOptions[];
}
