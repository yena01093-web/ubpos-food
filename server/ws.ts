// server/ws.ts
// Next.js와 별도로 실행되는 Socket.IO 서버
// 실행: npx ts-node server/ws.ts (or node dist/ws.js)
// PORT 기본값: 3001

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

const app    = express();
const http   = createServer(app);
const PORT   = Number(process.env.WS_PORT ?? 3001);
const SECRET = process.env.JWT_SECRET ?? 'dev_secret';

const io = new Server(http, {
  cors: {
    origin: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

// ── 룸 네이밍 규칙 ────────────────────────────────────────────────
// store:{storeId}          → 해당 가맹점 전체 (대시보드 + KDS)
// store:{storeId}:dashboard → 사장님 대시보드만
// store:{storeId}:kds       → 주방 KDS만
// order:{orderId}           → 손님 주문 상태 구독

// ── 인증 미들웨어 ─────────────────────────────────────────────────
io.use((socket, next) => {
  const token = socket.handshake.auth?.token as string | undefined;

  // 손님은 토큰 없이 주문 룸만 구독 가능
  if (!token) {
    socket.data.role    = 'guest';
    socket.data.storeIds = [];
    return next();
  }

  try {
    const payload = jwt.verify(token, SECRET) as {
      userId: string; role: string; storeIds: string[];
    };
    socket.data.userId   = payload.userId;
    socket.data.role     = payload.role;
    socket.data.storeIds = payload.storeIds ?? [];
    next();
  } catch {
    next(new Error('invalid_token'));
  }
});

// ── 연결 처리 ─────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`[WS] connect  ${socket.id}  role=${socket.data.role}`);

  // 대시보드/KDS: 가맹점 룸 입장
  socket.on('join:store', (storeId: string) => {
    if (socket.data.role === 'guest') return;
    if (!socket.data.storeIds?.includes(storeId) && socket.data.role !== 'admin') return;

    socket.join(`store:${storeId}`);
    socket.join(`store:${storeId}:dashboard`);
    console.log(`[WS] ${socket.id} joined store:${storeId}`);
  });

  // KDS 전용 룸
  socket.on('join:kds', (storeId: string) => {
    if (socket.data.role === 'guest') return;
    if (!socket.data.storeIds?.includes(storeId) && socket.data.role !== 'admin') return;

    socket.join(`store:${storeId}:kds`);
    console.log(`[WS] ${socket.id} joined kds:${storeId}`);
  });

  // 손님: 주문 상태 구독
  socket.on('join:order', (orderId: string) => {
    socket.join(`order:${orderId}`);
  });

  socket.on('disconnect', () => {
    console.log(`[WS] disconnect ${socket.id}`);
  });
});

// ── REST 내부 API (Next.js → WS 서버로 이벤트 발행) ─────────────
// Next.js API Route에서 호출: POST /emit
app.use(express.json());

const EMIT_SECRET = process.env.EMIT_SECRET ?? 'emit_dev_secret';

app.post('/emit', (req, res) => {
  // 내부 호출 인증
  if (req.headers['x-emit-secret'] !== EMIT_SECRET) {
    res.status(401).json({ ok: false });
    return;
  }

  const { room, event, data } = req.body as {
    room: string; event: string; data: unknown;
  };

  if (!room || !event) {
    res.status(400).json({ ok: false, message: 'room, event 필요' });
    return;
  }

  io.to(room).emit(event, data);
  console.log(`[WS] emit → room=${room} event=${event}`);
  res.json({ ok: true });
});

http.listen(PORT, () => {
  console.log(`[WS] Socket.IO 서버 실행 중 → http://localhost:${PORT}`);
});
