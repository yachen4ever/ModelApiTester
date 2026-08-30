<script setup>
import { ref, computed, watch } from 'vue';
import { api } from '../composables/useApi.js';
import { ENDPOINT_PRESETS, detectApiType, tryGetHost } from '../composables/useUtils.js';

const props = defineProps({
  t: { type: Function, required: true },
});

const emit = defineEmits(['config-applied']);

// ── 表单状态 ──
const url = ref('');
const apiKey = ref('');
const model = ref('');
const apiType = ref('openai');
const endpoint = ref('');
const systemPrompt = ref('');
const temperature = ref(1);
const maxTokens = ref(4096);
const topP = ref(1);
const frequencyPenalty = ref(0);

const showAdvanced = ref(false);
const savedConfigs = ref([]);
const savedModelHint = ref('');
const savedModelHintVisible = ref(false);

// ── 模型列表 ──
const modelListCache = ref([]);
const modelListCacheError = ref(false);
const fetchModelsLock = ref(false);
const modelSuggestVisible = ref(false);
const modelRefreshing = ref(false);
const modelInputFocused = ref(false);

const filteredModels = computed(() => {
  if (modelListCache.value.length === 0) return [];
  const input = model.value.trim().toLowerCase();
  return modelListCache.value
    .filter(m => !input || m.toLowerCase().includes(input))
    .slice(0, 50);
});

const endpointOptions = computed(() => {
  return ENDPOINT_PRESETS[apiType.value] || [];
});

// ── 配置操作 ──
function getFormData() {
  return {
    base_url: url.value.trim(),
    api_key: apiKey.value.trim(),
    model: model.value.trim(),
    endpoint: endpoint.value.trim() || '',
    api_type: apiType.value,
    system_prompt: systemPrompt.value.trim(),
    temperature: parseFloat(temperature.value) || 1,
    max_tokens: parseInt(maxTokens.value) || 4096,
    top_p: parseFloat(topP.value) || 1,
    frequency_penalty: parseFloat(frequencyPenalty.value) || 0,
  };
}

function applyConfig(c) {
  url.value = c.base_url || '';
  apiKey.value = c.api_key || '';
  model.value = c.model || '';
  const type = c.api_type || detectApiType(c.base_url, c.model, c.endpoint);
  apiType.value = type;
  const ep = (c.endpoint === 'auto' || !c.endpoint) ? '' : c.endpoint;
  endpoint.value = ep;
  systemPrompt.value = c.system_prompt || '';
  temperature.value = c.temperature ?? 1;
  maxTokens.value = c.max_tokens ?? 4096;
  topP.value = c.top_p ?? 1;
  frequencyPenalty.value = c.frequency_penalty ?? 0;
  savedModelHint.value = `${props.t('loaded')}: ${c.name} (${c.model})`;
  savedModelHintVisible.value = true;
  emit('config-applied', getFormData());
}

function onApiTypeChange() {
  // endpoint 会自动通过 computed 更新选项
}

function onEndpointChange() {
  // placeholder
}

async function loadSavedConfigs() {
  const configs = await api('api/configs');
  savedConfigs.value = configs;
}

async function saveCurrentConfig() {
  const data = getFormData();
  if (!data.base_url || !data.api_key || !data.model) {
    alert(props.t('please_fill_first'));
    return;
  }
  const defaultName = `${data.model} @ ${tryGetHost(data.base_url)}`;
  const name = prompt(props.t('config_name'), defaultName);
  if (name === null) return;
  await api('api/configs', {
    method: 'POST',
    body: JSON.stringify({ ...data, name: name || props.t('unnamed') })
  });
  await loadSavedConfigs();
  savedModelHint.value = `${props.t('saved')}: ${name || props.t('unnamed')} → ${data.model} @ ${tryGetHost(data.base_url)}`;
  savedModelHintVisible.value = true;
}

async function deleteConfig(id) {
  if (!confirm(props.t('delete_config_confirm'))) return;
  await api(`api/configs/${id}`, { method: 'DELETE' });
  await loadSavedConfigs();
}

// ── 模型列表拉取 ──
async function fetchModels() {
  if (fetchModelsLock.value) return;
  fetchModelsLock.value = true;
  modelRefreshing.value = true;
  const baseUrl = url.value.trim();
  const key = apiKey.value.trim();
  const type = apiType.value;
  try {
    if (!baseUrl) { alert(props.t('fetch_models_first')); return; }
    let fetchUrl = baseUrl.replace(/\/+$/, '');
    let headers = { 'Content-Type': 'application/json' };
    if (type === 'anthropic') {
      headers['x-api-key'] = key;
      headers['anthropic-version'] = '2023-06-01';
      if (fetchUrl.endsWith('/v1')) fetchUrl = fetchUrl.replace(/\/v1$/, '');
      fetchUrl += '/v1/models';
    } else if (type === 'google') {
      if (!fetchUrl.endsWith('/v1beta') && fetchUrl.endsWith('/v1')) fetchUrl = fetchUrl.replace(/\/v1$/, '/v1beta');
      fetchUrl += '/v1beta/models';
    } else {
      headers['Authorization'] = `Bearer ${key}`;
      if (fetchUrl.endsWith('/v1')) fetchUrl += '/models';
      else fetchUrl += '/v1/models';
    }
    const res = await fetch(fetchUrl, { headers });
    if (!res.ok) {
      const err = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status}: ${err.slice(0, 120)}`);
    }
    const data = await res.json();
    let models = [];
    if (Array.isArray(data)) models = data;
    else if (data.data && Array.isArray(data.data)) models = data.data;
    else if (data.models && Array.isArray(data.models)) models = data.models;
    else if (data.list && Array.isArray(data.list)) models = data.list;
    models = models.map(m => typeof m === 'string' ? m : (m.id || m.name || '')).filter(Boolean);
    if (models.length === 0) { alert(props.t('no_models')); return; }
    modelListCache.value = models;
    modelListCacheError.value = false;
    modelSuggestVisible.value = true;
  } catch (e) {
    modelListCacheError.value = true;
    alert(`${props.t('fetch_models_failed')}: ${e.message}`);
  } finally {
    modelRefreshing.value = false;
    fetchModelsLock.value = false;
  }
}

async function showModelSuggestionsOnFocus() {
  modelInputFocused.value = true;
  if (modelListCache.value.length > 0) {
    modelSuggestVisible.value = true;
    return;
  }
  if (modelListCacheError.value) return;
  await fetchModels();
}

function onModelInput() {
  if (modelListCache.value.length > 0) {
    modelSuggestVisible.value = true;
  }
}

function selectModel(m) {
  model.value = m;
  modelSuggestVisible.value = false;
}

function onModelBlur() {
  // 延迟关闭，允许点击建议项
  setTimeout(() => {
    modelInputFocused.value = false;
    modelSuggestVisible.value = false;
  }, 200);
}

// ── 暴露方法 ──
defineExpose({
  getFormData,
  applyConfig,
  loadSavedConfigs,
  applyConfigByData(data) {
    applyConfig(data);
  },
});

// 暴露 getFormData 给父组件 — 通过 emit
watch([url, apiKey, model, apiType, endpoint, systemPrompt, temperature, maxTokens, topP, frequencyPenalty], () => {
  // 父组件通过 ref 调用 getFormData()
}, { deep: true });
</script>

<template>
  <div class="space-y-3">
    <!-- 基础配置 -->
    <div class="space-y-2.5">
      <div>
        <label class="text-xs font-semibold text-gray-600 dark:text-gray-400 block mb-1">Base URL</label>
        <input type="text" v-model="url" placeholder="https://api.openai.com/v1"
          class="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-md focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none">
      </div>
      <div>
        <label class="text-xs font-semibold text-gray-600 dark:text-gray-400 block mb-1">API Key</label>
        <input type="text" v-model="apiKey" placeholder="sk-..."
          class="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-md focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none">
      </div>
      <div>
        <label class="text-xs font-semibold text-gray-600 dark:text-gray-400 block mb-1">{{ t('model') }}</label>
        <div class="relative">
          <input type="text" v-model="model" placeholder="gpt-4o" autocomplete="off"
            @focus="showModelSuggestionsOnFocus"
            @blur="onModelBlur"
            @input="onModelInput"
            class="w-full px-2.5 py-1.5 pr-8 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-md focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none">
          <button @click="fetchModels" :title="t('fetch_models')"
            class="absolute right-1.5 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-indigo-500 transition"
          >
            <i :class="['fas fa-sync-alt text-xs', modelRefreshing ? 'spin' : '']"></i>
          </button>
          <div v-if="modelSuggestVisible && filteredModels.length > 0"
            class="absolute z-20 mt-1 w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md shadow-lg max-h-48 overflow-y-auto"
          >
            <div v-for="m in filteredModels" :key="m"
              @mousedown.prevent="selectModel(m)"
              class="px-2.5 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-500/20 hover:text-indigo-700 dark:hover:text-indigo-300 cursor-pointer truncate"
            >{{ m }}</div>
          </div>
        </div>
      </div>
      <div class="flex gap-2">
        <div class="w-1/3">
          <label class="text-xs font-semibold text-gray-600 dark:text-gray-400 block mb-1">{{ t('api_type') }}</label>
          <select v-model="apiType" @change="onApiTypeChange"
            class="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-md outline-none focus:border-indigo-500 bg-white"
          >
            <option value="openai">openai</option>
            <option value="anthropic">anthropic</option>
            <option value="google">google</option>
            <option value="other">{{ t('other_mainstream') }}</option>
          </select>
        </div>
        <div class="flex-1">
          <label class="text-xs font-semibold text-gray-600 dark:text-gray-400 block mb-1">{{ t('endpoint') }}</label>
          <select v-model="endpoint"
            class="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-md outline-none focus:border-indigo-500 bg-white"
          >
            <option v-for="ep in endpointOptions" :key="ep" :value="ep">{{ ep || t('auto') }}</option>
          </select>
        </div>
      </div>
      <div>
        <label class="text-xs font-semibold text-gray-600 dark:text-gray-400 block mb-1">
          {{ t('system_prompt') }} <span class="text-gray-400 font-normal">{{ t('optional') }}</span>
        </label>
        <textarea v-model="systemPrompt" rows="2" placeholder="You are a helpful assistant."
          class="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-md focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none resize-none"
        ></textarea>
      </div>
    </div>

    <button @click="saveCurrentConfig"
      class="w-full px-3 py-2 bg-indigo-500 text-white rounded-md text-xs font-semibold hover:bg-indigo-600 flex items-center justify-center gap-1.5"
    >
      <i class="fas fa-save"></i> <span>{{ t('save_config') }}</span>
    </button>
    <div v-if="savedModelHintVisible" class="text-[10px] text-gray-400 text-center">{{ savedModelHint }}</div>

    <!-- 高级选项 -->
    <div>
      <button @click="showAdvanced = !showAdvanced"
        class="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md border border-gray-200 dark:border-gray-600"
      >
        <span><i class="fas fa-sliders-h mr-1"></i> {{ t('advanced') }}</span>
        <i :class="['fas fa-chevron-down text-gray-400 transition-transform duration-200', showAdvanced ? 'rotate-180' : '']"></i>
      </button>
      <div v-if="showAdvanced" class="mt-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-md border border-gray-200 dark:border-gray-600 space-y-2.5">
        <div class="grid grid-cols-2 gap-2.5">
          <div>
            <label class="text-xs text-gray-600 dark:text-gray-400 block mb-0.5">Temperature</label>
            <input type="number" v-model="temperature" min="0" max="2" step="0.1"
              class="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-md outline-none focus:border-indigo-500">
          </div>
          <div>
            <label class="text-xs text-gray-600 dark:text-gray-400 block mb-0.5">Max Tokens</label>
            <input type="number" v-model="maxTokens" min="1"
              class="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-md outline-none focus:border-indigo-500">
          </div>
          <div>
            <label class="text-xs text-gray-600 dark:text-gray-400 block mb-0.5">Top P</label>
            <input type="number" v-model="topP" min="0" max="1" step="0.1"
              class="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-md outline-none focus:border-indigo-500">
          </div>
          <div>
            <label class="text-xs text-gray-600 dark:text-gray-400 block mb-0.5">Freq Penalty</label>
            <input type="number" v-model="frequencyPenalty" min="-2" max="2" step="0.1"
              class="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-md outline-none focus:border-indigo-500">
          </div>
        </div>
      </div>
    </div>

    <!-- 已保存配置 -->
    <div>
      <div class="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">{{ t('saved_configs') }}</div>
      <div class="space-y-1">
        <div v-if="savedConfigs.length === 0" class="text-xs text-gray-400 italic">{{ t('no_saved_configs') }}</div>
        <div v-for="c in savedConfigs" :key="c.id"
          @click="applyConfig(c)"
          class="group flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer text-xs border border-gray-100 dark:border-gray-600"
        >
          <i class="fas fa-server text-gray-400 text-[10px]"></i>
          <div class="flex-1 min-w-0">
            <div class="font-medium text-gray-700 dark:text-gray-300 truncate">{{ c.name }}</div>
            <div class="text-[10px] text-gray-400 truncate">{{ c.model }}</div>
          </div>
          <button @click.stop="deleteConfig(c.id)"
            class="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition shrink-0"
            :title="t('delete')"
          >
            <i class="fas fa-trash-alt text-[10px]"></i>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
