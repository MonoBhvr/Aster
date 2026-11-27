<template>
  <div>
    <p id="theme-selection-label">
      {{ props.label }}
    </p>
    <div id="theme-container">
      <div
        v-for="(theme, index) in props.options"
        v-bind:key="index"
        v-bind:class="{
          'theme-container-item': true,
          selected: props.modelValue === index
        }"
      >
        <button
          type="button"
          v-bind:style="{
            color: theme.textColor,
            backgroundColor: theme.backgroundColor,
            fontFamily: theme.fontFamily
          }"
          v-bind:aria-pressed="props.modelValue === index"
          v-bind:aria-label="theme.name"
          class="theme-mockup"
          v-on:click="selectTheme(index)"
        >
          <span class="toolbar"></span>
          <span class="file-list">
            <span v-for="item in 7" v-bind:key="item" class="file-list-item"></span>
          </span>
          <span class="editor">Aa</span>
        </button>
        <div class="theme-metadata">
          <p class="theme-name">
            {{ theme.name }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
export interface ThemeDescriptor {
  name: string
  description: string
  textColor: string
  backgroundColor: string
  fontFamily: string
}

const props = defineProps<{
  modelValue: string
  options: Record<string, ThemeDescriptor>
  label?: string
}>()

const emit = defineEmits<(e: 'update:modelValue', value: string) => void>()

function selectTheme (themeName: string): void {
  emit('update:modelValue', themeName)
}
</script>

<style lang="less">
p#theme-selection-label { font-size: 13px; }

#theme-container {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
  width: 100%;
}

.theme-container-item {
  flex: 0 1 150px;
  text-align: center;
  opacity: .62;
  transition: opacity 120ms ease;

  &:hover, &.selected { opacity: 1; }
}

.theme-mockup {
  position: relative;
  display: block;
  width: 150px;
  height: 100px;
  overflow: hidden;
  padding: 0;
  border: 1px solid transparent;
  border-radius: var(--ui-radius, 6px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, .18);
  cursor: pointer;

  &:focus-visible { border-color: var(--ui-accent, #8d6bff); outline: 2px solid var(--ui-accent, #8d6bff); outline-offset: 2px; }
}

.selected .theme-mockup { border-color: var(--ui-accent, #8d6bff); }
.theme-mockup .toolbar { position: absolute; inset: 0 0 auto; height: 14px; background: rgba(255, 255, 255, .24); }
.theme-mockup .file-list { position: absolute; inset: 14px auto 0 0; display: flex; width: 30%; flex-direction: column; background: rgba(0, 0, 0, .18); }
.theme-mockup .file-list-item { flex: 1; border-bottom: 1px solid currentColor; opacity: .3; }
.theme-mockup .editor { position: absolute; inset: 14px 0 0 30%; display: grid; place-items: center; font-size: 18px; }
.theme-metadata { padding: 8px; }
.theme-name { font-size: 13px; font-weight: 600; }
</style>
