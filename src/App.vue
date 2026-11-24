<template>
  <NConfigProvider :theme="naiveTheme" :theme-overrides="naiveOverrides">
    <NMessageProvider>
      <NDialogProvider>
        <RouterView />
      </NDialogProvider>
    </NMessageProvider>
  </NConfigProvider>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import {
  darkTheme,
  lightTheme,
  NConfigProvider,
  NMessageProvider,
  NDialogProvider,
} from 'naive-ui'
import { useThemeStore } from './stores/theme'

const themeStore = useThemeStore()

const naiveTheme = computed(() => (themeStore.isDark ? darkTheme : lightTheme))

const naiveOverrides = computed(() => ({
  common: {
    primaryColor: themeStore.isDark ? '#e8c56b' : '#4a6fa5',
    primaryColorHover: themeStore.isDark ? '#f0d588' : '#3d5a80',
    primaryColorPressed: themeStore.isDark ? '#d8b455' : '#334b6b',
    primaryColorSuppl: themeStore.isDark ? '#e8c56b' : '#4a6fa5',
    borderRadius: '6px',
  },
}))

onMounted(() => {
  themeStore.init()
})
</script>
