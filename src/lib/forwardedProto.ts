export function isHttps(headers: Headers): boolean {
  return headers.get('x-forwarded-proto') === 'https';
}

export function forwardedProto(headers: Headers): 'http' | 'https' {
  return isHttps(headers) ? 'https' : 'http';
}
