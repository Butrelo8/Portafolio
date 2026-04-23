export function getPublicApiUrl(): string {
  const url = import.meta.env.PUBLIC_API_URL;
  if (!url) throw new Error('PUBLIC_API_URL is not configured');
  return url.replace(/\/$/, '');
}

export async function apiFetch(
  path: string,
  init: RequestInit & { token?: string } = {},
): Promise<Response> {
  const { token, headers, ...rest } = init;
  const h = new Headers(headers);
  if (token) h.set('Authorization', `Bearer ${token}`);
  h.set('Accept', 'application/json');
  return fetch(`${getPublicApiUrl()}${path}`, { ...rest, headers: h });
}
