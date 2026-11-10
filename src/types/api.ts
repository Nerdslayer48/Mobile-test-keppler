import appConfig from '../../app-config.json';
const SESSION_KEY = 'keppler.onlineSession';
const base = (import.meta.env.VITE_API_URL ?? appConfig.apiUrl).replace(/\/$/, '');
export const sessionToken = () => localStorage.getItem(SESSION_KEY);
export function setSessionToken(token: string | null) { if (token) localStorage.setItem(SESSION_KEY, token); else localStorage.removeItem(SESSION_KEY); }
export class ApiError extends Error { status: number; constructor(status: number, message: string) { super(message); this.status = status; } }
export async function apiResponse(path: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers); const token = sessionToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (options.body && typeof options.body === 'string') headers.set('Content-Type', 'application/json');
  let response: Response;
  try { response = await fetch(`${base}${path}`, { ...options, headers, cache: 'no-store' }); }
  catch { throw new Error('Unable to reach the server. Check your connection and try again.'); }
  if (!response.ok) {
    if (response.status === 401 && token && token === sessionToken() && !path.startsWith('/auth/')) window.dispatchEvent(new Event('company-session-expired'));
    const data = await response.json().catch(() => ({}));
    throw new ApiError(response.status, data.error ?? 'Unable to complete the request.');
  }
  return response;
}
export async function api<T>(path: string, options?: RequestInit): Promise<T> { return (await apiResponse(path, options)).json(); }
