// GET /api/dashboard/revenue?storeId=&period=day|week|month
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
    const period  = searchParams.get('period') ?? 'week'; // day | week | month

    if (!storeId) return fail('storeId가 필요합니다');
    if (!requireStoreAccess(auth!, storeId)) return forbidden();

    // ── 오늘 요약 ──────────────────────────────────────────
    const today = await queryOne<{
      revenue: string; orders: string; avg_price: string;
      card_revenue: string; cash_revenue: string;
    }>(
      `SELECT
         COALESCE(SUM(total_price) FILTER (WHERE payment_status='paid'), 0) AS revenue,
         COUNT(*) FILTER (WHERE status NOT IN ('cancelled')) AS orders,
         COALESCE(AVG(total_price) FILTER (WHERE payment_status='paid'), 0) AS avg_price,
         COALESCE(SUM(total_price) FILTER (WHERE payment_status='paid' AND payment_method='card'), 0) AS card_revenue,
         COALESCE(SUM(total_price) FILTER (WHERE payment_status='paid' AND payment_method='cash'), 0) AS cash_revenue
       FROM orders
       WHERE store_id = $1 AND created_at::DATE = CURRENT_DATE`,
      [storeId]
    );

    // ── 기간별 일별 매출 ────────────────────────────────────
    const daysMap: Record<string, number> = { day: 1, week: 7, month: 30 };
    const days = daysMap[period] ?? 7;

    const daily = await query<{ date: string; revenue: string; orders: string }>(
      `SELECT
         created_at::DATE::TEXT AS date,
         COALESCE(SUM(total_price) FILTER (WHERE payment_status='paid'), 0) AS revenue,
         COUNT(*) FILTER (WHERE status NOT IN ('cancelled')) AS orders
       FROM orders
       WHERE store_id = $1
         AND created_at::DATE >= CURRENT_DATE - INTERVAL '${days - 1} days'
       GROUP BY created_at::DATE
       ORDER BY created_at::DATE`,
      [storeId]
    );

    // ── 메뉴별 판매 순위 (상위 10) ─────────────────────────
    const topMenus = await query<{ menu_name: string; total_qty: string; total_revenue: string }>(
      `SELECT
         oi.menu_name,
         SUM(oi.quantity)   AS total_qty,
         SUM(oi.item_total) AS total_revenue
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       WHERE o.store_id = $1
         AND o.created_at::DATE >= CURRENT_DATE - INTERVAL '${days - 1} days'
         AND o.status NOT IN ('cancelled')
       GROUP BY oi.menu_name
       ORDER BY total_qty DESC
       LIMIT 10`,
      [storeId]
    );

    // ── 시간대별 주문 분포 ──────────────────────────────────
    const hourly = await query<{ hour: string; orders: string }>(
      `SELECT
         EXTRACT(HOUR FROM created_at)::INT::TEXT AS hour,
         COUNT(*) AS orders
       FROM orders
       WHERE store_id = $1
         AND created_at::DATE >= CURRENT_DATE - INTERVAL '${days - 1} days'
         AND status NOT IN ('cancelled')
       GROUP BY hour
       ORDER BY hour`,
      [storeId]
    );

    return ok({ today, daily, topMenus, hourly, period });
  } catch (err) {
    return serverError(err);
  }
}
