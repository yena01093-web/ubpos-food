// src/lib/barogo.ts
// 바로고 배달 API v2 클라이언트

const BAROGO_URL    = process.env.BAROGO_API_URL    ?? 'https://api.barogo.com';
const BAROGO_KEY    = process.env.BAROGO_API_KEY    ?? '';
const BAROGO_SECRET = process.env.BAROGO_API_SECRET ?? '';

interface BarogoAddress {
  roadAddress:    string;   // 도로명주소
  detailAddress?: string;   // 상세주소
  lat:            number;
  lng:            number;
}

export interface BarogoOrderRequest {
  orderId:          string;   // ubpos 주문 ID (바로고 외부 주문번호)
  storeId:          string;   // 바로고 가맹점 ID
  pickupAddress:    BarogoAddress;
  deliveryAddress:  BarogoAddress;
  receiverName:     string;
  receiverPhone:    string;
  orderAmount:      number;   // 주문금액 (원)
  deliveryTip:      number;   // 배달팁 (원)
  requestNote?:     string;
  paymentMethod:    'PREPAID' | 'CASH';  // 선불(카드) | 현장결제
}

export interface BarogoOrderResponse {
  success:      boolean;
  deliveryId:   string;      // 바로고 배달 ID
  estimatedTime: number;     // 예상 소요 시간 (분)
  fee:          number;      // 실제 배달비
  message?:     string;
}

export interface BarogoStatusResponse {
  deliveryId:  string;
  status:      BarogoDeliveryStatus;
  riderName?:  string;
  riderPhone?: string;
  estimatedAt?: string;
}

export type BarogoDeliveryStatus =
  | 'PENDING'       // 배차 대기
  | 'ASSIGNED'      // 라이더 배차 완료
  | 'PICKED_UP'     // 픽업 완료
  | 'DELIVERING'    // 배달 중
  | 'DELIVERED'     // 배달 완료
  | 'CANCELLED';    // 취소

// ── 인증 토큰 캐시 ────────────────────────────────────────────────
let _token: string | null = null;
let _tokenExp = 0;

async function getToken(): Promise<string> {
  if (_token && Date.now() < _tokenExp) return _token;

  const res  = await fetch(`${BAROGO_URL}/v2/auth/token`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ apiKey: BAROGO_KEY, apiSecret: BAROGO_SECRET }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`바로고 인증 실패: ${data.message}`);

  _token    = data.accessToken;
  _tokenExp = Date.now() + (data.expiresIn - 60) * 1000;  // 1분 여유
  return _token!;
}

async function barogoFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const res   = await fetch(`${BAROGO_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${token}`,
      ...(options.headers ?? {}),
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? '바로고 API 오류');
  return data as T;
}

// ── 배달 요청 ─────────────────────────────────────────────────────
export async function requestDelivery(
  req: BarogoOrderRequest
): Promise<BarogoOrderResponse> {
  return barogoFetch<BarogoOrderResponse>('/v2/deliveries', {
    method: 'POST',
    body:   JSON.stringify({
      externalOrderId: req.orderId,
      storeId:         req.storeId,
      pickup: {
        address:       req.pickupAddress.roadAddress,
        addressDetail: req.pickupAddress.detailAddress ?? '',
        lat:           req.pickupAddress.lat,
        lng:           req.pickupAddress.lng,
      },
      delivery: {
        address:       req.deliveryAddress.roadAddress,
        addressDetail: req.deliveryAddress.detailAddress ?? '',
        lat:           req.deliveryAddress.lat,
        lng:           req.deliveryAddress.lng,
        receiverName:  req.receiverName,
        receiverPhone: req.receiverPhone,
      },
      orderAmount:   req.orderAmount,
      deliveryTip:   req.deliveryTip,
      memo:          req.requestNote ?? '',
      paymentMethod: req.paymentMethod,
    }),
  });
}

// ── 배달 상태 조회 ────────────────────────────────────────────────
export async function getDeliveryStatus(deliveryId: string): Promise<BarogoStatusResponse> {
  return barogoFetch<BarogoStatusResponse>(`/v2/deliveries/${deliveryId}`);
}

// ── 배달 취소 ─────────────────────────────────────────────────────
export async function cancelDelivery(deliveryId: string, reason: string): Promise<void> {
  await barogoFetch(`/v2/deliveries/${deliveryId}/cancel`, {
    method: 'POST',
    body:   JSON.stringify({ reason }),
  });
}

// ── 배달비 예상 조회 ─────────────────────────────────────────────
export async function estimateDelivery(params: {
  storeId:         string;
  pickupLat:       number; pickupLng: number;
  deliveryLat:     number; deliveryLng: number;
  orderAmount:     number;
}): Promise<{ estimatedFee: number; estimatedTime: number }> {
  return barogoFetch('/v2/deliveries/estimate', {
    method: 'POST',
    body:   JSON.stringify(params),
  });
}
