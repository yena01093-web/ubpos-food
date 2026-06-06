// GET /api/dashboard/tables?storeId=
import { NextRequest } from 'next/server';
import { requireAuth, requireStoreAccess } from '@/lib/auth';
import { query } from '@/lib/db';
import { ok, fail, forbidden, serverError } from '@/lib/response';

export async function GET(req: NextRequest) {
  try {
    const { auth, error } = requireAuth(req);
    if (error) return error;

    const storeId = req.nextUrl.searchParams.get('storeId');
    if (!storeId) return fail('storeId가 필요합니다');
    if (!requireStoreAccess(auth!, storeId)) return forbidden();

    const tables = await query<{
      id: string; table_number: string; status: string;
      seat_count: number; sort_order: number;
      active_order_id: string | null; active_order_number: string | null;
      active_total: number | null; active_since: string | null;
    }>(
      `SELECT
         t.id, t.table_number, t.status, t.seat_count, t.sort_order,
         o.id           AS active_order_id,
         o.order_number AS active_order_number,
         o.total_price  AS active_total,
         o.created_at   AS active_since
       FROM tables t
       LEFT JOIN LATERAL (
         SELECT id, order_number, total_price, created_at
         FROM orders
         WHERE table_id = t.id
           AND status NOT IN ('completed','cancelled')
         ORDER BY created_at DESC
         LIMIT 1
       ) o ON true
       WHERE t.store_id = $1 AND t.is_active = true
       ORDER BY t.sort_order`,
      [storeId]
    );

    return ok({ tables });
  } catch (err) {
    return serverError(err);
  }
}
