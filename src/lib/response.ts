import { NextResponse } from 'next/server';

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ ok: true, data }, { status });
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ ok: false, message }, { status });
}

export function unauthorized(message = '인증이 필요합니다') {
  return fail(message, 401);
}

export function forbidden(message = '권한이 없습니다') {
  return fail(message, 403);
}

export function notFound(message = '찾을 수 없습니다') {
  return fail(message, 404);
}

export function serverError(err: unknown) {
  console.error('[API Error]', err);
  return fail('서버 오류가 발생했습니다', 500);
}
