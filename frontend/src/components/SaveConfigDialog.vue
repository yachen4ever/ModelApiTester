<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
  visible: { type: Boolean, default: false },
  modelName: { type: String, default: '' },
  host: { type: String, default: '' },
  t: { type: Function, required: true },
});

const emit = defineEmits(['confirm', 'close']);

const partA = ref(''); // 模型名称
const partB = ref(''); // 域名

watch(
  () => props.visible,
  (v) => {
    if (v) {
      partA.value = props.modelName;
      partB.value = props.host;
    }
  }
);

function confirm() {
  const a = partA.value.trim();
  const b = partB.value.trim();
  // 组合名称：A @ B（B 为空则只用 A）
  const name = b ? `${a} @ ${b}` : a;
  emit('confirm', name || props.t('unnamed'));
  emit('close');
}

function close() {
  emit('close');
}
</script>

<template>
  <div v-if="visible" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" @click.self="close">
    <div class="w-[420px] max-w-[92vw] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <!-- 头部 -->
      <div class="px-5 pt-5 pb-3.5 border-b border-gray-100 dark:border-gray-700">
        <h2 class="text-base font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
          <i class="fas fa-save text-indigo-500 text-sm"></i> {{ t('save_config') }}
        </h2>
      </div>

      <div class="p-5 space-y-4">
        <!-- A：模型名称 -->
        <div>
          <label class="text-xs font-semibold text-gray-600 dark:text-gray-400 block mb-1.5">
            {{ t('config_name_part_a') }}
          </label>
          <input type="text" v-model="partA" autofocus
            class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
            :placeholder="modelName || t('model')"
            @keydown.enter="confirm"
          >
        </div>

        <!-- B：域名 -->
        <div>
          <label class="text-xs font-semibold text-gray-600 dark:text-gray-400 block mb-1.5">
            {{ t('config_part_b') }}
          </label>
          <input type="text" v-model="partB"
            class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
            :placeholder="host"
            @keydown.enter="confirm"
          />
        </div>
        <div class="text-[11px] text-gray-400 leading-relaxed">
          {{ t('config_name_hint') }}
        </div>
      </div>

      <!-- 底部 -->
      <div class="px-5 py-3.5 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-2">
        <button @click="close"
          class="px-4 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 text-sm rounded-lg transition"
        >{{ t('cancel') }}</button>
        <button @click="confirm"
          class="px-4 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white text-sm rounded-lg transition"
        >{{ t('save') }}</button>
      </div>
    </div>
  </div>
</template>