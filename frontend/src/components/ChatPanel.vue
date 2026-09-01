<script setup>
import { ref, nextTick } from 'vue';
import MessageBubble from './MessageBubble.vue';
import StreamBubble from './StreamBubble.vue';
import { api } from '../composables/useApi.js';
import { readStream } from '../composables/useStream.js';
import { buildApiRequest, extractContent, extractMeta, formatSize, isClaudeModel } from '../composables/useUtils.js';
import { PROMPT_PRESETS } from '../presetPrompts.js';

const props = defineProps({
  messages: { type: Array, default: () => [] },
  currentConvId: { type: [Number, null], default: null },
  contextEnabled: { type: Boolean, default: false },
  formData: { type: Object, required: true },
  t: { type: Function, required: true },
  currentLang: { type: String, default: 'zh' },
});

const emit = defineEmits([
  'send-complete',
  'scroll-bottom',
  'toggle-context',
  'clear-chat',
  'update:contextEnabled',
]);

const inputText = ref('');
const selectedAttachments = ref([]);
const isSending = ref(false);
const showSpinner = ref(false);
const fileInput = ref(null);
const inputEl = ref(null);
const chatHistoryEl = ref(null);

// 预设提示词
const showPresets = ref(false);
const selectedCategory = ref(0);

function togglePresets() {
  showPresets.value = !showPresets.value;
  if (showPresets.value) selectedCategory.value = 0;
}

function selectPresetCategory(idx) {
  selectedCategory.value = idx;
}

function applyPreset(prompt) {
  inputText.value = props.currentLang === 'en' ? (prompt.contentEn || prompt.content) : prompt.content;
  showPresets.value = false;
  nextTick(() => {
    inputEl.value?.focus();
    autoResize();
  });
}

// 流式气泡
const streamingContent = ref('');
const streamingMeta = ref(null);
const isStreaming = ref(false);
const streamBubbleRef = ref(null);

// ── 附件处理 ──
function handleFileSelect(event) {
  const files = event.target.files;
  for (const file of files) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const isImage = file.type.startsWith('image/');
      selectedAttachments.value.push({
        type: isImage ? 'image' : 'file',
        name: file.name,
        size: file.size,
        dataUrl: e.target.result
      });
    };
    reader.readAsDataURL(file);
  }
  event.target.value = '';
}

function removeAttachment(idx) {
  selectedAttachments.value.splice(idx, 1);
}

// ── 输入框自动高度 ──
function autoResize() {
  const ta = inputEl.value;
  if (!ta) return;
  ta.style.height = 'auto';
  ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
}

function handleKeyDown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
}

// ── 滚动 ──
function scrollToBottom() {
  nextTick(() => {
    const c = chatHistoryEl.value;
    if (c) c.scrollTop = c.scrollHeight;
  });
}

// ── 发送消息 ──
async function sendMessage() {
  const text = inputText.value.trim();
  if (!text && selectedAttachments.value.length === 0) return;

  const data = props.formData;
  if (!data.base_url || !data.api_key || !data.model) {
    alert(props.t('please_fill'));
    return;
  }
  if (!props.currentConvId) {
    alert(props.t('please_select_conv'));
    return;
  }

  const images = selectedAttachments.value.filter(a => a.type === 'image').map(a => a.dataUrl);
  const files = selectedAttachments.value.filter(a => a.type === 'file');
  let displayContent;
  if (selectedAttachments.value.length > 0) {
    displayContent = [];
    if (text) displayContent.push({ type: 'text', text });
    images.forEach(url => displayContent.push({ type: 'image_url', image_url: { url } }));
    files.forEach(f => displayContent.push({ type: 'file', name: f.name, size: f.size, data: f.dataUrl }));
  } else {
    displayContent = text;
  }

  // 保存用户消息到 DB
  await api('api/messages', {
    method: 'POST',
    body: JSON.stringify({ conversation_id: props.currentConvId, role: 'user', content: displayContent, images })
  });

  // 立即渲染用户消息
  props.messages.push({ role: 'user', content: displayContent, images });
  scrollToBottom();

  // 清空输入
  inputText.value = '';
  selectedAttachments.value = [];
  autoResize();

  // 显示 spinner
  showSpinner.value = true;
  isSending.value = true;

  const startTime = performance.now();
  let startTime2 = 0;
  let ttfb = 0;
  let firstChunkTime = 0;
  let lastChunkTime = 0;
  let streamedContent = '';
  let streamMeta = {};

  try {
    // 构建 messages
    let messages = [];
    if (props.contextEnabled) {
      const history = await api(`api/conversations/${props.currentConvId}/messages`);
      history.forEach(m => {
        if (m.role === 'system') return;
        let c = m.content;
        try { c = JSON.parse(m.content); } catch(e) {}
        let msgText = '';
        if (typeof c === 'string') msgText = c;
        else if (Array.isArray(c)) msgText = c.filter(p => p.type === 'text').map(p => p.text).join('');
        if (msgText) messages.push({ role: m.role, content: msgText });
      });
    } else {
      let msgText = '';
      if (typeof displayContent === 'string') msgText = displayContent;
      else if (Array.isArray(displayContent)) msgText = displayContent.filter(p => p.type === 'text').map(p => p.text).join('');
      messages.push({ role: 'user', content: msgText });
    }

    if (data.system_prompt) messages.unshift({ role: 'system', content: data.system_prompt });

    // 附加多模态内容到最后一条 user 消息
    if (Array.isArray(displayContent) && displayContent.some(p => p.type === 'image_url' || p.type === 'file')) {
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === 'user') { messages[i].content = displayContent; break; }
      }
    }

    const { requestBody, headers, apiUrl, claude, google, isMessagesEndpoint } = buildApiRequest(data, messages, props.t);

    // 创建流式气泡
    isStreaming.value = true;
    streamingContent.value = '';
    streamingMeta.value = null;
    scrollToBottom();

    startTime2 = performance.now();

    const response = await fetch(apiUrl, { method: 'POST', headers, body: JSON.stringify(requestBody) });
    ttfb = performance.now() - startTime2;

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: { message: response.statusText } }));
      throw new Error(`API ${response.status}: ${errorData?.error?.message || response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('text/event-stream') || contentType.includes('text/plain')) {
      // ── 流式路径 ──
      await readStream(response, {
        onText: (text) => {
          if (!firstChunkTime) firstChunkTime = performance.now();
          lastChunkTime = performance.now();
          streamedContent += text;
          streamBubbleRef.value?.throttleUpdate(streamedContent);
          scrollToBottom();
        },
        onMeta: (m) => { streamMeta = { ...streamMeta, ...m }; },
        onDone: () => {},
      });

      // 流结束后 Markdown 渲染
      streamBubbleRef.value?.finalUpdate(streamedContent);
      scrollToBottom();
    } else {
      // ── 非流式 fallback ──
      const respData = await response.json();
      streamedContent = extractContent(respData, claude, isMessagesEndpoint, google);
      streamMeta = extractMeta(respData, data.model);
      streamBubbleRef.value?.finalUpdate(streamedContent);
      scrollToBottom();
    }

    const decodeMs = lastChunkTime > 0 ? lastChunkTime - firstChunkTime : 0;
    const elapsed = ttfb + decodeMs;

    streamMeta.model_name = streamMeta.model_name || data.model;
    if (!streamMeta.completion_tokens) {
      streamMeta.completion_tokens = Math.max(1, Math.round(streamedContent.length / 4));
    }

    const meta = {
      duration_ms: elapsed,
      tokens: streamMeta.tokens || (streamMeta.prompt_tokens && streamMeta.completion_tokens ? streamMeta.prompt_tokens + streamMeta.completion_tokens : streamMeta.completion_tokens),
      model_name: streamMeta.model_name,
      prompt_tokens: streamMeta.prompt_tokens || null,
      completion_tokens: streamMeta.completion_tokens || null,
      prefill_ms: ttfb,
      decode_ms: decodeMs,
    };

    streamBubbleRef.value?.setMeta(meta);

    // 保存助手消息到 DB
    await api(`api/conversations/${props.currentConvId}`, {
      method: 'PUT',
      body: JSON.stringify({ last_config: JSON.stringify(data) })
    });

    await api('api/messages', {
      method: 'POST',
      body: JSON.stringify({
        conversation_id: props.currentConvId,
        role: 'assistant',
        content: streamedContent,
        duration_ms: meta.duration_ms,
        tokens: meta.tokens,
        model_name: meta.model_name,
        prompt_tokens: meta.prompt_tokens,
        completion_tokens: meta.completion_tokens,
        prefill_ms: meta.prefill_ms,
        decode_ms: meta.decode_ms,
      })
    });

    // 将流式消息转为正式消息
    isStreaming.value = false;
    props.messages.push({
      role: 'assistant',
      content: streamedContent,
      duration_ms: meta.duration_ms,
      tokens: meta.tokens,
      model_name: meta.model_name,
      prompt_tokens: meta.prompt_tokens,
      completion_tokens: meta.completion_tokens,
      prefill_ms: meta.prefill_ms,
      decode_ms: meta.decode_ms,
    });

    // 自动标题
    if (text && text.length <= 30) {
      emit('send-complete', { title: text.substring(0, 30) });
    } else {
      emit('send-complete', {});
    }

  } catch (error) {
    if (streamedContent) {
      // 流式已经开始输出再报错，保留已输出内容
      const meta = { duration_ms: performance.now() - startTime2, model_name: data.model };
      streamBubbleRef.value?.setMeta(meta);
      isStreaming.value = false;
      await api('api/messages', {
        method: 'POST',
        body: JSON.stringify({
          conversation_id: props.currentConvId,
          role: 'assistant',
          content: streamedContent + `\n\n[${props.t('request_failed')}: ${error.message}]`,
          is_error: true,
          duration_ms: performance.now() - startTime2,
          model_name: data.model,
        })
      });
      props.messages.push({
        role: 'assistant',
        content: streamedContent + `\n\n[${props.t('request_failed')}: ${error.message}]`,
        is_error: true,
        duration_ms: performance.now() - startTime2,
        model_name: data.model,
      });
    } else {
      const elapsed = performance.now() - startTime;
      const errContent = `${props.t('request_failed')}: ${error.message}`;
      isStreaming.value = false;
      await api('api/messages', {
        method: 'POST',
        body: JSON.stringify({
          conversation_id: props.currentConvId,
          role: 'assistant',
          content: errContent,
          is_error: true,
          duration_ms: elapsed
        })
      });
      props.messages.push({
        role: 'assistant',
        content: errContent,
        is_error: true,
        duration_ms: elapsed
      });
    }
    scrollToBottom();
    emit('send-complete', {});
  } finally {
    showSpinner.value = false;
    isSending.value = false;
    inputEl.value?.focus();
  }
}

// 暴露给父组件
defineExpose({ scrollToBottom, sendMessage });
</script>

<template>
  <main class="flex-1 flex flex-col overflow-hidden">
    <!-- 聊天历史 -->
    <div ref="chatHistoryEl" class="flex-1 overflow-y-auto px-6 py-4 space-y-3">
      <MessageBubble
        v-for="(msg, i) in messages"
        :key="i"
        :message="msg"
        :is-user="msg.role === 'user'"
        :is-error="msg.is_error"
        :t="t"
      />
      <!-- 流式输出气泡 -->
      <StreamBubble v-if="isStreaming" ref="streamBubbleRef" />
    </div>

    <!-- Spinner -->
    <div v-if="showSpinner" class="self-start px-6">
      <div class="inline-flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl rounded-bl-sm">
        <i class="fas fa-spinner spin text-gray-400 text-sm"></i>
        <span class="text-sm text-gray-400">{{ t('waiting_response') }}</span>
      </div>
    </div>

    <!-- 输入区 -->
    <div class="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-4 py-2.5 shrink-0">
      <!-- 附件预览 -->
      <div v-if="selectedAttachments.length > 0" class="flex gap-2 flex-wrap mb-2">
        <template v-for="(att, idx) in selectedAttachments" :key="idx">
          <div v-if="att.type === 'image'" class="relative w-16 h-16 rounded-md overflow-hidden border border-gray-200 dark:border-gray-600">
            <img :src="att.dataUrl" class="w-full h-full object-cover">
            <button @click="removeAttachment(idx)"
              class="absolute top-0.5 right-0.5 w-4 h-4 bg-black/50 text-white rounded-full flex items-center justify-center text-[8px]"
            ><i class="fas fa-times"></i></button>
          </div>
          <div v-else class="relative flex items-center gap-2 max-w-[200px] px-2.5 py-1.5 rounded-md border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700">
            <i class="fas fa-file text-gray-400 text-sm"></i>
            <span class="text-[11px] text-gray-600 dark:text-gray-300 truncate">{{ att.name }}</span>
            <span class="text-[10px] text-gray-400 shrink-0">{{ formatSize(att.size) }}</span>
            <button @click="removeAttachment(idx)"
              class="w-4 h-4 bg-black/50 text-white rounded-full flex items-center justify-center text-[8px] shrink-0"
            ><i class="fas fa-times"></i></button>
          </div>
        </template>
      </div>

      <!-- 预设提示词面板 -->
      <div v-if="showPresets" class="mb-2 border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden bg-white dark:bg-gray-800 shadow-md">
        <div class="flex max-h-64">
          <!-- 左栏：分类 -->
          <div class="w-32 shrink-0 border-r border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 overflow-y-auto">
            <button v-for="(cat, idx) in PROMPT_PRESETS" :key="cat.category"
              @click="selectPresetCategory(idx)"
              :class="[
                'w-full flex items-center gap-1.5 px-2.5 py-2 text-xs text-left transition border-l-2',
                selectedCategory === idx
                  ? 'border-indigo-500 bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 font-medium'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              ]"
            >
              <i :class="['fas', cat.icon, 'text-center w-3.5']"></i>
              <span class="truncate">{{ t('preset_cat_' + cat.category) }}</span>
            </button>
          </div>
          <!-- 右栏：提示词列表 -->
          <div class="flex-1 overflow-y-auto">
            <div v-for="p in PROMPT_PRESETS[selectedCategory]?.prompts" :key="p.name"
              @click="applyPreset(p)"
              class="px-3 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-500/20 hover:text-indigo-700 dark:hover:text-indigo-300 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-b-0 transition"
            >
              {{ t(p.name) }}
            </div>
          </div>
         </div>
      </div>

      <!-- 输入框 + 按钮 -->
      <div class="flex gap-2 items-center">
        <textarea ref="inputEl" v-model="inputText" rows="1"
          :placeholder="t('input_placeholder')"
          @keydown="handleKeyDown"
          @input="autoResize"
          class="flex-1 px-3 py-2.5 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg resize-none outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 min-h-[42px] max-h-120"
        ></textarea>
        <!-- 预设提示词按钮 -->
        <button @click="togglePresets"
          :class="['w-10 h-10 shrink-0 border rounded-lg flex items-center justify-center transition', showPresets ? 'border-indigo-500 text-indigo-500' : 'border-gray-300 dark:border-gray-600 text-gray-400 hover:border-indigo-500 hover:text-indigo-500']"
          :title="t('preset_prompts')"
        ><i class="fas fa-flask"></i></button>
        <button @click="fileInput?.click()"
          class="w-10 h-10 shrink-0 border border-gray-300 dark:border-gray-600 rounded-lg flex items-center justify-center text-gray-400 hover:border-indigo-500 hover:text-indigo-500 transition"
          :title="t('upload_file')"
        ><i class="fas fa-paperclip"></i></button>
        <button @click="sendMessage" :disabled="isSending"
          class="w-10 h-10 shrink-0 bg-indigo-500 text-white rounded-lg flex items-center justify-center hover:bg-indigo-600 transition disabled:opacity-50"
          :title="t('send')"
        ><i class="fas fa-paper-plane"></i></button>
      </div>
      <input ref="fileInput" type="file" multiple class="hidden" @change="handleFileSelect">

      <!-- 底部栏 -->
      <div class="flex items-center justify-between mt-1.5 text-[11px] text-gray-400">
        <span class="whitespace-nowrap overflow-hidden text-ellipsis pr-3">{{ t('support_hint') }}</span>
        <div class="flex items-center gap-4 shrink-0 pl-3 border-l border-gray-200 dark:border-gray-700">
          <label class="flex items-center gap-1.5 cursor-pointer select-none" :title="t('context_hint')">
            <span>{{ t('context') }}</span>
            <span class="relative inline-block w-9 h-5">
              <input type="checkbox" :checked="contextEnabled" @change="$emit('update:contextEnabled', $event.target.checked)" class="sr-only peer">
              <span class="toggle-bg peer-checked:bg-indigo-500 block w-9 h-5 bg-gray-300 rounded-full relative">
                <span class="toggle-dot absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full"></span>
              </span>
            </span>
          </label>
          <button @click="$emit('clear-chat')"
            class="flex items-center gap-1 px-1.5 py-0.5 text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 rounded transition"
            :title="t('clear')"
          ><i class="fas fa-trash-alt"></i> <span>{{ t('clear') }}</span></button>
        </div>
      </div>
    </div>
  </main>
</template>
