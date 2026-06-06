// POST /api/delivery/status  — 바로고 웹훅 수신
import { NextRequest } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { ok, serverError } from '@/lib/response';
import { emitToDashboard, emitToOrder } from '@/lib/ws-emit';
import {
  sendDeliveryAssigned,
  sendDeliveryDone,
  sendOrderCancelled,
} from '@/lib/alimtalk';
import type { BarogoDeliveryStatus } from '@/lib/barogo';

// 바로고 → ubpos 상태 매핑
const STATUS_MAP: Partial<Record<BarogoDeliveryStatus, string>> = {
  ASSIGNED:   'cooking',    // 배차 → 조리 시작 신호
  PICKED_UP:  'ready',      // 픽업 → 준비 완료
  DELIVERED:  'completed',
  CANCELLED:  'cancelled',
};

export async function POST(req: NextRequest) {
  try {
    // 바로고 웹훅 시크릿 검증
    const sig = req.headers.get('x-barogo-signature');
    if (sig !== process.env.BAROGO_WEBHOOK_SECRET) {
      return ok({ received: false }); // 조용히 무시
    }

    const body = await req.json() as {
      externalOrderId: string;
      deliveryId:      string;
      status:          BarogoDeliveryStatus;
      riderName?:      string;
      riderPhone?:     string;
      estimatedTime?:  number;
      receiverPhone?:  string;
    };

    const { externalOrderId: orderId, status, riderName, riderPhone, estimatedTime } = body;

    // 주문 조회
    const order = await queryOne<{
      id: string; store_id: string; order_number: string;
      total_price: number; status: string;
    }>(
      `SELECT o.id, o.store_id, o.order_number, o.total_price, o.status,
              s.name AS store_name
       FROM orders o JOIN stores s ON s.id = o.store_id
       WHERE o.id = $1`,
      [orderId]
    );
    if (!order) return ok({ received: true, warn: 'order not found' });

    const newStatus = STATUS_MAP[status];

    // DB 상태 업데이트
    if (newStatus) {
      await query(
        `UPDATE orders SET status = $1 WHERE id = $2`,
        [newStatus, orderId]
      );
    }

    // 웹훅 로그
    await query(
      `INSERT INTO payment_logs (order_id, action, request, response, is_success)
       VALUES ($1, $2, $3, $4, true)`,
      [orderId, `barogo_${status.toLowerCase()}`, JSON.stringify(body), JSON.stringify({ newStatus })]
    );

    // 실시간 알림
    if (newStatus) {
      await emitToDashboard(order.store_id, 'order:status_changed', { orderId, status: newStatus });
      await emitToOrder(orderId, 'order:status_changed', { status: newStatus });
    }

    // 알림톡 분기
    const receiverPhone = body.receiverPhone ?? '';

    if (status === 'ASSIGNED' && riderName && riderPhone && receiverPhone) {
      await sendDeliveryAssigned({
        phone:        receiverPhone,
        orderNumber:  order.order_number,
        riderName,
        riderPhone,
        estimatedMin: estimatedTime ?? 30,
      }).catch(e => console.error('[알림톡] 배차완료 발송 실패:', e));
    }

    if (status === 'DELIVERED' && receiverPhone) {
      await sendDeliveryDone({
        phone:       receiverPhone,
        orderNumber: order.order_number,
        storeName:   (order as any).store_name,
      }).catch(e => console.error('[알림톡] 배달완료 발송 실패:', e));
    }

    if (status === 'CANCELLED' && receiverPhone) {
      await sendOrderCancelled({
        phone:       receiverPhone,
        orderNumber: order.order_number,
        reason:      '배달 배차 실패',
      }).catch(e => console.error('[알림톡] 취소 발송 실패:', e));
    }

    return ok({ received: true, orderId, newStatus });
  } catch (err) {
    return serverError(err);
  }
}
