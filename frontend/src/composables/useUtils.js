// 共享工具函数

export function formatDuration(ms) {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

export function formatTps(tokens, ms) {
  if (!tokens || !ms || ms <= 0) return '';
  const tps = tokens / (ms / 1000);
  if (tps >= 100) return `${tps.toFixed(0)} tok/s`;
  return `${tps.toFixed(1)} tok/s`;
}

export function formatSize(bytes) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

export function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export function tryGetHost(url) {
  try { return new URL(url).host; } catch(e) { return url; }
}

// 提取纯主机名（不含端口、不含路径），如 https://openrouter.ai/api/ → openrouter.ai
// http://192.168.5.2:11234/v1 → 192.168.5.2
export function tryGetHostname(url) {
  try { return new URL(url).hostname; } catch(e) { return url; }
}

export function detectApiType(baseUrl, model, endpoint) {
  const u = (baseUrl || '').toLowerCase();
  const m = (model || '').toLowerCase();
  const ep = (endpoint || '').toLowerCase();
  if (u.includes('anthropic') || m.includes('claude') || ep.includes('/v1/messages')) return 'anthropic';
  if (u.includes('googleapis') || u.includes('generativelanguage') || m.includes('gemini')) return 'google';
  return 'openai';
}

export const ENDPOINT_PRESETS = {
  openai:    ['', '/v1/chat/completions', '/v1/responses', '/v1/completions', '/v1/embeddings', '/v1/models'],
  anthropic: ['', '/v1/messages', '/v1/complete', '/v1/models'],
  google:    ['', '/v1beta/models/{model}:generateContent', '/v1beta/models/{model}:streamGenerateContent', '/v1/models'],
  other:     ['', '/v1/chat/completions', '/v1/messages'],
};

export function isClaudeModel(model) {
  return model.toLowerCase().includes('claude');
}

export function getApiUrl(baseUrl, endpoint, model, apiType) {
  let cleanUrl = baseUrl.trim().replace(/\/+$/, '');
  if (!endpoint || endpoint === 'auto') {
    const type = (apiType || detectApiType(baseUrl, model, '')).toLowerCase();
    let path;
    if (type === 'anthropic') path = 'v1/messages';
    else if (type === 'google') path = 'v1beta/models/{model}:generateContent';
    else path = 'v1/chat/completions';
    if (cleanUrl.endsWith('/v1')) return `${cleanUrl}/${path.substring(3)}`;
    if (cleanUrl.endsWith('/v1beta') && path.startsWith('v1beta')) return `${cleanUrl}/${path.substring(6)}`;
    return `${cleanUrl}/${path}`;
  }
  if (endpoint.includes('{model}')) endpoint = endpoint.replace('{model}', encodeURIComponent(model));
  if (endpoint.startsWith('/v1/') && cleanUrl.endsWith('/v1')) return cleanUrl + endpoint.substring(3);
  if (endpoint.startsWith('/v1beta/') && cleanUrl.endsWith('/v1beta')) return cleanUrl + endpoint.substring(7);
  return `${cleanUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
}

/** 非流式 fallback：从完整 JSON 响应提取文本内容 */
export function extractContent(respData, claude, isMessagesEndpoint, google) {
  if (claude || isMessagesEndpoint) {
    return respData.content?.filter(c => c.type === 'text').map(c => c.text).join('') || '(empty)';
  }
  if (google) {
    return (respData.candidates?.[0]?.content?.parts || []).filter(p => p.text).map(p => p.text).join('') || '(empty)';
  }
  return respData.choices?.[0]?.message?.content || '(empty)';
}

/** 非流式 fallback：从完整 JSON 响应提取 usage 元数据 */
export function extractMeta(respData, fallbackModel) {
  return {
    tokens: respData.usage?.total_tokens || respData.usage?.output_tokens || null,
    model_name: respData.model || fallbackModel,
    prompt_tokens: respData.usage?.prompt_tokens || respData.usage?.input_tokens || respData.usageMetadata?.promptTokenCount || null,
    completion_tokens: respData.usage?.completion_tokens || respData.usage?.output_tokens || respData.usageMetadata?.candidatesTokenCount || null,
  };
}

/**
 * 构建 API request body，返回 { requestBody, headers, apiUrl, claude, google, isMessagesEndpoint }
 */
export function buildApiRequest(data, messages, t) {
  let apiUrl = getApiUrl(data.base_url, data.endpoint, data.model, data.api_type);
  const claude = (data.api_type === 'anthropic') || isClaudeModel(data.model);
  const google = (data.api_type === 'google') || data.model.toLowerCase().includes('gemini');

  let requestBody;
  let systemText = '';
  let isMessagesEndpoint = false;

  if (claude) {
    isMessagesEndpoint = true;
    const sysIdx = messages.findIndex(m => m.role === 'system');
    if (sysIdx !== -1) { systemText = messages[sysIdx].content; messages = messages.filter(m => m.role !== 'system'); }
    requestBody = {
      model: data.model,
      max_tokens: data.max_tokens,
      stream: true,
      messages: messages.map(m => {
        if (typeof m.content !== 'string') {
          return {
            role: m.role,
            content: m.content.map(p => {
              if (p.type === 'text') return { type: 'text', text: p.text };
              if (p.type === 'image_url') {
                const match = p.image_url.url.match(/^data:(image\/(\w+));base64,(.+)$/);
                if (match) return { type: 'image', source: { type: 'base64', media_type: match[1], data: match[3] } };
              }
              if (p.type === 'file') {
                const match = p.data.match(/^data:([^;]+);base64,(.+)$/);
                if (match) return { type: 'document', source: { type: 'base64', media_type: match[1], data: match[2] } };
              }
              return null;
            }).filter(Boolean)
          };
        }
        return m;
      })
    };
    if (systemText) requestBody.system = systemText;
  } else if (google) {
    const sysIdx = messages.findIndex(m => m.role === 'system');
    if (sysIdx !== -1) { systemText = messages[sysIdx].content; messages = messages.filter(m => m.role !== 'system'); }
    const partsFor = (m) => {
      if (typeof m.content !== 'string' && Array.isArray(m.content)) {
        const parts = [];
        m.content.forEach(p => {
          if (p.type === 'text') parts.push({ text: p.text });
          else if (p.type === 'image_url') {
            const match = p.image_url.url.match(/^data:(image\/(\w+));base64,(.+)$/);
            if (match) parts.push({ inlineData: { mimeType: match[1], data: match[3] } });
          }
          else if (p.type === 'file') parts.push({ text: `[${t('file_attachment')}: ${p.name} (${formatSize(p.size)}) base64: ${p.data}]` });
        });
        return parts.length ? parts : [{ text: '' }];
      }
      return [{ text: String(m.content ?? '') }];
    };
    const merged = [];
    messages.forEach(m => {
      const role = m.role === 'assistant' ? 'model' : 'user';
      const parts = partsFor(m);
      const last = merged[merged.length - 1];
      if (last && last.role === role) last.parts.push(...parts);
      else merged.push({ role, parts });
    });
    requestBody = {
      contents: merged,
      generationConfig: { temperature: data.temperature, maxOutputTokens: data.max_tokens, topP: data.top_p }
    };
    requestBody.stream = true;
    if (systemText) requestBody.systemInstruction = { parts: [{ text: systemText }] };
  } else {
    const finalMessages = messages.map(m => {
      if (typeof m.content !== 'string' && Array.isArray(m.content)) {
        const parts = [];
        m.content.forEach(p => {
          if (p.type === 'text') parts.push({ type: 'text', text: p.text });
          else if (p.type === 'image_url') parts.push({ type: 'image_url', image_url: { url: p.image_url.url } });
          else if (p.type === 'file') parts.push({ type: 'text', text: `[${t('file_attachment')}: ${p.name} (${formatSize(p.size)})]` });
        });
        m.content.forEach(p => {
          if (p.type === 'file') parts.push({ type: 'text', text: `--- ${p.name} (base64) ---\n${p.data}` });
        });
        return { role: m.role, content: parts };
      }
      return m;
    });
    requestBody = {
      model: data.model,
      messages: finalMessages,
      temperature: data.temperature,
      max_tokens: data.max_tokens,
      top_p: data.top_p,
      frequency_penalty: data.frequency_penalty,
      stream: true,
    };
  }

  // Google 流式需要专用端点 + ?alt=sse 才会返回标准 SSE 格式
  if (google) {
    if (apiUrl.includes(':generateContent') && !apiUrl.includes(':streamGenerateContent')) {
      apiUrl = apiUrl.replace(':generateContent', ':streamGenerateContent?alt=sse');
    } else if (apiUrl.includes(':streamGenerateContent') && !apiUrl.includes('alt=sse')) {
      apiUrl += (apiUrl.includes('?') ? '&' : '?') + 'alt=sse';
    }
  }

  const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${data.api_key}` };
  if (claude) { headers['anthropic-version'] = '2023-06-01'; headers['x-api-key'] = data.api_key; }
  else if (google) { delete headers['Authorization']; }

  return { requestBody, headers, apiUrl, claude, google, isMessagesEndpoint };
}
