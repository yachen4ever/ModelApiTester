// 流式响应解析器 — 支持 OpenAI / Anthropic / Google 三种 SSE 格式

/**
 * 解析 SSE 流，逐 chunk 回调
 * @param {Response} response - fetch 返回的 Response
 * @param {object} handlers
 * @param {function(string): void} handlers.onText - 收到文本增量
 * @param {function(object): void} handlers.onMeta - 收到 usage 等元数据
 * @param {function(): void} handlers.onDone - 流结束
 */
export async function readStream(response, { onText, onMeta, onDone }) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data:')) continue;

        const data = trimmed.slice(5).trim();
        if (data === '[DONE]') { onDone(); return; }

        let json;
        try { json = JSON.parse(data); } catch { continue; }

        parseChunk(json, { onText, onMeta });
      }
    }
    // 处理 buffer 中残余数据
    if (buffer.trim().startsWith('data:')) {
      const data = buffer.trim().slice(5).trim();
      if (data && data !== '[DONE]') {
        try {
          const json = JSON.parse(data);
          parseChunk(json, { onText, onMeta });
        } catch {}
      }
    }
    onDone();
  } finally {
    reader.releaseLock();
  }
}

function parseChunk(json, { onText, onMeta }) {
  // ── OpenAI 格式 ──
  if (json.choices) {
    const delta = json.choices[0]?.delta;
    if (delta?.content) onText(delta.content);
    if (json.usage) onMeta(extractOpenAIUsage(json.usage));
    return;
  }

  // ── Anthropic 格式 ──
  if (json.type) {
    if (json.type === 'content_block_delta' && json.delta?.type === 'text_delta') {
      onText(json.delta.text);
    } else if (json.type === 'message_start' && json.message?.usage) {
      onMeta({ prompt_tokens: json.message.usage.input_tokens });
    } else if (json.type === 'message_delta' && json.usage) {
      onMeta({ completion_tokens: json.usage.output_tokens });
    }
    return;
  }

  // ── Google Gemini 格式 ──
  if (json.candidates) {
    const parts = json.candidates[0]?.content?.parts || [];
    for (const p of parts) {
      if (p.text) onText(p.text);
    }
    if (json.usageMetadata) {
      onMeta(extractGeminiUsage(json.usageMetadata));
    }
    return;
  }
}

function extractOpenAIUsage(u) {
  return {
    prompt_tokens: u.prompt_tokens ?? null,
    completion_tokens: u.completion_tokens ?? null,
    tokens: u.total_tokens ?? null,
  };
}

function extractGeminiUsage(u) {
  return {
    prompt_tokens: u.promptTokenCount ?? null,
    completion_tokens: u.candidatesTokenCount ?? null,
    tokens: u.totalTokenCount ?? null,
  };
}
