<script setup>
import { computed } from 'vue';

const props = defineProps({
  conversations: { type: Array, default: () => [] },
  currentConvId: { type: [Number, null], default: null },
  t: { type: Function, required: true },
});

const emit = defineEmits(['select', 'new', 'clear-all', 'delete']);

function handleClick(conv) {
  emit('select', conv.id);
}
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Header -->
    <div class="px-3 py-2 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between shrink-0">
      <span class="text-xs font-semibold text-gray-500 dark:text-gray-400">{{ t('conversation_list') }}</span>
      <div class="flex gap-2">
        <button @click="$emit('new')" class="text-xs text-indigo-500 hover:text-indigo-600 font-medium">
          <i class="fas fa-plus mr-0.5"></i><span>{{ t('new_conversation') }}</span>
        </button>
        <button @click="$emit('clear-all')" class="text-xs text-red-400 hover:text-red-600 font-medium">
          <i class="fas fa-trash-alt mr-0.5"></i><span>{{ t('clear_all') }}</span>
        </button>
      </div>
    </div>

    <!-- List -->
    <div class="flex-1 overflow-y-auto p-2 space-y-1">
      <div v-for="c in conversations" :key="c.id"
        @click="handleClick(c)"
        :class="['group flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer text-sm',
          c.id === currentConvId
            ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300'
            : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300'
        ]"
      >
        <i :class="['fas fa-comment text-xs', c.id === currentConvId ? 'text-indigo-500' : 'text-gray-300 dark:text-gray-600']"></i>
        <span class="flex-1 truncate">{{ c.title }}</span>
        <span class="text-[10px] text-gray-400">{{ c.message_count || 0 }}</span>
        <button @click.stop="$emit('delete', c.id)"
          class="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition"
          :title="t('delete')"
        >
          <i class="fas fa-times text-xs"></i>
        </button>
      </div>
    </div>
  </div>
</template>
