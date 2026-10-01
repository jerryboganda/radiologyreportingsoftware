// Shared HTTP Basic Auth settings. Enabled only when BASIC_AUTH_PASS is set (production); localhost stays open.
import { createHash, timingSafeEqual } from 'node:crypto';

const USER = process.env.BASIC_AUTH_USER || 'radiology';
const PASS = process.env.BASIC_AUTH_PASS || '';

export const authEnabled = PASS.length > 0;

const digest = (s: string) => createHash('sha256').update(s).digest();

/** True when the Authorization header carries the configured user and password (constant-time compare). */
export function credentialsMatch(header: string | null): boolean {
  if (!authEnabled) return true;
  const match = /^Basic\s+([A-Za-z0-9+/=]+)$/i.exec(header ?? '');
  if (!match) return false;
  const decoded = Buffer.from(match[1], 'base64').toString('utf8');
  const split = decoded.indexOf(':'); // the password may itself contain ':'
  if (split < 0) return false;
  const userOk = timingSafeEqual(digest(decoded.slice(0, split)), digest(USER));
  const passOk = timingSafeEqual(digest(decoded.slice(split + 1)), digest(PASS));
  return userOk && passOk;
}

/** Header for requests this server makes to itself (the headless browser rendering the print page). */
export function selfAuthHeaders(): Record<string, string> {
  return authEnabled ? { Authorization: `Basic ${Buffer.from(`${USER}:${PASS}`).toString('base64')}` } : {};
}
