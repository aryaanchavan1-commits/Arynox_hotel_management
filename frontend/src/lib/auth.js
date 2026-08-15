import crypto from 'node:crypto';

const JWT_SECRET = process.env.ARYNOX_JWT_SECRET || 'arynox-local-secret';
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const b64j = (s) => Buffer.from(s, 'base64url').toString('utf8');

export function signToken(payload) {
  const header = b64({ alg: 'HS256', typ: 'JWT' });
  const body = b64({ ...payload, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30 });
  const sig = crypto.createHmac('sha256', JWT_SECRET).update(header + '.' + body).digest('base64url');
  return `${header}.${body}.${sig}`;
}

export function verifyToken(token) {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, body, sig] = parts;
  const expected = crypto.createHmac('sha256', JWT_SECRET).update(header + '.' + body).digest('base64url');
  if (expected !== sig) return null;
  try {
    const payload = JSON.parse(b64j(body));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch { return null; }
}

export function hash(pw, salt) { return crypto.scryptSync(pw, salt, 64).toString('hex'); }
export const SALT = 'arynox';

export function isStaffToken(payload) {
  return !!payload && payload.kind !== 'guest';
}

export function isGuestToken(payload) {
  return !!payload && payload.kind === 'guest';
}