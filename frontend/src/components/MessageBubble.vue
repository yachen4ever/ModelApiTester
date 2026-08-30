<script setup>
import { computed } from 'vue';
import { Converter } from 'showdown';
import { formatDuration, formatTps, formatSize } from '../composables/useUtils.js';

const props = defineProps({
  message: { type: Object, required: true },
  isUser: { type: Boolean, default: false },
  isError: { type: Boolean, default: false },
  t: { type: Function, required: true },
});

const converter = new Converter({ tables: true, strikethrough: true, simpleLineBreaks: true });

const parsedContent = computed(() => {
  let content = props.message.content;
  try { content = JSON.parse(props.message.content); } catch(e) { }
  return content;
});

const htmlParts = computed(() => {
  const parts = [];
  const content = parsedContent.value;

  if (typeof content === 'string') {
    if (props.isUser) {
      parts.push({ type: 'text-plain', text: content });
    } else {
      parts.push({ type: 'html', html: converter.makeHtml(content) });
    }
  } else if (Array.isArray(content)) {
    content.forEach(part => {
      if (part.type === 'text') {
        if (props.isUser) {
          parts.push({ type: 'text-plain', text: part.text });
        } else {
          parts.push({ type: 'html', html: converter.makeHtml(part.text) });
        }
      } else if (part.type === 'image_url') {
        parts.push({ type: 'image', src: part.image_url.url });
      } else if (part.type === 'file') {
        parts.push({ type: 'file', name: part.name || props.t('attachment'), size: part.size || 0 });
      }
    });
  }

  // m.images 遗留字段
  const contentHasImages = Array.isArray(content) && content.some(p => p.type === 'image_url');
  if (!contentHasImages && props.message.images && props.message.images.length > 0) {
    props.message.images.forEach(dataUrl => {
      parts.push({ type: 'image', src: dataUrl });
    });
  }

  return parts;
});

const metaParts = computed(() => {
  const m = props.message;
  const parts = [];
  if (!m.duration_ms && !m.tokens && !m.model_name && !m.prefill_ms && !m.decode_ms) return parts;

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

function handleDblClickImage(e) {
  if (e.target.tagName === 'IMG' && e.target.dataset.src) {
    const viewer = new Viewer(e.target, {
      triggered: 'dblclick',
      toolbar: {
        zoomIn: true, zoomOut: true, oneToOne: true, reset: true,
        rotateLeft: true, rotateRight: true, flipHorizontal: true, flipVertical: true,
        prev: false, next: false, play: false, download: true,
      },
      title: false, tooltip: false, transition: false,
    });
    viewer.show();
  }
}
</script>

<template>
  <div :class="['flex flex-col', isUser ? 'items-end' : 'items-start']">
    <div :class="['max-w-[75%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
      isUser ? 'bg-indigo-500 text-white rounded-br-md' :
      isError ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-bl-md' :
      'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-bl-md'
    ]" @dblclick="handleDblClickImage">
      <template v-for="(part, i) in htmlParts" :key="i">
        <span v-if="part.type === 'text-plain'">{{ part.text }}</span>
        <div v-else-if="part.type === 'html'" class="md-content" v-html="part.html"></div>
        <img v-else-if="part.type === 'image'"
          :src="part.src"
          :data-src="part.src"
          class="max-w-[200px] max-h-48 rounded-lg mt-1 cursor-zoom-in"
        />
        <div v-else-if="part.type === 'file'"
          class="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-black/5 dark:bg-white/10 mt-1 text-xs"
        >
          <i class="fas fa-file text-gray-400"></i>
          <span class="truncate">{{ part.name }}</span>
          <span class="text-gray-400 shrink-0">{{ formatSize(part.size) }}</span>
        </div>
      </template>
    </div>

    <div v-if="metaParts.length > 0"
      :class="['text-[11px] text-gray-400 mt-1 flex flex-col gap-0.5', isUser ? 'items-end' : 'items-start']"
    >
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
