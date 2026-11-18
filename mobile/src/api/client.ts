import AsyncStorage from '@react-native-async-storage/async-storage';

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || 'https://kortaz-app.vercel.app';

const TOKEN_KEY = 'kortaz_session_token';

export interface MobileBranch {
  id: string;
  name: string;
  address?: string;
}

export interface MobileService {
  id: string;
  branch_id?: string | null;
  name: string;
  category: string;
  audience?: 'male' | 'female' | 'unisex';
  duration_minutes: number;
  price: number;
}

export interface MobileBarber {
  id: string;
  branch_id: string;
  name: string;
  specialty: string;
  audience_focus?: 'male' | 'female' | 'unisex';
}

export interface ShowcasePayload {
  tenant: { id: string; name: string; slug: string; status: string };
  branches: MobileBranch[];
  services: MobileService[];
  barbers: MobileBarber[];
}

export interface AvailabilitySlot {
  time: string;
  startsAt: string;
  endsAt: string;
  barberId: string;
  barberName: string;
  available: boolean;
}

export interface MobileAppointment {
  id: string;
  branch_id: string;
  barber_id: string;
  customer_id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  total_amount: number;
}

export interface MobileWorkspaceState {
  session: {
    roleCode: string;
    profile: { id: string; full_name: string; email: string };
  };
  tenant: { id: string; name: string; slug: string };
  barbers: MobileBarber[];
  services: MobileService[];
  customers: { id: string; full_name: string; phone?: string }[];
  appointments: MobileAppointment[];
  plan: { name: string };
}

async function getStoredToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setStoredToken(token: string | null): Promise<void> {
  try {
    if (token) {
      await AsyncStorage.setItem(TOKEN_KEY, token);
    } else {
      await AsyncStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> | undefined),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || `Erro HTTP ${res.status}`);
  }
  return data as T;
}

export function fetchShowcase(slug = 'barbearia-exclusiva'): Promise<ShowcasePayload> {
  return apiFetch<ShowcasePayload>(`/api/public/showcase?slug=${encodeURIComponent(slug)}`);
}

export function fetchAvailability(params: {
  slug: string;
  branchId: string;
  date: string;
  barberId?: string | null;
  serviceIds: string[];
}): Promise<{ slots: AvailabilitySlot[] }> {
  const qs = new URLSearchParams({
    slug: params.slug,
    branchId: params.branchId,
    date: params.date,
    serviceIds: params.serviceIds.join(','),
  });
  if (params.barberId) qs.set('barberId', params.barberId);
  return apiFetch<{ slots: AvailabilitySlot[] }>(`/api/availability?${qs.toString()}`);
}

export function createPublicAppointment(payload: {
  tenantId: string;
  branchId: string;
  barberId: string;
  serviceIds: string[];
  startsAt: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
}): Promise<{ appointment: MobileAppointment }> {
  return apiFetch<{ appointment: MobileAppointment }>('/api/appointments', {
    method: 'POST',
    body: JSON.stringify({
      tenantId: payload.tenantId,
      branchId: payload.branchId,
      barberId: payload.barberId,
      serviceIds: payload.serviceIds,
      startsAt: payload.startsAt,
      source: 'public_web',
      customerName: payload.customerName,
      customerPhone: payload.customerPhone,
      customerEmail: payload.customerEmail,
    }),
  });
}

export async function loginMobile(email: string, password: string): Promise<void> {
  const res = await apiFetch<{ ok: boolean; token?: string }>('/api/auth', {
    method: 'POST',
    body: JSON.stringify({ action: 'login', email, password }),
  });
  if (res.token) {
    await setStoredToken(res.token);
  }
}

export async function logoutMobile(): Promise<void> {
  await setStoredToken(null);
}

export function fetchWorkspaceState(): Promise<MobileWorkspaceState> {
  return apiFetch<MobileWorkspaceState>('/api/state');
}

export function updateAppointmentStatus(
  id: string,
  status: 'confirmed' | 'in_progress' | 'completed' | 'cancelled'
): Promise<{ appointment: MobileAppointment }> {
  return apiFetch<{ appointment: MobileAppointment }>(`/api/appointments/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}
