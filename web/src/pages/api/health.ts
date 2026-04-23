import type { APIRoute } from 'astro';
import { apiFetch } from '../../lib/api';

export const GET: APIRoute = async () => {
  const res = await apiFetch('/health');
  const body = await res.text();
  return new Response(body, {
    status: res.status,
    headers: { 'content-type': res.headers.get('content-type') ?? 'application/json' },
  });
};
