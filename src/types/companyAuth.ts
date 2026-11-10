import { api, sessionToken, setSessionToken } from './api';
export interface Company { id: string; companyName: string; companyEmail: string; createdAt: string }
export interface CompanySession { id: string; companyId: string; staffId?: string; authenticatedAt: number; expiresAt: number }
export interface StaffMember { id: string; companyId: string; name: string; email: string; role?: string; createdAt?: string; accessToken?: string; accessRevoked?: boolean; profilePicture?: string }
interface Dataset { key: string; value: unknown; version: number }
interface AuthPayload { company: Company; session: CompanySession; datasets: Dataset[]; token?: string }
const SNAPSHOT_KEY = 'keppler.sessionSnapshot';
let activeToken: string | null = null;
let activeCompany: Company | null = null;
let activeSession: CompanySession | null = null;
let datasets = new Map<string, unknown>();
let versions = new Map<string, number>();
let confirmedDatasets = new Map<string, Dataset>();
let writes: Promise<void> = Promise.resolve();
export function currentCompany() { return activeCompany; }
export function isCompanyAdmin() { return !!activeSession && !activeSession.staffId; }
export function companyId() { if (!activeCompany) throw new Error('Sign in to a company first.'); return activeCompany.id; }
export function authChanged() { window.dispatchEvent(new Event('company-auth-changed')); }
function announce() { localStorage.setItem('keppler.authChanged', crypto.randomUUID()); authChanged(); }
function clear() {
  activeCompany = null; activeSession = null; activeToken = null; datasets.clear(); versions.clear(); confirmedDatasets.clear();
  setSessionToken(null); localStorage.removeItem(SNAPSHOT_KEY);
}
export function endLocalSession() { clear(); announce(); }
export function sessionExpiresAt() { return activeSession?.expiresAt ?? null; }
function cacheSession() {
  if (!activeCompany || !activeSession || !activeToken) return;
  try {
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify({ token: activeToken, company: activeCompany, session: activeSession,
      datasets: [...confirmedDatasets.values()] }));
  } catch { /* A full or unavailable cache must never prevent opening the app or signing in. */ }
}
// This snapshot only opens the UI. Every cloud endpoint still verifies the session on the server.
export function startupCompany(): Company | null {
  const token = sessionToken();
  if (!token) { activeCompany = null; activeSession = null; activeToken = null; datasets.clear(); versions.clear(); confirmedDatasets.clear(); return null; }
  if (activeToken === token && activeCompany && activeSession && activeSession.expiresAt > Date.now()) return activeCompany;
  try {
    const saved = JSON.parse(localStorage.getItem(SNAPSHOT_KEY) ?? 'null') as AuthPayload | null;
    if (!saved || saved.token !== token || !saved.company || !saved.session || saved.company.id !== saved.session.companyId ||
      !['id', 'companyName', 'companyEmail', 'createdAt'].every(key => typeof saved.company[key as keyof Company] === 'string') ||
      typeof saved.session.id !== 'string' || !Number.isFinite(saved.session.expiresAt) || saved.session.expiresAt <= Date.now() ||
      !Array.isArray(saved.datasets) || !saved.datasets.every(record => record && typeof record.key === 'string' && Number.isInteger(record.version) && record.version >= 0 && Array.isArray(record.value))) {
      clear(); return null;
    }
    return accept(saved, true);
  } catch { clear(); return null; }
}
function accept(payload: AuthPayload, reset = false) {
  if (reset || activeCompany?.id !== payload.company.id) {
    confirmedDatasets = new Map(payload.datasets.map(record => [record.key, record]));
    datasets = new Map(payload.datasets.map(record => [record.key, record.value]));
    versions = new Map(payload.datasets.map(record => [record.key, record.version]));
  }
  activeCompany = payload.company; activeSession = payload.session;
  if (payload.token) setSessionToken(payload.token);
  activeToken = sessionToken();
  cacheSession();
  return payload.company;
}
async function authenticate(path: string, body: unknown) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 15000);
  try {
    const payload = await api<AuthPayload>(path, { method: 'POST', body: JSON.stringify(body), signal: controller.signal });
    const company = accept(payload, true); announce(); return company;
  } finally { window.clearTimeout(timer); }
}
export function createCompany(companyName: string, companyEmail: string, password: string) { return authenticate('/auth/signup', { companyName, companyEmail, password }); }
export function signIn(companyEmail: string, password: string) { return authenticate('/auth/login', { companyEmail, password }); }
export function staffSignIn(email: string, accessToken: string) { return authenticate('/auth/staff', { email, accessToken }); }
export async function signOut(all = false) {
  await writes.catch(() => {});
  await api('/auth/logout', { method: 'POST', body: JSON.stringify({ all }) });
  clear(); announce();
}
export async function updateCompany(input: { companyName?: string; companyEmail?: string; currentPassword?: string; password?: string }) {
  const payload = await api<AuthPayload>('/company', { method: 'PATCH', body: JSON.stringify(input) });
  const company = accept(payload); announce(); return company;
}
export function loadCompanyData<T>(key: string, fallback: T): T { companyId(); return (datasets.get(key) as T | undefined) ?? fallback; }
export function saveCompanyData(key: string, value: unknown): Promise<void> {
  const owner = companyId();
  datasets.set(key, value);
  const write = writes.catch(() => {}).then(async () => {
    if (companyId() !== owner) throw new Error('Company session changed. Reopen the workspace.');
    const record = await api<Dataset>(`/data/${encodeURIComponent(key)}`, { method: 'PUT', body: JSON.stringify({ value, version: versions.get(key) ?? 0 }) });
    if (datasets.get(key) === value) datasets.set(key, record.value);
    versions.set(key, record.version);
    confirmedDatasets.set(key, record);
    cacheSession();
    window.dispatchEvent(new Event("company-storage-saved"));
  });
  writes = write; return write;
}
export function loadStaff() { return api<StaffMember[]>('/staff'); }
export function addStaff(input: { name: string; email: string; role: string }) { return api<StaffMember>('/staff', { method: 'POST', body: JSON.stringify(input) }); }
export function getStaffProfile() { return api<StaffMember>('/staff/profile'); }
export function saveStaffProfile(input: { name?: string; email?: string; profilePicture?: string }) { return api<StaffMember>('/staff/profile', { method: 'PUT', body: JSON.stringify(input) }); }
export function saveStaffPicture(profilePicture: string) { return saveStaffProfile({ profilePicture }); }

export function setStaffAccess(id: string, revoked: boolean) { return api<StaffMember>(`/staff/${encodeURIComponent(id)}/access`, { method: 'POST', body: JSON.stringify({ revoked }) }); }
export function deleteStaff(id: string) { return api<{ok:boolean}>(`/staff/${encodeURIComponent(id)}`, { method: 'DELETE' }); }
