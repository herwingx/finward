const API_URL = '/api';

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
    const err = await res.json().catch(() => ({} as Record<string, unknown>));
    const message = (err as { message?: string }).message ?? `HTTP ${res.status}`;
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const isFormData = options?.body instanceof FormData;
  const headers = isFormData ? getAuthHeaders(true) : getAuthHeaders();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { ...headers, ...(isFormData ? {} : options?.headers) } as HeadersInit,
  });
  return handleResponse<T>(res);
}

export async function apiFetchNoJson(path: string, options?: RequestInit): Promise<void> {
  const isFormData = options?.body instanceof FormData;
  const headers = isFormData ? getAuthHeaders(true) : getAuthHeaders();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { ...headers, ...(isFormData ? {} : options?.headers) } as HeadersInit,
  });
  if (res.status === 401) {
    localStorage.removeItem('token');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({} as Record<string, unknown>));
    const message = (err as { message?: string }).message ?? `HTTP ${res.status}`;
    throw new Error(message);
  }
}
