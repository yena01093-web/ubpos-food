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

    const mid = (process.env.NICE_MID ?? '').replace(/^﻿/, '').trim();
    // NICE_MERCHANT_KEY: 표준결제창 SignData 전용 (상점관리자 → 상점키)
    // NICE_SECRET_KEY 로 fallback (구 설정 호환)
    const merchantKey = (process.env.NICE_MERCHANT_KEY ?? process.env.NICE_SECRET_KEY ?? '')
      .replace(/^﻿/, '').trim();
    const amt      = String(Math.round(Number(order.total_price)));
    const moid     = order.id.replace(/-/g, '').substring(0, 64);
    const goodsName = `ubpos Food 주문 ${order.order_number}`;

    // EdiDate: YYYYMMDDHHMMSS (KST)
    const now = new Date(Date.now() + 9 * 60 * 60 * 1000);
    const ediDate = now.getUTCFullYear().toString()
      + String(now.getUTCMonth() + 1).padStart(2, '0')
      + String(now.getUTCDate()).padStart(2, '0')
      + String(now.getUTCHours()).padStart(2, '0')
      + String(now.getUTCMinutes()).padStart(2, '0')
      + String(now.getUTCSeconds()).padStart(2, '0');

    // SignData = hex(sha256(EdiDate + MID + Amt + MerchantKey))
    const plainText = ediDate + mid + amt + merchantKey;
    const signData  = crypto.createHash('sha256').update(plainText, 'utf8').digest('hex');
    console.error(
      '[NICE-DEBUG]',
      'mid:', JSON.stringify(mid),
      '| amt:', amt,
      '| ediDate:', ediDate,
      '| keyLen:', merchantKey.length,
      '| key[0..3]:', JSON.stringify(merchantKey.substring(0, 4)),
      '| key[-4..]:', JSON.stringify(merchantKey.slice(-4)),
      '| signData(8):', signData.substring(0, 8)
    );

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
