import jwt from 'jsonwebtoken';

export interface JwtPayload {
  userId: string;
  role: 'admin' | 'owner' | 'staff';
  storeIds: string[];  // 접근 가능한 가맹점 ID 목록
}

const ACCESS_SECRET  = process.env.JWT_SECRET!;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;
const ACCESS_EXP     = process.env.JWT_EXPIRES_IN  ?? '15m';
const REFRESH_EXP    = process.env.JWT_REFRESH_EXPIRES_IN ?? '7d';

export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXP } as jwt.SignOptions);
}

export function signRefreshToken(payload: Pick<JwtPayload, 'userId'>): string {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXP } as jwt.SignOptions);
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, ACCESS_SECRET) as JwtPayload;
}

export function verifyRefreshToken(token: string): Pick<JwtPayload, 'userId'> {
  return jwt.verify(token, REFRESH_SECRET) as Pick<JwtPayload, 'userId'>;
}
