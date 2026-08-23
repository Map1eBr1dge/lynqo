<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Minus, Square, Copy, X } from "lucide-vue-next";

/**
 * Fluent-spec window caption buttons for Windows/Linux builds
 * (46×32 hit zones; close hovers system red). The close action goes through
 * the normal Tauri close pipeline so the user's closeBehavior setting and
 * the in-app confirm dialog keep working.
 */
const isMaximized = ref(false);
let unlisten: (() => void) | null = null;

onMounted(async () => {
  const win = getCurrentWindow();
  isMaximized.value = await win.isMaximized();
  unlisten = await win.onResized(async () => {
    isMaximized.value = await win.isMaximized();
  });
});

onUnmounted(() => {
  unlisten?.();
});

const restoreIcon = computed(() => (isMaximized.value ? Copy : Square));

function minimize() {
  void getCurrentWindow().minimize();
}

function toggleMaximize() {
  void getCurrentWindow().toggleMaximize();
}

function close() {
  // Routes through the backend CloseRequested handler → confirm dialog.
  void getCurrentWindow().close();
}
</script>

<template>
  <div class="caption" aria-label="Window controls">
    <button class="caption__btn" type="button" :aria-label="'最小化'" @click="minimize">
      <Minus :size="14" />
    </button>
    <button
      class="caption__btn"
      type="button"
      :aria-label="isMaximized ? '还原' : '最大化'"
      @click="toggleMaximize"
    >
      <component :is="restoreIcon" :size="12" />
    </button>
    <button class="caption__btn caption__btn--close" type="button" :aria-label="'关闭'" @click="close">
      <X :size="14" />
    </button>
  </div>
</template>

<style scoped>
.caption {
  display: flex;
  align-self: stretch;
  margin-left: 4px;
}
.caption__btn {
  display: grid;
  place-items: center;
  width: 46px;
  height: 100%;
  border: none;
  border-radius: 0;
  background: transparent;
  color: var(--color-text-secondary);
  transition: background var(--transition-fast), color var(--transition-fast);
}
.caption__btn:hover {
  background: var(--color-hover);
  color: var(--color-text-primary);
}
.caption__btn--close:hover {
  background: #e81123;
  color: #fff;
}
</style>
