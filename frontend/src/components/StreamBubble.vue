<script setup>
import { ref, computed, watch, onUnmounted } from 'vue';
import { Converter } from 'showdown';
import { formatDuration, formatTps } from '../composables/useUtils.js';

const props = defineProps({
  content: { type: String, default: '' },
  meta: { type: Object, default: null },
  streaming: { type: Boolean, default: true },
});

const converter = new Converter({ tables: true, strikethrough: true, simpleLineBreaks: true });

const streamText = ref('');
const displayHtml = ref('');
const isStreaming = ref(true);
const showCursor = ref(true);
const finalizeMeta = ref(null);

let rafScheduled = false;
let pendingText = '';

// 外部调用：流式期间轻量更新（textContent 零开销）
function throttleUpdate(text) {
  pendingText = text;
  if (rafScheduled) return;
  rafScheduled = true;
  requestAnimationFrame(() => {
    rafScheduled = false;
    streamText.value = pendingText;
  });
}

// 外部调用：流结束后全量 Markdown 渲染
function finalUpdate(text) {
  streamText.value = '';
  displayHtml.value = converter.makeHtml(text);
  showCursor.value = false;
  isStreaming.value = false;
}

// 外部调用：设置 meta
function setMeta(meta) {
  finalizeMeta.value = meta;
}

// 外部调用：移除
function remove() {
  // Vue 由父组件 v-if 控制
}

defineExpose({ throttleUpdate, finalUpdate, setMeta, remove });

const metaParts = computed(() => {
  const m = finalizeMeta.value;
  if (!m) return [];
  const parts = [];

  if (m.prefill_ms || m.decode_ms) {
    const items = [];
    if (m.prefill_ms) {
      let s = `prefill ${formatDuration(m.prefill_ms)}`;
      if (m.prompt_tokens) s += ` · ${m.prompt_tokens} tok`;
      if (m.prefill_ms > 0) s += ` · ${formatTps(m.prompt_tokens, m.prefill_ms)}`;
      items.push(s);
    }
    if (m.decode_ms) {
      let s = `decode ${formatDuration(m.decode_ms)}`;
      if (m.completion_tokens) s += ` · ${m.completion_tokens} tok`;
      if (m.decode_ms > 0) s += ` · ${formatTps(m.completion_tokens, m.decode_ms)}`;
      items.push(s);
    }
    parts.push({ icon: 'split', items });
  } else if (m.duration_ms) {
    const items = [formatDuration(m.duration_ms)];
    if (m.tokens) items.push(`${m.tokens} tokens`);
    parts.push({ icon: 'clock', items });
  }

  if (m.model_name || (m.duration_ms && (m.prefill_ms || m.decode_ms))) {
    const items = [];
    if (m.prefill_ms && m.decode_ms) items.push(`total ${formatDuration(m.duration_ms)}`);
    if (m.model_name) items.push(m.model_name);
    parts.push({ icon: 'chip', items });
  }

  return parts;
});
</script>

<template>
  <div class="flex flex-col items-start">
    <div class="max-w-[75%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-bl-md">
      <!-- 流式期间显示纯文本 -->
      <div v-if="isStreaming" style="white-space: pre-wrap;">{{ streamText }}</div>
      <!-- 流结束后显示 Markdown -->
      <div v-else class="md-content" v-html="displayHtml"></div>
      <!-- 光标动画 -->
      <span v-if="showCursor" class="inline-block w-1.5 h-4 bg-indigo-400 ml-0.5 align-middle" style="animation: blink 1s steps(2) infinite;"></span>
    </div>

    <div v-if="metaParts.length > 0" class="text-[11px] text-gray-400 mt-1 flex flex-col gap-0.5 items-start">
      <div v-for="(mp, i) in metaParts" :key="i" class="flex gap-3">
        <span v-for="(item, j) in mp.items" :key="j">
          <i v-if="mp.icon === 'split'" class="fas fa-arrow-down mr-0.5" v-show="j === 0"></i>
          <i v-if="mp.icon === 'split'" class="fas fa-arrow-up mr-0.5" v-show="j === 1"></i>
          <i v-if="mp.icon === 'clock'" class="fas fa-clock mr-0.5"></i>
          <i v-if="mp.icon === 'chip'" class="fas fa-microchip mr-0.5" v-show="j === 0 && mp.items.length > 1"></i>
          <i v-if="mp.icon === 'chip'" class="fas fa-microchip mr-0.5" v-show="j === 1"></i>
          {{ item }}
        </span>
      </div>
    </div>
  </div>
</template>
