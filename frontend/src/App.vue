<script setup>
import { ref, computed, onMounted, nextTick } from 'vue';
import ConversationList from './components/ConversationList.vue';
import ModelConfig from './components/ModelConfig.vue';
import ChatPanel from './components/ChatPanel.vue';
import { api } from './composables/useApi.js';
import { useI18n } from './i18n.js';

const { currentLang, t, toggleLang } = useI18n();

// ── 主题 ──
const currentTheme = ref(localStorage.getItem('theme') || 'light');

function applyTheme(theme) {
  currentTheme.value = theme;
  localStorage.setItem('theme', theme);
  if (theme === 'dark') document.documentElement.classList.add('dark');
  else document.documentElement.classList.remove('dark');
}

function toggleTheme() {
  applyTheme(currentTheme.value === 'dark' ? 'light' : 'dark');
}

// ── 抽屉 ──
const leftDrawerCollapsed = ref(false);
const rightDrawerCollapsed = ref(false);

function toggleLeftDrawer() { leftDrawerCollapsed.value = !leftDrawerCollapsed.value; }
function toggleRightDrawer() { rightDrawerCollapsed.value = !rightDrawerCollapsed.value; }

// ── 会话 ──
const conversations = ref([]);
const currentConvId = ref(null);
const currentConvTitle = ref('');
const messages = ref([]);
const contextEnabled = ref(false);

// ── 版本号 ──
const version = ref('');

// ── ModelConfig ref ──
const modelConfigRef = ref(null);
const chatPanelRef = ref(null);

// ── formData computed ──
const formData = computed(() => {
  return modelConfigRef.value?.getFormData() || {
    base_url: '', api_key: '', model: '', endpoint: '', api_type: 'openai',
    system_prompt: '', temperature: 1, max_tokens: 4096, top_p: 1, frequency_penalty: 0,
  };
});

// ── 会话管理 ──
async function loadConversations() {
  conversations.value = await api('api/conversations');
}

async function newConversation() {
  const conv = await api('api/conversations', {
    method: 'POST',
    body: JSON.stringify({ title: t('new_conversation_title'), context_enabled: true })
  });
  currentConvId.value = conv.id;
  messages.value = [];
  currentConvTitle.value = conv.title;
  contextEnabled.value = false;
  await loadConversations();
  chatPanelRef.value?.scrollToBottom();
}

async function loadConversation(id) {
  currentConvId.value = id;
  const convs = await api('api/conversations');
  conversations.value = convs;
  const found = convs.find(c => c.id === id);
  if (found) {
    currentConvTitle.value = found.title;
    contextEnabled.value = !!found.context_enabled;
    if (found.last_config) {
      try {
        const config = JSON.parse(found.last_config);
        modelConfigRef.value?.applyConfigByData(config);
      } catch(e) {}
    }
  }
  const msgs = await api(`api/conversations/${id}/messages`);
  messages.value = msgs;
  chatPanelRef.value?.scrollToBottom();
}

async function deleteConversation(id) {
  if (!confirm(t('delete_confirm'))) return;
  await api(`api/conversations/${id}`, { method: 'DELETE' });
  if (currentConvId.value === id) {
    currentConvId.value = null;
    messages.value = [];
    currentConvTitle.value = '';
  }
  await loadConversations();
  const convs = conversations.value;
  if (convs.length > 0) await loadConversation(convs[0].id);
  else await newConversation();
}

async function clearAllConversations() {
  if (!confirm(t('clear_all_confirm'))) return;
  for (const c of conversations.value) {
    await api(`api/conversations/${c.id}`, { method: 'DELETE' });
  }
  currentConvId.value = null;
  messages.value = [];
  currentConvTitle.value = '';
  await loadConversations();
  await newConversation();
}

async function clearCurrentChat() {
  if (!currentConvId.value) return;
  if (!confirm(t('clear_confirm'))) return;
  await api(`api/conversations/${currentConvId.value}/messages`, { method: 'DELETE' });
  messages.value = [];
}

// ── 发送完成回调 ──
async function onSendComplete(payload) {
  if (payload.title && currentConvId.value) {
    const conv = conversations.value.find(c => c.id === currentConvId.value);
    if (conv && (conv.title === t('new_conversation_title') || conv.title === '新对话' || conv.title === 'New Chat')) {
      await api(`api/conversations/${currentConvId.value}`, {
        method: 'PUT',
        body: JSON.stringify({ title: payload.title })
      });
      currentConvTitle.value = payload.title;
      await loadConversations();
    } else {
      await loadConversations();
    }
  } else {
    await loadConversations();
  }
}

// ── 配置被应用 ──
function onConfigApplied(data) {
  // formData 是 computed，会自动更新
}

// ── 初始化 ──
async function init() {
  await loadConversations();
  await modelConfigRef.value?.loadSavedConfigs();

  if (!currentConvId.value) {
    if (conversations.value.length > 0) {
      await loadConversation(conversations.value[0].id);
    }
    if (!currentConvId.value) await newConversation();
  }

  // 版本号
  const fallbackVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '';
  try {
    const health = await api('api/health');
    version.value = health.version || fallbackVersion;
  } catch {
    version.value = fallbackVersion;
  }
  if (version.value) {
    document.title = `Model API Tester v${version.value}`;
  }
}

onMounted(() => {
  applyTheme(currentTheme.value);
  document.documentElement.lang = currentLang.value === 'zh' ? 'zh' : 'en';
  init();
});
</script>

<template>
  <!-- 顶部栏 -->
  <header class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 h-12 flex items-center gap-3 shrink-0">
    <button @click="toggleLeftDrawer" class="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500 dark:text-gray-400" :title="t('conversation_list')">
      <i class="fas fa-list w-5 text-center"></i>
    </button>
    <h1 class="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-1.5">
      <i class="fas fa-robot text-indigo-500"></i> Model API Tester
      <span v-if="version" class="text-[10px] font-medium text-gray-400 bg-gray-100 dark:bg-gray-700 rounded px-1.5 py-0.5">v{{ version }}</span>
    </h1>
    <span class="text-xs text-gray-400 ml-2 truncate">{{ currentConvTitle }}</span>
    <button @click="toggleLang" class="ml-auto p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500 dark:text-gray-400 transition text-xs font-medium" :title="t('switch_lang')">
      <i class="fas fa-language w-5 text-center"></i>
    </button>
    <button @click="toggleTheme" class="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500 dark:text-gray-400 transition" :title="t('switch_theme')">
      <i :class="currentTheme === 'dark' ? 'fas fa-sun w-5 text-center' : 'fas fa-moon w-5 text-center'"></i>
    </button>
    <a href="https://github.com/yachen4ever/ModelApiTester" target="_blank" rel="noopener" class="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500 dark:text-gray-400 transition" :title="t('github_repo')">
      <i class="fab fa-github w-5 text-center text-base"></i>
    </a>
    <button @click="toggleRightDrawer" class="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500 dark:text-gray-400" :title="t('api_type')">
      <i class="fas fa-cog w-5 text-center"></i>
    </button>
  </header>

  <!-- 主体 -->
  <div class="flex flex-1 overflow-hidden">
    <!-- 左抽屉：对话列表 -->
    <div :class="['drawer-pane w-64 shrink-0 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col', leftDrawerCollapsed ? 'collapsed' : '']">
      <ConversationList
        :conversations="conversations"
        :current-conv-id="currentConvId"
        :t="t"
        @select="loadConversation"
        @new="newConversation"
        @clear-all="clearAllConversations"
        @delete="deleteConversation"
      />
    </div>

    <!-- 聊天区 -->
    <ChatPanel
      ref="chatPanelRef"
      :messages="messages"
      :current-conv-id="currentConvId"
      v-model:context-enabled="contextEnabled"
      :form-data="formData"
      :t="t"
      @send-complete="onSendComplete"
      @clear-chat="clearCurrentChat"
    />

    <!-- 右抽屉：模型配置 -->
    <div :class="['drawer-pane w-72 shrink-0 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 overflow-y-auto p-4', rightDrawerCollapsed ? 'collapsed' : '']">
      <ModelConfig ref="modelConfigRef" :t="t" @config-applied="onConfigApplied" />
    </div>
  </div>
</template>
