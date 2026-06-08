// POST /api/payment/result
// 나이스페이먼츠 V1 인증 결과 수신 → 승인 API 호출
import { NextRequest } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { emitToDashboard, emitToOrder } from '@/lib/ws-emit';
import crypto from 'crypto';
import { NextResponse } from 'next/server';

const NICE_SECRET_KEY = process.env.NICE_SECRET_KEY!;
const APP_URL         = 'https://ubpos-food.vercel.app';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const authResultCode = formData.get('AuthResultCode') as string;
    const authResultMsg  = formData.get('AuthResultMsg') as string;
    const authToken      = formData.get('AuthToken') as string;
    const nextAppURL     = formData.get('NextAppURL') as string;
    const txTid          = formData.get('TxTid') as string;
    const mid            = formData.get('MID') as string;
    const moid           = formData.get('Moid') as string;
    const amt            = formData.get('Amt') as string;
    const payMethod      = formData.get('PayMethod') as string;

    // orderId 복원
    const order = await queryOne<{
      id: string; total_price: number; nice_amount: number | null;
      store_id: string; payment_status: string;
    }>(
      `SELECT id, total_price, nice_amount, store_id, payment_status
       FROM orders WHERE REPLACE(id::text, '-', '') = $1`,
      [moid]
    );

    if (authResultCode !== '0000') {
      return NextResponse.redirect(`${APP_URL}/payment/fail?msg=${encodeURIComponent(authResultMsg)}`);
    }

    if (!order) {
      return NextResponse.redirect(`${APP_URL}/payment/fail?msg=주문을 찾을 수 없습니다`);
    }

    if (order.nice_amount && Number(amt) !== order.nice_amount) {
      return NextResponse.redirect(`${APP_URL}/payment/fail?msg=결제금액 불일치`);
    }

    const now     = new Date();
    const ediDate = now.getFullYear().toString()
      + String(now.getMonth() + 1).padStart(2, '0')
      + String(now.getDate()).padStart(2, '0')
      + String(now.getHours()).padStart(2, '0')
      + String(now.getMinutes()).padStart(2, '0')
      + String(now.getSeconds()).padStart(2, '0');

    const signData = crypto
      .createHash('sha256')
      .update(authToken + mid + amt + ediDate + NICE_SECRET_KEY)
      .digest('hex');

    const params = new URLSearchParams({
      TID: txTid, AuthToken: authToken, MID: mid,
      Amt: amt, EdiDate: ediDate, CharSet: 'utf-8',
      EdiType: 'JSON', SignData: signData,
    });

    const approvalRes = await fetch(nextAppURL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8' },
      body: params.toString(),
    });

    const result = await approvalRes.json();

    const successCodes: Record<string, string> = {
      CARD: '3001', BANK: '4000', VBANK: '4100', CELLPHONE: 'A000',
    };
    const isSuccess = result.ResultCode === successCodes[payMethod] || result.ResultCode === '0000';

    if (!isSuccess) {
      await query(
        `INSERT INTO payment_logs (order_id, action, request, response, is_success) VALUES ($1,'approve_fail',$2,$3,false)`,
        [order.id, JSON.stringify({ txTid, amt }), JSON.stringify(result)]
      );
      return NextResponse.redirect(`${APP_URL}/payment/fail?msg=${encodeURIComponent(result.ResultMsg)}`);
    }

    await query(
      `UPDATE orders SET payment_status='paid', payment_method=$1, nice_tid=$2,
       status=CASE WHEN status='pending' THEN 'accepted' ELSE status END WHERE id=$3`,
      [payMethod.toLowerCase(), result.TID, order.id]
    );

    await query(
      `INSERT INTO payment_logs (order_id, action, request, response, is_success) VALUES ($1,'approve',$2,$3,true)`,
      [order.id, JSON.stringify({ txTid, amt }), JSON.stringify(result)]
    );

    await emitToDashboard(order.store_id, 'order:status_changed', { orderId: order.id, status: 'accepted' });
    await emitToOrder(order.id, 'order:status_changed', { status: 'accepted' });

    return NextResponse.redirect(`${APP_URL}/payment/success?orderId=${order.id}`);

  } catch (err) {
    console.error('[payment/result]', err);
    return NextResponse.redirect(`${APP_URL}/payment/fail?msg=서버오류`);
  }
}
