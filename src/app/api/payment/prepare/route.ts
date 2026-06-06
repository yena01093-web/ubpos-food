// POST /api/payment/prepare
// 결제 준비 — orderId + 금액을 서버에 임시 기록하고 clientKey 반환
import { NextRequest } from 'next/server';
import { queryOne, query } from '@/lib/db';
import { ok, fail, notFound, serverError } from '@/lib/response';

export async function POST(req: NextRequest) {
  try {
    const { orderId } = await req.json();
    if (!orderId) return fail('orderId가 필요합니다');

    const order = await queryOne<{
      id: string; total_price: number; payment_status: string; order_number: string;
    }>(
      `SELECT id, total_price, payment_status, order_number FROM orders WHERE id = $1`,
      [orderId]
    );

    if (!order)                        return notFound('주문을 찾을 수 없습니다');
    if (order.payment_status === 'paid') return fail('이미 결제된 주문입니다');

    // 결제 준비 금액을 nice_amount에 기록 (승인 시 검증용)
    await query(
      `UPDATE orders SET nice_amount = $1 WHERE id = $2`,
      [order.total_price, orderId]
    );

    return ok({
      clientKey:   process.env.NICE_CLIENT_KEY,
      orderId:     order.id,
      orderName:   `ubpos Food 주문 ${order.order_number}`,
      amount:      order.total_price,
    });
  } catch (err) {
    return serverError(err);
  }
}
