// GET /api/orders/[orderId]
import { NextRequest } from 'next/server';
import { queryOne, query } from '@/lib/db';
import { ok, notFound, serverError } from '@/lib/response';

export async function GET(
  _req: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const order = await queryOne<{
      id: string; order_number: string; status: string;
      payment_status: string; total_price: number;
      table_number: string | null; created_at: string;
    }>(
      `SELECT o.id, o.order_number, o.status, o.payment_status,
              o.total_price, t.table_number, o.created_at
       FROM orders o
       LEFT JOIN tables t ON t.id = o.table_id
       WHERE o.id = $1`,
      [params.orderId]
    );
    if (!order) return notFound();

    const items = await query<{
      menu_name: string; quantity: number; item_total: number; selected_options: unknown;
    }>(
      `SELECT menu_name, quantity, item_total, selected_options
       FROM order_items WHERE order_id = $1`,
      [params.orderId]
    );

    return ok({ ...order, items });
  } catch (err) {
    return serverError(err);
  }
}
