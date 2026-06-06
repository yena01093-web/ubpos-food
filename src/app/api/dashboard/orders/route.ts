// GET /api/dashboard/orders?storeId=&date=&status=&page=
import { NextRequest } from 'next/server';
import { requireAuth, requireStoreAccess } from '@/lib/auth';
import { query, queryOne } from '@/lib/db';
import { ok, fail, forbidden, serverError } from '@/lib/response';

export async function GET(req: NextRequest) {
  try {
    const { auth, error } = requireAuth(req);
    if (error) return error;

    const { searchParams } = req.nextUrl;
    const storeId = searchParams.get('storeId');
    const date    = searchParams.get('date') ?? new Date().toISOString().slice(0, 10);
    const status  = searchParams.get('status');   // 필터 (선택)
    const page    = parseInt(searchParams.get('page') ?? '1');
    const limit   = 50;
    const offset  = (page - 1) * limit;

    if (!storeId) return fail('storeId가 필요합니다');
    if (!requireStoreAccess(auth!, storeId)) return forbidden();

    // 주문 목록 (items 포함)
    const conditions = [`o.store_id = $1`, `o.created_at::DATE = $2::DATE`];
    const values: unknown[] = [storeId, date];

    if (status) {
      values.push(status);
      conditions.push(`o.status = $${values.length}`);
    }

    const where = conditions.join(' AND ');

    const orders = await query<{
      id: string; order_number: string; type: string; status: string;
      total_price: number; payment_status: string; table_number: string | null;
      request_note: string | null; created_at: string;
    }>(
      `SELECT o.id, o.order_number, o.type, o.status, o.total_price,
              o.payment_status, t.table_number, o.request_note, o.created_at
       FROM orders o
       LEFT JOIN tables t ON t.id = o.table_id
       WHERE ${where}
       ORDER BY o.created_at DESC
       LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, limit, offset]
    );

    // 각 주문의 items 조회
    const orderIds = orders.map(o => o.id);
    const items = orderIds.length
      ? await query<{
          order_id: string; menu_name: string; quantity: number;
          item_total: number; selected_options: string;
        }>(
          `SELECT order_id, menu_name, quantity, item_total, selected_options
           FROM order_items WHERE order_id = ANY($1)`,
          [orderIds]
        )
      : [];

    const itemsByOrder = items.reduce((acc, item) => {
      if (!acc[item.order_id]) acc[item.order_id] = [];
      acc[item.order_id].push(item);
      return acc;
    }, {} as Record<string, typeof items>);

    const result = orders.map(o => ({ ...o, items: itemsByOrder[o.id] ?? [] }));

    // 오늘 매출 합계 (빠른 카드용)
    const summary = await queryOne<{
      total_orders: string; total_revenue: string; pending_count: string;
    }>(
      `SELECT
         COUNT(*) AS total_orders,
         COALESCE(SUM(total_price) FILTER (WHERE payment_status = 'paid'), 0) AS total_revenue,
         COUNT(*) FILTER (WHERE status = 'pending') AS pending_count
       FROM orders
       WHERE store_id = $1 AND created_at::DATE = $2::DATE`,
      [storeId, date]
    );

    return ok({ orders: result, summary, page, limit });
  } catch (err) {
    return serverError(err);
  }
}
