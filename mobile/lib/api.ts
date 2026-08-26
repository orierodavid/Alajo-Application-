import { supabase } from './auth'

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? ''

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { data } = supabase ? await supabase.auth.getSession() : { data: { session: null } }
  const headers: Record<string,string> = { 'Content-Type': 'application/json', ...(init.headers as Record<string,string> ?? {}) }
  if (data.session?.access_token) headers.Authorization = `Bearer ${data.session.access_token}`
  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers })
  const body = await response.json().catch(() => null)
  if (!response.ok) throw new Error(body?.error?.message ?? body?.message ?? 'Request failed')
  return body as T
}

export type Bootstrap = { profile?: Record<string, unknown> | null; kyc?: Record<string, unknown> | null; virtualAccount?: Record<string, unknown> | null; wallet?: Record<string, unknown> | null }
export function getBootstrap() { return apiFetch<Bootstrap>('/api/v1/me/bootstrap') }
export function getTransactions(cursor?: string) { return apiFetch(`/api/v1/me/transactions${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`) }
export function getContributions() { return apiFetch('/api/v1/me/contributions') }
export function getGroups() { return apiFetch('/api/v1/me/groups') }
export function getNotifications() { return apiFetch('/api/v1/me/notifications') }
export function getPayouts() { return apiFetch('/api/v1/me/payouts') }
