// PATCH /api/orders/[orderId]/status
import { NextRequest } from 'next/server';
import { requireAuth, requireStoreAccess } from '@/lib/auth';
import { queryOne, query } from '@/lib/db';
import { ok, fail, forbidden, notFound, serverError } from '@/lib/response';
import { emitToDashboard, emitToOrder } from '@/lib/ws-emit';
import { sendOrderReady, sendOrderCancelled } from '@/lib/alimtalk';
import type { OrderStatus } from '@/types';

// 허용되는 상태 전이 맵
const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending:   ['accepted', 'cancelled'],
  accepted:  ['cooking',  'cancelled'],
  cooking:   ['ready'],
  ready:     ['completed'],
  completed: [],
  cancelled: [],
};

export async function PATCH(
  req: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const { auth, error } = requireAuth(req);
    if (error) return error;

    const { status }: { status: OrderStatus } = await req.json();
    if (!status) return fail('status가 필요합니다');

    // 주문 조회
    const order = await queryOne<{ id: string; store_id: string; status: OrderStatus; table_id: string | null }>(
      `SELECT id, store_id, status, table_id FROM orders WHERE id = $1`,
      [params.orderId]
    );
    if (!order) return notFound('주문을 찾을 수 없습니다');

    // 가맹점 접근 권한
    if (!requireStoreAccess(auth!, order.store_id)) return forbidden();

    // 상태 전이 유효성 검사
    const allowed = ALLOWED_TRANSITIONS[order.status];
    if (!allowed.includes(status)) {
      return fail(`${order.status} → ${status} 전이는 불가합니다`);
    }

    // 상태 업데이트
    await query(
      `UPDATE orders SET status = $1 WHERE id = $2`,
      [status, order.id]
    );

    // 완료 시 테이블 초기화
    if (status === 'completed' && order.table_id) {
      // 같은 테이블의 미완료 주문이 없으면 empty로
      const remaining = await query(
        `SELECT id FROM orders
         WHERE table_id = $1 AND status NOT IN ('completed','cancelled') AND id != $2`,
        [order.table_id, order.id]
      );
      if (!remaining.length) {
        await query(`UPDATE tables SET status = 'empty' WHERE id = $1`, [order.table_id]);
      }
    }

    // 실시간 알림
    await emitToDashboard(order.store_id, 'order:status_changed', {
      orderId: order.id, status,
    });
    await emitToOrder(order.id, 'order:status_changed', { status });

    // ── 알림톡 ─────────────────────────────────────────────
    // 손님 전화번호 조회 (orders에 phone 컬럼이 있는 경우)
    const orderDetail = await queryOne<{
      customer_phone: string | null; order_number: string; table_number: string | null; store_name: string;
    }>(
      `SELECT o.customer_phone, o.order_number, t.table_number, s.name AS store_name
       FROM orders o
       LEFT JOIN tables t ON t.id = o.table_id
       JOIN stores s ON s.id = o.store_id
       WHERE o.id = $1`,
      [order.id]
    );

    if (orderDetail?.customer_phone) {
      if (status === 'ready') {
        sendOrderReady({
          phone:       orderDetail.customer_phone,
          orderNumber: orderDetail.order_number,
          storeName:   orderDetail.store_name,
          tableNumber: orderDetail.table_number ?? undefined,
        }).catch(e => console.error('[알림톡] ready 발송 실패:', e));
      }
      if (status === 'cancelled') {
        sendOrderCancelled({
          phone:       orderDetail.customer_phone,
          orderNumber: orderDetail.order_number,
        }).catch(e => console.error('[알림톡] cancelled 발송 실패:', e));
      }
    }

    return ok({ orderId: order.id, status });
  } catch (err) {
    return serverError(err);
  }
}
