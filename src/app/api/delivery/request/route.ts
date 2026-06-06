// POST /api/delivery/request
import { NextRequest } from 'next/server';
import { requireAuth, requireStoreAccess } from '@/lib/auth';
import { queryOne, query } from '@/lib/db';
import { ok, fail, forbidden, notFound, serverError } from '@/lib/response';
import { requestDelivery } from '@/lib/barogo';
import { sendOrderAccepted } from '@/lib/alimtalk';
import { emitToDashboard } from '@/lib/ws-emit';

export async function POST(req: NextRequest) {
  try {
    const { auth, error } = requireAuth(req);
    if (error) return error;

    const {
      orderId,
      receiverName,
      receiverPhone,
      deliveryAddress,   // { roadAddress, detailAddress, lat, lng }
      deliveryTip = 0,
    } = await req.json();

    if (!orderId || !receiverName || !receiverPhone || !deliveryAddress) {
      return fail('필수 파라미터가 누락되었습니다');
    }

    // 주문 조회
    const order = await queryOne<{
      id: string; store_id: string; total_price: number;
      order_number: string; payment_method: string | null;
      request_note: string | null; status: string;
    }>(
      `SELECT id, store_id, total_price, order_number,
              payment_method, request_note, status
       FROM orders WHERE id = $1`,
      [orderId]
    );
    if (!order) return notFound('주문을 찾을 수 없습니다');
    if (!requireStoreAccess(auth!, order.store_id)) return forbidden();

    // 가맹점 정보 (픽업 주소, 바로고 storeId)
    const store = await queryOne<{
      name: string; address: string | null;
      barogo_store_id: string | null;
      pickup_lat: number | null; pickup_lng: number | null;
    }>(
      `SELECT name, address,
              barogo_store_id,
              pickup_lat, pickup_lng
       FROM stores WHERE id = $1`,
      [order.store_id]
    );
    if (!store?.barogo_store_id) {
      return fail('바로고 가맹점 ID가 설정되지 않았습니다. 설정 > 가게정보에서 입력해주세요.');
    }

    // 바로고 배달 요청
    const barogo = await requestDelivery({
      orderId:         order.id,
      storeId:         store.barogo_store_id,
      pickupAddress: {
        roadAddress: store.address ?? '',
        lat:         store.pickup_lat ?? 0,
        lng:         store.pickup_lng ?? 0,
      },
      deliveryAddress,
      receiverName,
      receiverPhone,
      orderAmount:   order.total_price,
      deliveryTip,
      requestNote:   order.request_note ?? undefined,
      paymentMethod: order.payment_method === 'cash' ? 'CASH' : 'PREPAID',
    });

    // DB 업데이트: delivery_id 저장, 타입 delivery로 변경
    await query(
      `UPDATE orders
       SET type = 'delivery',
           status = 'accepted',
           delivery_address = $1
       WHERE id = $2`,
      [JSON.stringify(deliveryAddress), orderId]
    );

    // delivery_logs 테이블에 기록 (선택 — 스키마에 추가 필요)
    await query(
      `INSERT INTO payment_logs (order_id, action, request, response, is_success)
       VALUES ($1, 'barogo_request', $2, $3, $4)`,
      [orderId, JSON.stringify({ receiverPhone, deliveryAddress }), JSON.stringify(barogo), barogo.success]
    );

    // 실시간 알림
    await emitToDashboard(order.store_id, 'order:status_changed', {
      orderId, status: 'accepted',
    });

    // 알림톡: 주문 접수
    const items = await query<{ menu_name: string; quantity: number }>(
      `SELECT menu_name, quantity FROM order_items WHERE order_id = $1`,
      [orderId]
    );
    const itemsText = items.map(i => `${i.menu_name} ${i.quantity}개`).join(', ');

    await sendOrderAccepted({
      phone:       receiverPhone,
      orderNumber: order.order_number,
      storeName:   store.name,
      items:       itemsText,
      totalPrice:  order.total_price,
    }).catch(e => console.error('[알림톡] 발송 실패:', e));

    return ok({
      deliveryId:    barogo.deliveryId,
      estimatedTime: barogo.estimatedTime,
      fee:           barogo.fee,
    });
  } catch (err) {
    return serverError(err);
  }
}
