<script setup>
import { ref, watch } from 'vue';
import { api } from '../composables/useApi.js';

const props = defineProps({
  visible: { type: Boolean, default: false },
  version: { type: String, default: '' },
  t: { type: Function, required: true },
});

const emit = defineEmits(['close']);

// 更新检测状态
const updateState = ref('checking'); // checking | current | outdated | error
const latestVersion = ref('');
const updateUrl = ref('');
const checkError = ref('');

async function checkUpdate() {
  updateState.value = 'checking';
  try {
    const res = await api('api/check-update');
    if (res.available && res.has_update) {
      updateState.value = 'outdated';
      latestVersion.value = res.latest_version || '';
      updateUrl.value = res.html_url || 'https://github.com/yachen4ever/ModelApiTester/releases';
    } else if (res.available) {
      updateState.value = 'current';
    } else {
      updateState.value = 'error';
      checkError.value = res.error || props.t('about_update_error');
    }
  } catch (e) {
    updateState.value = 'error';
    checkError.value = e.message || props.t('about_update_error');
  }
}

function openUpdateUrl() {
  window.open(updateUrl.value, '_blank', 'noopener');
}

watch(
  () => props.visible,
  (v) => {
    if (v) {
      updateState.value = 'checking';
      checkUpdate();
    }
  }
);

defineExpose({ checkUpdate });
</script>

<template>
  <div v-if="visible" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" @click.self="$emit('close')">
    <div class="w-[480px] max-w-[92vw] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <!-- 头部 -->
      <div class="px-6 pt-6 pb-4 border-b border-gray-100 dark:border-gray-700">
        <h2 class="text-base font-semibold text-gray-800 dark:text-gray-100">{{ t('about_title') }}</h2>
      </div>

      <div class="p-6">
        <!-- 品牌区 -->
        <div class="flex items-center gap-4">
          <div class="w-16 h-16 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shadow-md shrink-0">
            <svg viewBox="0 0 1024 1024" class="w-10 h-10">
              <path transform="translate(142 100) scale(1.6)" fill="#ffffff" d="M349.4 44.6c5.9-13.7 1.5-29.7-10.6-38.5s-28.6-8-39.9 1.8l-256 224c-10 8.8-13.6 22.9-8.9 35.3S50.7 288 64 288l111.5 0L98.6 467.4c-5.9 13.7-1.5 29.7 10.6 38.5s28.6 8 39.9-1.8l256-224c10-8.8 13.6-22.9 8.9-35.3s-16.6-20.7-30-20.7l-111.5 0L349.4 44.6z"/>
            </svg>
          </div>
          <div>
            <div class="text-lg font-bold text-gray-800 dark:text-gray-100">Model API Tester</div>
            <div class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{{ t('about_subtitle') }}</div>
          </div>
        </div>

        <!-- 版本 / 更新检测 -->
        <div class="mt-5 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 p-3.5">
          <div class="flex items-center gap-2.5">
            <template v-if="updateState === 'checking'">
              <i class="fas fa-spinner spin text-indigo-500"></i>
              <span class="text-sm text-gray-600 dark:text-gray-300">{{ t('about_checking') }}</span>
            </template>
            <template v-else-if="updateState === 'current'">
              <i class="fas fa-circle-check text-green-500"></i>
              <span class="text-sm text-gray-600 dark:text-gray-300">{{ t('about_current') }} <b>v{{ version }}</b></span>
            </template>
            <template v-else-if="updateState === 'outdated'">
              <i class="fas fa-circle-exclamation text-amber-500"></i>
              <span class="text-sm text-amber-600 dark:text-amber-400 font-medium">{{ t('about_update_available') }} v{{ latestVersion }}</span>
              <button @click="openUpdateUrl" class="ml-auto shrink-0 px-2.5 py-1 bg-indigo-500 hover:bg-indigo-600 text-white text-xs rounded-md transition">
                {{ t('about_update_now') }}
              </button>
            </template>
            <template v-else>
              <i class="fas fa-triangle-exclamation text-red-500"></i>
              <span class="text-sm text-red-500">{{ t('about_update_error') }}</span>
            </template>
          </div>
          <div class="mt-2 text-xs text-gray-400 dark:text-gray-500">
            {{ t('about_version') }} v{{ version }}
          </div>
        </div>

        <!-- 链接区 -->
        <div class="mt-4 flex flex-col gap-1">
          <a :href="'https://github.com/yachen4ever/ModelApiTester'" target="_blank" rel="noopener" class="flex items-center gap-2.5 px-2.5 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg text-sm text-gray-600 dark:text-gray-300 transition">
            <i class="fab fa-github w-4 text-center text-gray-500"></i> GitHub
            <i class="fas fa-arrow-up-right-from-square ml-auto text-[10px] text-gray-400"></i>
          </a>
          <a :href="'https://github.com/yachen4ever/ModelApiTester/blob/main/CHANGELOG.md'" target="_blank" rel="noopener" class="flex items-center gap-2.5 px-2.5 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg text-sm text-gray-600 dark:text-gray-300">
            <i class="fas fa-file-lines w-4 text-center text-gray-500"></i> {{ t('about_changelog') }}
            <i class="fas fa-arrow-up-right-from-square ml-auto text-[10px] text-gray-400"></i>
          </a>
          <a :href="'https://github.com/RunningFelix/openai-api-tester'" target="_blank" rel="noopener" class="flex items-center gap-2.5 px-2.5 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg text-sm text-gray-600 dark:text-gray-300">
            <i class="fas fa-heart text-gray-500 text-center w-4"></i> {{ t('about_credits') }}
            <i class="fas fa-arrow-up-right-from-square ml-auto text-[10px] text-gray-400"></i>
          </a>
        </div>

        <!-- 版权 -->
        <div class="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-400 dark:text-gray-500 leading-relaxed">
          <div class="text-sm font-medium text-gray-500 dark:text-gray-400">Model API Tester</div>
          <div class="mt-1">{{ t('about_copyright') }}</div>
          <div class="mt-1">{{ t('about_opensource') }}</div>
        </div>
      </div>

      <!-- 底部 -->
      <div class="px-6 py-3.5 border-t border-gray-100 dark:border-gray-700 flex justify-end">
        <button @click="$emit('close')" class="px-4 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 text-sm rounded-lg transition">
          {{ t('about_close') }}
        </button>
      </div>
    </div>
  </div>
</template>