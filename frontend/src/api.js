const API_BASE = '/api';

function api(path, options = {}) {
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  const opts = {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
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
        window.location.href = '/admin/login?session=expired';
        return;
      }
      throw new Error(data.error || res.statusText);
    }
    return data;
  });
}

export const apiGet = (path) => api(path, { method: 'GET' });
export const apiPost = (path, body) => api(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined });
export const apiPut = (path, body) => api(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined });
export const apiDelete = (path, body) => api(path, { method: 'DELETE', body: body ? JSON.stringify(body) : undefined });

export function getImageUrl(imageUrl) {
  if (!imageUrl) return null;
  if (imageUrl.startsWith('http')) return imageUrl;
  return imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
}

/** Returns array of image URLs from a car (imageUrls array or legacy imageUrl). */
export function getCarImages(car) {
  if (!car) return [];
  const urls = car.imageUrls && car.imageUrls.length ? car.imageUrls : (car.imageUrl ? [car.imageUrl] : []);
  return urls.filter(Boolean);
}
