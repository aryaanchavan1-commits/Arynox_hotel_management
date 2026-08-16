const getBase = () => {
  try {
    const v = localStorage.getItem('api_base_url') || '';
    return v.replace(/\/+$/, '');
  } catch {
    return '';
  }
};

export const TOKEN_KEY = 'arynox_token';
export const GUEST_TOKEN_KEY = 'arynox_guest_token';
export const USER_KEY = 'arynox_user';

const token = () => localStorage.getItem(TOKEN_KEY) || '';
const guestToken = () => localStorage.getItem(GUEST_TOKEN_KEY) || '';

export async function api(method, path, body, useGuest = false) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 25000);
  try {
    const res = await fetch(getBase() + '/api' + path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + (useGuest ? guestToken() : token()),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || res.statusText);
    return data;
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('Server took too long to respond');
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

export const get = (p, useGuest) => api('GET', p, undefined, useGuest);
export const post = (p, b, useGuest) => api('POST', p, b, useGuest);
export const put = (p, b, useGuest) => api('PUT', p, b, useGuest);
export const del = (p, useGuest) => api('DELETE', p, undefined, useGuest);
export { getBase };