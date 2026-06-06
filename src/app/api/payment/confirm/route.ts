// POST /api/payment/confirm
// 나이스페이먼츠 결제 승인 + 금액 위변조 검증
import { NextRequest } from 'next/server';
import { queryOne, query, withTransaction } from '@/lib/db';
import { ok, fail, notFound, serverError } from '@/lib/response';
import type { PoolClient } from 'pg';

const NICE_API_URL = process.env.NICE_API_URL ?? 'https://sandbox-api.nicepay.co.kr';
const NICE_SECRET  = process.env.NICE_SECRET_KEY!;
const NICE_MID     = process.env.NICE_MID!;

export async function POST(req: NextRequest) {
  try {
    const { orderId, paymentKey, amount } = await req.json();

    if (!orderId || !paymentKey || !amount) {
      return fail('orderId, paymentKey, amount가 모두 필요합니다');
    }

    // 주문 조회
    const order = await queryOne<{
      id: string; total_price: number; nice_amount: number | null;
      payment_status: string; store_id: string;
    }>(
      `SELECT id, total_price, nice_amount, payment_status, store_id
       FROM orders WHERE id = $1`,
      [orderId]
    );

    if (!order)                          return notFound('주문을 찾을 수 없습니다');
    if (order.payment_status === 'paid') return fail('이미 결제된 주문입니다');

    // ── 금액 위변조 검증 ──────────────────────────────────
    if (order.nice_amount === null) {
      return fail('결제 준비가 되지 않은 주문입니다');
    }
    if (Number(amount) !== order.nice_amount) {
      // 금액 불일치 → 결제 취소 요청 후 에러 반환
      await cancelNicePay(paymentKey, amount, '금액 불일치 자동 취소');
      return fail('결제 금액이 일치하지 않습니다', 422);
    }

    // ── 나이스페이먼츠 승인 API 호출 ──────────────────────
    const authHeader = 'Basic ' + Buffer.from(`${NICE_MID}:${NICE_SECRET}`).toString('base64');

    const niceRes = await fetch(`${NICE_API_URL}/v1/payments/${paymentKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify({ amount }),
    });

    const niceData = await niceRes.json();

    // 결제 로그 기록 (성공/실패 모두)
    await query(
      `INSERT INTO payment_logs (order_id, action, request, response, is_success)
       VALUES ($1, 'confirm', $2, $3, $4)`,
      [
        orderId,
        JSON.stringify({ paymentKey, amount }),
        JSON.stringify(niceData),
        niceRes.ok && niceData.resultCode === '0000',
      ]
    );

    if (!niceRes.ok || niceData.resultCode !== '0000') {
      return fail(niceData.resultMsg ?? '결제 승인에 실패했습니다', 400);
    }

    // ── DB 업데이트 (트랜잭션) ────────────────────────────
    await withTransaction(async (client: PoolClient) => {
      await client.query(
        `UPDATE orders
         SET payment_status = 'paid',
             payment_method = $1,
             nice_tid = $2,
             status = CASE WHEN status = 'pending' THEN 'accepted' ELSE status END
         WHERE id = $3`,
        [mapPayMethod(niceData.payMethod), niceData.tid, orderId]
      );
    });

    return ok({
      tid:         niceData.tid,
      orderId,
      amount:      niceData.amount,
      paidAt:      niceData.paidAt,
      payMethod:   niceData.payMethod,
    });

  } catch (err) {
    return serverError(err);
  }
}

// 나이스페이먼츠 결제 취소 (금액 불일치 시 자동 호출)
async function cancelNicePay(paymentKey: string, amount: number, reason: string) {
  try {
    const authHeader = 'Basic ' + Buffer.from(`${NICE_MID}:${NICE_SECRET}`).toString('base64');
    await fetch(`${NICE_API_URL}/v1/payments/${paymentKey}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
      body: JSON.stringify({ amount, reason }),
    });
  } catch { /* 취소 실패는 로그만 */ }
}

function mapPayMethod(nicePay: string): string {
  const map: Record<string, string> = {
    'CARD': 'card', 'VBANK': 'card', 'BANK': 'cash',
    'CELLPHONE': 'card', 'KAKAO': 'kakao_pay', 'NAVERPAY': 'naver_pay',
  };
  return map[nicePay] ?? 'card';
}
