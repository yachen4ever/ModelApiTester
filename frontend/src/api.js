// API 客户端 - 自动检测环境，Web 走 fetch，Tauri 走 invoke

const isTauri = typeof window !== 'undefined' && window.__TAURI_INTERNALS__ !== undefined;

/**
 * 统一 API 调用
 * @param {string} path - API 路径 (如 'api/conversations')
 * @param {object} options - { method, body, headers }
 */
export async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };

  if (isTauri) {
    const { invoke } = await import('@tauri-apps/api/core');
    const method = (options.method || 'GET').toUpperCase();
    let body = null;
    if (options.body) {
      try { body = JSON.parse(options.body); } catch { body = options.body; }
    }
    return await invoke('api_request', { path, method, body });
  }

  // Web 版：直接 fetch（BASE_URL 在构建时由 Vite 注入，dev='/' prod='/api-tester-rust/'）
  const base = import.meta.env.BASE_URL; // 末尾带 /
  const url = base + path;
  const res = await fetch(url, { ...options, headers });
  return res.json();
}
