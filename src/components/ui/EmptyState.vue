<script setup lang="ts">
/**
 * Empty-state primitive (Silk M1): icon + title + description + optional
 * action, so "no data" screens stop being one-off divs.
 */
defineProps<{
  title: string;
  description?: string;
}>();
</script>

<template>
  <div class="empty-state">
    <div v-if="$slots.icon" class="empty-state__icon" aria-hidden="true">
      <slot name="icon" />
    </div>
    <p class="empty-state__title">{{ title }}</p>
    <p v-if="description" class="empty-state__desc">{{ description }}</p>
    <div v-if="$slots.action" class="empty-state__action">
      <slot name="action" />
    </div>
  </div>
</template>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 28px 16px;
  border: 1px dashed var(--color-border-strong);
  border-radius: var(--radius-md);
  text-align: center;
}
.empty-state__icon {
  display: grid;
  place-items: center;
  color: var(--color-text-tertiary);
}
.empty-state__title {
  margin: 4px 0 0;
  font-size: var(--text-base);
  color: var(--color-text-primary);
  font-weight: var(--weight-medium);
}
.empty-state__desc {
  margin: 0;
  max-width: 380px;
  color: var(--color-text-tertiary);
  font-size: var(--text-sm);
  line-height: 1.5;
}
.empty-state__action { margin-top: 10px; }
</style>
