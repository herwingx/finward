export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
const API_URL = API_BASE_URL;
const FETCH_TIMEOUT_MS = 25000;

export function getAuthHeaders(omitContentType?: boolean): HeadersInit {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };
  if (!omitContentType) {
    headers['Content-Type'] = 'application/json';
  }
  return headers;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (res.status === 401) {
    localStorage.removeItem('token');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({} as Record<string, unknown>)) as { message?: string; error?: string };
    const message = err.message ?? err.error ?? `HTTP ${res.status}`;
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const isFormData = options?.body instanceof FormData;
    const headers = isFormData ? getAuthHeaders(true) : getAuthHeaders();
    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      signal: controller.signal,
      headers: { ...headers, ...(isFormData ? {} : options?.headers) } as HeadersInit,
    });
    clearTimeout(timeoutId);
    return handleResponse<T>(res);
  } catch (e) {
    clearTimeout(timeoutId);
    if (e instanceof DOMException && e.name === 'AbortError') {
      throw new Error('El servidor tardó demasiado. Intenta de nuevo.');
    }
    throw e;
  }
}

export async function apiFetchNoJson(path: string, options?: RequestInit): Promise<void> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const isFormData = options?.body instanceof FormData;
    const headers = isFormData ? getAuthHeaders(true) : getAuthHeaders();
    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      signal: controller.signal,
      headers: { ...headers, ...(isFormData ? {} : options?.headers) } as HeadersInit,
    });
    clearTimeout(timeoutId);
    if (res.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
      throw new Error('Unauthorized');
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({} as Record<string, unknown>)) as { message?: string; error?: string };
      const message = err.message ?? err.error ?? `HTTP ${res.status}`;
      throw new Error(message);
    }
  } catch (e) {
    clearTimeout(timeoutId);
    if (e instanceof DOMException && e.name === 'AbortError') {
      throw new Error('El servidor tardó demasiado. Intenta de nuevo.');
    }
    throw e;
  }
}
