// API 客户端 - 自动检测环境，Web 走 fetch，Tauri 走 invoke

const isTauri = typeof window !== 'undefined' && window.__TAURI_INTERNALS__ !== undefined;

let accessToken = sessionStorage.getItem('accessToken') || '';

export function getAccessToken() { return accessToken; }
export function setAccessToken(val) {
  accessToken = val;
  if (val) sessionStorage.setItem('accessToken', val);
  else sessionStorage.removeItem('accessToken');
}

/**
 * 统一 API 调用
 * @param {string} path - API 路径 (如 'api/conversations')
 * @param {object} options - { method, body, headers }
 */
export async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (accessToken) headers['X-Auth-Password'] = accessToken;

  if (isTauri) {
    // Tauri 桌面版预留：通过 invoke 调用 Rust 后端
    const { invoke } = await import('@tauri-apps/api/core');
    const method = (options.method || 'GET').toUpperCase();
    let body = null;
    if (options.body) {
      try { body = JSON.parse(options.body); } catch { body = options.body; }
    }
    const result = await invoke('api_request', { path, method, body });
    if (result && result.__error) {
      if (result.status === 401) { showAuthCallback?.(); throw new Error('Unauthorized'); }
      throw new Error(result.message || 'Request failed');
    }
    return result;
  }

  // Web 版：直接 fetch
  const res = await fetch(path, { ...options, headers });
  if (res.status === 401) {
    showAuthCallback?.();
    throw new Error('Unauthorized');
  }
  return res.json();
}

let showAuthCallback = null;
export function onAuthRequired(cb) { showAuthCallback = cb; }
