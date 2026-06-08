// POST /api/payment/signdata
// 서버사이드에서 SignData 생성 (EdiDate + MID + Amt + MerchantKey → SHA256)
import { NextRequest } from 'next/server';
import { ok, fail, serverError } from '@/lib/response';
import { queryOne, query } from '@/lib/db';
import crypto from 'crypto';

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

    if (!order) return fail('주문을 찾을 수 없습니다', 404);
    if (order.payment_status === 'paid') return fail('이미 결제된 주문입니다');

    const mid         = process.env.NICE_MID!;
    const merchantKey = process.env.NICE_SECRET_KEY!;
    const amt         = String(order.total_price);
    const moid        = order.id.replace(/-/g, '').substring(0, 64); // 특수문자 제거
    const goodsName   = `ubpos Food 주문 ${order.order_number}`;

    // EdiDate: YYYYMMDDHHMMSS
    const now     = new Date();
    const ediDate = now.getFullYear().toString()
      + String(now.getMonth() + 1).padStart(2, '0')
      + String(now.getDate()).padStart(2, '0')
      + String(now.getHours()).padStart(2, '0')
      + String(now.getMinutes()).padStart(2, '0')
      + String(now.getSeconds()).padStart(2, '0');

    // SignData = hex(sha256(EdiDate + MID + Amt + MerchantKey))
    const plainText = ediDate + mid + amt + merchantKey;
    const signData  = crypto.createHash('sha256').update(plainText).digest('hex');

    // nice_amount에 금액 기록 (승인 시 검증용)
    await query(
      `UPDATE orders SET nice_amount = $1 WHERE id = $2`,
      [order.total_price, orderId]
    );

    return ok({
      mid,
      amt,
      moid,
      goodsName,
      ediDate,
      signData,
      orderId: order.id,
    });
  } catch (err) {
    return serverError(err);
  }
}
