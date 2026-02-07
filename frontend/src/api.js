const API_BASE = (import.meta.env.VITE_API_URL || '') + '/api';

export function getApiBase() {
  return import.meta.env.VITE_API_URL || '';
}

function getAdminToken() {
  try {
    return typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('adminToken') : null;
  } catch { return null; }
}

function api(path, options = {}) {
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  const token = getAdminToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const opts = {
    ...options,
    headers,
    credentials: 'include',
  };
  return fetch(url, opts).then(async (res) => {
    const contentType = res.headers.get('content-type') || '';
    let data = {};
    if (contentType.includes('application/json')) {
      data = await res.json().catch(() => ({}));
    } else {
      const text = await res.text();
      if (text.trimStart().startsWith('<')) {
        throw new Error('Backend is not running or returned an error. Start it from the project folder: cd backend && npm run dev');
      }
      try { data = JSON.parse(text); } catch (_) { /* leave {} */ }
    }
    if (!res.ok) {
      const isLoginRequest = res.url && res.url.includes('/auth/login');
      if (res.status === 401 && !isLoginRequest && typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')) {
        try { sessionStorage.removeItem('adminToken'); } catch (_) {}
        window.location.href = '/admin/login?session=expired';
        return;
      }
      throw new Error(data.error || res.statusText);
    }
    return data;
  });
}

export { getAdminToken };
export const apiGet = (path) => api(path, { method: 'GET' });
export const apiPost = (path, body) => api(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined });
export const apiPut = (path, body) => api(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined });
export const apiDelete = (path, body) => api(path, { method: 'DELETE', body: body ? JSON.stringify(body) : undefined });

export function getImageUrl(imageUrl) {
  if (!imageUrl) return null;
  if (imageUrl.startsWith('http')) return imageUrl;
  const path = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
  const base = import.meta.env.VITE_API_URL || '';
  return base ? `${base}${path}` : path;
}

/** Returns array of image URLs from a car (imageUrls array or legacy imageUrl). */
export function getCarImages(car) {
  if (!car) return [];
  const urls = car.imageUrls && car.imageUrls.length ? car.imageUrls : (car.imageUrl ? [car.imageUrl] : []);
  return urls.filter(Boolean);
}
