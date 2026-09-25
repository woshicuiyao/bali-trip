const apiBase = (import.meta.env.VITE_TRIP_API_URL || '').replace(/\/$/, '');

/** Invitation tokens stay in the URL fragment/session, never in public bundles. */
export async function tripFetch(path: '/trip' | '/share', init: RequestInit = {}) {
  if (!apiBase) throw new Error('行程服务正在迁移，请稍后再打开完整邀请链接。');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`${apiBase}${path}`, {
      ...init, cache: 'no-store', credentials: 'omit', signal: controller.signal,
    });
    if (!response.headers.get('content-type')?.includes('application/json')) {
      throw new Error('行程服务暂时无法连接，请稍后重试。');
    }
    return response;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('连接行程服务超时，请检查网络后重试。');
    }
    if (error instanceof TypeError) throw new Error('无法连接共享行程，请检查网络后重试。');
    throw error;
  } finally { clearTimeout(timer); }
}
