// Next.js API Route에서 WebSocket 이벤트 발행
const WS_URL    = process.env.WS_INTERNAL_URL ?? 'http://localhost:3001';
const WS_SECRET = process.env.EMIT_SECRET     ?? 'emit_dev_secret';

export async function emit(room: string, event: string, data: unknown) {
  try {
    await fetch(`${WS_URL}/emit`, {
      method:  'POST',
      headers: {
        'Content-Type':    'application/json',
        'x-emit-secret':   WS_SECRET,
      },
      body: JSON.stringify({ room, event, data }),
    });
  } catch (err) {
    // WS 서버 다운되어도 API는 정상 응답
    console.error('[emit] WS 서버 호출 실패:', err);
  }
}

// 편의 헬퍼
export const emitToStore    = (storeId: string, event: string, data: unknown) =>
  emit(`store:${storeId}`, event, data);

export const emitToOrder    = (orderId: string, event: string, data: unknown) =>
  emit(`order:${orderId}`, event, data);

export const emitToDashboard = (storeId: string, event: string, data: unknown) =>
  emit(`store:${storeId}:dashboard`, event, data);

export const emitToKds      = (storeId: string, event: string, data: unknown) =>
  emit(`store:${storeId}:kds`, event, data);
