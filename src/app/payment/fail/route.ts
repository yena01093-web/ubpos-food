import { NextRequest, NextResponse } from 'next/server';

const APP_URL = 'https://ubpos-food.vercel.app';

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const msg = formData.get('AuthResultMsg') as string ?? '결제가 취소되었습니다';
  return NextResponse.redirect(`${APP_URL}/payment/fail?msg=${encodeURIComponent(msg)}`);
}
